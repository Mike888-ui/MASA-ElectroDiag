/* Connectivity is only a browser hint. Readiness requires worker + cache + local data. */
(() => {
  const badge = document.getElementById('fieldOfflineStatus');
  const retry = document.getElementById('fieldOfflineRetry');
  const install = document.getElementById('fieldInstall');
  let checking, prompt, status = 'checking', errorText = '';
  // APK / standalone HTML already contains the complete local asset set: do not
  // incorrectly require a Service Worker or first-run network access.
  if (window.MASA_BUNDLED_OFFLINE || /MASA_ANDROID_OFFLINE\/1\.4\.4/.test(navigator.userAgent)) {
    install.hidden = true;
    const bundleName = window.MASA_BUNDLED_OFFLINE ? '完整單檔離線版' : 'Android 內建離線版';
    async function verifyBundle(){
      badge.dataset.state = 'checking';
      badge.textContent = bundleName + '｜正在驗證本機查修與知識包…';
      retry.hidden = true;
      try {
        const [pack] = await Promise.all([
          window.MASA_FIELD.ensureDefault(), window.MASA_LOCAL_READY, window.MASA_ENGINEERING_READY
        ]);
        if(typeof window.MASA_AGENT?.run !== 'function' ||
           typeof window.MASA_SAVE_AGENT_RECORD !== 'function' ||
           typeof window.MASA_LOAD_AGENT_RECORDS !== 'function')
          throw Error('本機 Agent 或儲存模組未就緒');
        const probe = window.MASA_AGENT.run({symptom:'24V 掉壓'},pack);
        if(probe.title !== '控制電源與掉壓' || probe.state !== 'REVIEW' || !probe.evidence?.length)
          throw Error('本機查修知識驗證失敗');
        badge.dataset.state = 'ready';
        badge.textContent = bundleName + '｜本機資料、規則查修與 AI Agent 已就緒（雲端 AI 仍需連網）';
      } catch(error) {
        badge.dataset.state = 'failed';
        badge.textContent = bundleName + '｜離線驗證失敗：' + (error?.message || error);
        retry.hidden = false;
      }
    }
    retry.addEventListener('click',verifyBundle);
    document.getElementById('fieldInstallHelp').querySelector('summary').textContent='離線版說明與手機使用方式';
    verifyBundle();
    return;
  }
  const workerURL = new URL('./sw.js', location.href).href;
  const scopeURL = new URL('./', location.href).href;
  function ownWorker() {
    const worker = navigator.serviceWorker?.controller;
    return worker?.scriptURL === workerURL ? worker : null;
  }
  const draw = () => {
    const network = navigator.onLine ? '瀏覽器顯示連線中' : '目前離線';
    const offline = {
      checking: '正在確認離線檔案及本機資料…',
      ready: '規則查修離線已就緒（免費 AI 需個別檢查）',
      failed: '尚未完成離線準備' + (errorText ? '（' + errorText + '）' : ''),
      insecure: '此頁不能安裝離線版，請使用正式 HTTPS 網址'
    };
    badge.dataset.state = status;
    badge.textContent = network + '｜' + offline[status] + '｜設備未連線';
    retry.hidden = status === 'ready' || status === 'checking' || status === 'insecure';
  };
  function waitForWorker() {
    if (ownWorker()) return Promise.resolve(ownWorker());
    return new Promise((resolve, reject) => {
      const stop = () => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('controllerchange', changed);
      };
      const changed = () => {
        const worker = ownWorker();
        if (!worker) return;
        stop();
        resolve(worker);
      };
      const timer = setTimeout(() => { stop(); reject(Error('尚未啟用離線服務，請連線後重試')); }, 14000);
      navigator.serviceWorker.addEventListener('controllerchange', changed);
      changed();
    });
  }
  function checkCache(worker) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(Error('離線檢查未回應')); }, 4500);
      channel.port1.onmessage = ({data}) => {
        clearTimeout(timer);
        channel.port1.close();
        if (data?.ready === true && data.expected > 0 && data.stored === data.expected) resolve(data);
        else reject(Error('離線檔案未存齊，請連線後重試'));
      };
      worker.postMessage({type: 'MASA_CHECK_OFFLINE'}, [channel.port2]);
    });
  }
  async function verify() {
    if (checking) return checking;
    if (!isSecureContext || !('serviceWorker' in navigator) || location.protocol === 'file:') {
      status = 'insecure'; draw(); return;
    }
    status = 'checking'; draw();
    checking = (async () => {
      try {
        const current = ownWorker() ? await navigator.serviceWorker.getRegistration(scopeURL) : null;
        const registration = current?.scope === scopeURL
          ? current
          : await navigator.serviceWorker.register(workerURL, {scope: scopeURL});
        // Recover an evicted or incomplete cache by reinstalling the worker after user retry.
        const worker = await waitForWorker();
        await checkCache(worker);
        const [pack] = await Promise.all([window.MASA_FIELD.ensureDefault(), window.MASA_LOCAL_READY, window.MASA_ENGINEERING_READY]);
        if (typeof window.MASA_AGENT?.run !== 'function' ||
            typeof window.MASA_SAVE_AGENT_RECORD !== 'function' ||
            typeof window.MASA_LOAD_AGENT_RECORDS !== 'function') {
          throw Error('AI 查修 Agent 或本機紀錄服務未就緒');
        }
        // Proof-of-function, not just cache presence. No device/network access.
        const probe = window.MASA_AGENT.run({symptom:'24V 掉壓'}, pack);
        if (probe.title !== '控制電源與掉壓' || probe.state !== 'REVIEW' || !probe.evidence?.length)
          throw Error('AI Agent 本機知識測試未通過');
        status = 'ready';
        if (registration?.waiting) document.getElementById('fieldUpdate').hidden = false;
        registration?.addEventListener('updatefound', () => {
          const next = registration.installing;
          next?.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller !== next)
              document.getElementById('fieldUpdate').hidden = false;
          });
        }, { once:true });
      } catch (error) {
        status = 'failed'; errorText = error.message || '';
      } finally { draw(); }
    })();
    try { await checking; } finally { checking = null; }
  }
  retry.addEventListener('click', async () => {
    if (checking) return;
    if (!navigator.onLine) { errorText='需要恢復網路才能補齊離線檔案'; status='failed'; draw(); return; }
    const worker = ownWorker();
    if (worker) {
      try { await checkCache(worker); }
      catch {
        const registration = await navigator.serviceWorker.getRegistration(scopeURL);
        if (registration?.scope === scopeURL) await registration.unregister();
        location.reload();
        return;
      }
    }
    await verify();
  });
  window.addEventListener('online', () => { draw(); if (status !== 'ready') verify(); });
  window.addEventListener('offline', draw);
  navigator.serviceWorker?.addEventListener('controllerchange', () => { if (!checking) verify(); });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); prompt = event; install.hidden = false;
  });
  install.addEventListener('click', async () => {
    if (!prompt) return;
    const saved = prompt; prompt = null; install.hidden = true;
    try { await saved.prompt(); } catch { document.getElementById('fieldInstallHelp').open = true; }
  });
  window.addEventListener('appinstalled', () => { install.hidden = true; });
  const menu = document.querySelector('.mobile-menu');
  menu.addEventListener('click', event => {
    if (event.target.closest('.mobile-nav button')) menu.open = false;
  });
  verify();
})();
