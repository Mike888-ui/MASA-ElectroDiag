/* MASA V1.4.4 HF1: OS-specific instructions and browser entry, no credentials. */
(() => {
  'use strict';
  const bar = document.querySelector('.masa-mobile-bar');
  if (!bar) return;
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(navigator.userAgent);
  const native = Boolean(window.MASA_NATIVE && /MASA_ANDROID_OFFLINE\//.test(navigator.userAgent));
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const bundled = window.MASA_BUNDLED_OFFLINE === true;
  const secureWeb = location.protocol === 'https:' || (location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname));
  const onWeb = (location.protocol === 'https:' || location.protocol === 'http:') && !native;

  const trigger = document.createElement('button');
  trigger.className = 'masa-launch-help-button';
  trigger.type = 'button';
  trigger.textContent = '📱';
  trigger.title = 'Android / iPhone 一鍵啟動設定';
  trigger.setAttribute('aria-label', '手機瀏覽器與主畫面啟動設定');
  bar.appendChild(trigger);

  const backdrop = document.createElement('div');
  backdrop.className = 'masa-launch-overlay';
  backdrop.hidden = true;
  backdrop.setAttribute('role', 'presentation');
  const dialog = document.createElement('section');
  dialog.className = 'masa-launch-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'masa-launch-heading');
  const close = document.createElement('button');
  close.className = 'masa-launch-close'; close.type = 'button';
  close.textContent = '×'; close.setAttribute('aria-label', '關閉說明');
  const title = document.createElement('h2'); title.id = 'masa-launch-heading';
  title.textContent = '📱 手機一鍵啟動 MASA';
  const about = document.createElement('p');
  about.textContent = 'Android／iOS 與電腦共用完整電控查修及多家 AI 對話介面。首次安裝完成後，直接點主畫面圖示啟動。';
  const instructions = document.createElement('ol');
  instructions.className = 'masa-launch-steps';
  const steps = iOS ? [
    '請在 Safari 開啟 MASA 正式 HTTPS 網址（不是 Google Drive 的檔案預覽）。',
    '按 Safari「分享」→「加入主畫面」。',
    '想要顯示 Safari 瀏覽器工具列，可關閉「以網頁 App 開啟」；想要全螢幕 App 則保持開啟。',
    '新增後，從 iPhone 主畫面點 MASA 圖示即可開啟。'
  ] : android ? [
    '在 Chrome 開啟 MASA 正式 HTTPS 網址（不是 Google Drive 的 .cmd／HTML 預覽）。',
    '按右上角「⋮」→「加到主畫面」或「安裝應用程式」（選項依 Chrome 版本而異）。',
    '新增後，從 Android 主畫面點 MASA 圖示即可啟動；若以 App 模式安裝則可能不顯示網址列。'
  ] : [
    '用 Android Chrome 或 iPhone Safari 開啟已部署的 MASA HTTPS 網頁。',
    '使用瀏覽器選單的「加到主畫面」功能。',
    '從主畫面圖示啟動，離線資料會使用同一份網站的本機快取。'
  ];
  for (const step of steps) { const li = document.createElement('li'); li.textContent = step; instructions.appendChild(li); }
  const actions = document.createElement('div'); actions.className = 'masa-launch-actions';
  const open = document.createElement('a'); open.textContent = '🌐 在瀏覽器開啟 MASA';
  open.href = new URL('./index.html', location.href).href;
  open.target = '_blank'; open.rel = 'noopener noreferrer';
  const copy = document.createElement('button'); copy.type = 'button';
  copy.textContent = '複製 MASA 網址';
  copy.addEventListener('click', async () => {
    if (!onWeb) return;
    const value = new URL('./index.html', location.href).href;
    try { await navigator.clipboard.writeText(value); copy.textContent = '✅ 已複製網址'; }
    catch { window.prompt('請長按複製網址：', value); }
  });
  const warning = document.createElement('p'); warning.className = 'masa-launch-warning';
  if (native) {
    open.hidden = true; copy.hidden = true;
    warning.textContent = '這是 APK 封裝的本機離線頁面，不是公開網址。APK 本身已可點圖示啟動；若要在 Chrome 使用，請另部署 HTTPS PWA 網站。';
  } else if (bundled || location.protocol === 'file:') {
    open.hidden = true; copy.hidden = true;
    warning.textContent = '這是下載的單檔 HTML。iPhone 的檔案／Google Drive 預覽不能可靠安裝成瀏覽器離線 App；需先把 02_正式PWA完整網站 放上 HTTPS 網站。Android 直接開檔也依瀏覽器限制而定。';
  } else if (!secureWeb) {
    open.hidden = true; copy.hidden = true;
    warning.textContent = '主畫面離線安裝需使用 HTTPS 網站。請勿用 Google Drive 的檔案預覽頁當作 MASA 的網址。';
  } else {
    actions.append(open,copy);
    warning.textContent = standalone
      ? '目前已由主畫面啟動。若要改用 Safari／Chrome 瀏覽器模式，可點上方「在瀏覽器開啟」；若裝置沒有切換到外部瀏覽器，請複製網址後貼到 Safari／Chrome。'
      : '第一次請連網開啟，等頁面顯示「規則查修離線已就緒」並確認快取完成後，再測試飛航模式。雲端 AI 仍需網路。';
  }
  const foot = document.createElement('p'); foot.className = 'masa-launch-small';
  foot.textContent = '本機維修紀錄／加密 API Key 不會自動跨 Safari、主畫面 Web App、Android APK 同步，換安裝方式前請先匯出紀錄。';
  dialog.append(close,title,about,instructions,actions,warning,foot);
  backdrop.appendChild(dialog); document.body.appendChild(backdrop);
  let lastFocus = null;
  const hide = () => { backdrop.hidden = true; lastFocus?.focus(); };
  trigger.addEventListener('click', () => { lastFocus = document.activeElement; backdrop.hidden = false; close.focus(); });
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) hide(); });
  document.addEventListener('keydown', e => { if (!backdrop.hidden && e.key === 'Escape') hide(); });
})();
