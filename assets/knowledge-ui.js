/* Static field edition: local IndexedDB knowledge, no server calls. */
(() => {
  const panel = document.createElement('section');
  panel.className = 'panel v1-panel';
  panel.id = 'knowledgeWorkspace';
  panel.hidden = true;
  document.getElementById('fieldWorkspace').after(panel);
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label = '📚 本機知識與手冊';
  let pack;
  for (const nav of document.querySelectorAll('.sidebar .nav, .mobile-nav')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', open);
    nav.append(button);
  }
  function render() {
    const counts = pack?.manifest?.counts;
    panel.innerHTML = `<div class="v1-head"><h3>${label}｜離線搜尋</h3><small>不依賴桌面後端</small></div>
      <p class="v1-note">${counts ? `元件 ${h(counts.components)}、故障樹 ${h(counts.fault_trees)}、量測 SOP ${h(counts.measurement_sop)}、手冊索引 ${h(counts.manual_index)}。` : '正在讀取本機知識包。'} 知識包不包含 PDF 原檔。</p>
      <div class="v1-grid"><article class="v1-card"><h4>離線搜尋</h4>
      <form id="knowledgeSearch"><label>症狀／元件／手冊文字<input name="q" required></label><label>型號（選填）<input name="model"></label><button type="submit" ${pack ? '' : 'disabled'}>搜尋本機資料</button></form></article>
      <article class="v1-card"><h4>匯入知識包</h4><form id="fieldPackImport"><label>選擇從桌面版匯出的知識包<input type="file" name="file" accept=".zip" required></label><button type="submit">驗證並儲存</button></form></article></div>
      <p id="knowledgeStatus" role="status"></p><div id="knowledgeResults" class="v1-grid"></div>`;
  }
  async function open() {
    panel.hidden = false;
    render();
    panel.scrollIntoView({behavior:'smooth'});
    try { pack = await MASA_FIELD.ensureDefault(); render(); }
    catch (error) { panel.querySelector('#knowledgeStatus').textContent = '無法載入知識包：' + error.message; }
  }
  function list(title, rows, format) {
    if (!rows.length) return '';
    return `<article class="v1-card"><h4>${h(title)}（${rows.length}）</h4>${rows.map(x => `<p>${format(x)}</p>`).join('')}</article>`;
  }
  panel.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const status = panel.querySelector('#knowledgeStatus');
    try {
      if (form.id === 'fieldPackImport') {
        pack = await MASA_FIELD.install(await data.get('file').arrayBuffer());
        render();
        panel.querySelector('#knowledgeStatus').textContent = '知識包驗證及儲存完成。';
        return;
      }
      if (form.id !== 'knowledgeSearch' || !pack) return;
      const query = String(data.get('q') || '').trim();
      if (!query) { status.textContent = '請輸入有效關鍵字。'; return; }
      const r = MASA_FIELD.search(pack, query, String(data.get('model') || '').trim());
      const verified = r.manuals.some(x => x.document?.source_level === 'A' && x.document?.verification_status === 'APPROVED');
      status.textContent = '搜尋完成｜' + (verified ? '找到標示為 A 級且已審核的手冊索引' : 'NO VERIFIED OEM SOURCE');
      panel.querySelector('#knowledgeResults').innerHTML =
        list('元件 · 工程規則', r.components, x => h(x.name_zh)) +
        list('故障樹 · 工程規則', r.fault_trees, x => h(x.symptom)) +
        list('量測 SOP · 工程規則', r.measurements, x => h(x.purpose)) +
        list('電纜故障樹 · 工程規則', r.cableFaultTrees, x => h(x.symptom || x.title || x.tree_id)) +
        list('電纜量測 · 工程規則', r.cableMeasurements, x => h(x.purpose)) +
        list('手冊索引', r.manuals, x => `${h(x.document?.title)} · ${h(x.document?.model)} · 第 ${h(x.page_number)} 頁 · ${h(x.document?.source_level)} / ${h(x.document?.verification_status)}<br>${h(String(x.text ?? '').slice(0, 450))}`) +
        list('警報索引', r.alarms, x => `${h(x.alarm_code)} · ${h(x.model)} · 第 ${h(x.page)} 頁 · ${h(x.source_level)} / ${h(x.verification_status)}`) ||
        '<p>沒有符合的本機資料。</p>';
    } catch (error) {
      status.textContent = '本機知識處理失敗：' + error.message;
    }
  });
})();
