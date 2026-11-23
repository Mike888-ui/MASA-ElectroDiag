/* MASA local troubleshooting agent. All tools are bundled and read-only. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MASA_AGENT = api;
})(typeof window === 'undefined' ? globalThis : window, function() {
  const clean = value => String(value ?? '').trim();
  const norm = value => clean(value).normalize('NFKC').toLowerCase();
  const list = value => Array.isArray(value) ? value : [];
  const intents = [
    {id:'chain', title:'多台設備連動掉線', match:/串接|一起.*(?:跳|斷)|掉線|離線|通訊中斷|連線異常|ethercat|profinet|modbus|rs[ -]?485|communication/i, keywords:/ethercat|profinet|modbus|rs[ -]?485|network|device lost|通訊/i, asks:['保留各站警報時間與事件順序，確認第一個異常站。','區分僅通訊中斷、控制供電失去，或上層聯鎖停機。','比對同組電源、網路拓樸及最後更動紀錄。']},
    {id:'power', title:'控制電源與掉壓', match:/24\s*v|掉壓|低壓|power supply|psu|供電|電源/i, keywords:/24\s*v|psu|voltage drop|電源|掉壓/i, asks:['提供電源銘牌、空載與帶載既有讀值，以及發生的時間點。','記錄是否在特定負載啟動時重現，核對上游保護與控制電源圖。']},
    {id:'servo', title:'伺服與驅動器', match:/伺服|servo|驅動器|變頻器|vfd/i, keywords:/servo|vfd|伺服|變頻|drive/i, asks:['記錄廠牌、完整型號及原始警報碼。','區分上電、啟動、運轉或停機時出現。']},
    {id:'sensor', title:'感測器與控制 I/O', match:/感測|sensor|plc|\bi\/?o\b|npn|pnp/i, keywords:/sensor|plc|\bdi\b|\bdo\b|npn|pnp/i, asks:['核對感測器與輸入模組型號，以及 NPN／PNP 相容性。','記錄現有感測器、端子、PLC 診斷指示，區分顯示與實際輸入。']},
    {id:'motor', title:'馬達與接觸器', match:/馬達|motor|接觸器|contactor|線圈|缺相/i, keywords:/motor|contactor|馬達|接觸器|缺相/i, asks:['提供銘牌、啟動方式、保護裝置事件及既有讀值。','先區分控制命令、保護跳脫與負載卡滯，不先判定元件損壞。']}
  ];
  const defaultIntent = {id:'unknown', title:'尚未分類', keywords:/$^/, asks:['補上設備型號及可觀察的故障現象。','記錄發生時機、警報碼、是否可重現與關聯設備。']};
  const bypass = /(?:(?:短接|跨接|旁路|跳過|繞過|解除|停用|關閉|bypass|disable|jumper|override).{0,22}(?:sto\b|急停|e[- ]?stop|安全|門鎖|safety|interlock)|(?:sto\b|急停|e[- ]?stop|安全|門鎖|safety|interlock).{0,22}(?:短接|跨接|旁路|跳過|繞過|解除|停用|bypass|disable|jumper|override))/i;
  const exposed = /冒煙|燒焦|起火|觸電|電弧|打火|裸露帶電|漏電|帶電.*(?:拆|短接|量.*電阻)|(?:(?:400|380|480|高壓)\s*v?.{0,10}(?:量|測|拆))|(?:smoke|arcing|electric shock)/i;
  const readonly = 'MANUAL INPUT · LOCAL RULES';
  const oemStatus = model => model ? '沒有相符的已審核原廠來源' : '未填完整型號，無法核對原廠來源';
  function rank(rows, intent, query, terms, getText) {
    return list(rows).map(row => {
      const text = norm(getText(row));
      return {row, score: (text.includes(query) ? 10 : 0) + terms.reduce((n,t) => n+(text.includes(t)?2:0),0) + (intent.keywords.test(text)?3:0)};
    }).filter(hit => hit.score > 0).sort((a,b) => b.score-a.score).slice(0,4).map(x => x.row);
  }
  function requiresStop(input){
    const text = norm(['symptom','observed','manufacturer','model','alarm'].map(key => clean(input[key])).join(' '));
    return bypass.test(text) || exposed.test(text);
  }
  function run(input, pack) {
    const symptom = clean(input.symptom).slice(0,480);
    const model = clean(input.model).slice(0,80);
    const manufacturer = clean(input.manufacturer).slice(0,80);
    const alarm = clean(input.alarm).slice(0,80);
    const observed = clean(input.observed).slice(0,480);
    const query = norm(symptom);
    if (!query) throw Error('請先描述故障現象。');
    if (requiresStop(input)) {
      return {state:'STOP', title:'停止現場操作', sourceType:readonly, plan:['停止操作，保持人員遠離危險區域，依廠內應變程序通知合格人員。','不得旁路安全裝置或因此報告執行帶電拆測。'], questions:[], evidence:[], oem:'未執行資料查詢', saveAllowed:false};
    }
    const data = pack?.data;
    if (!data) throw Error('本機知識包尚未就緒。');
    const resultText = norm(symptom+' '+observed);
    const intent = intents.find(x=>x.match.test(resultText)) || defaultIntent;
    const terms = [...new Set((query.match(/[a-z\d][a-z\d-]{1,25}|[\u3400-\u9fff]{2,20}/g) || []))].slice(0,10);
    const map = new Map();
    const put = (kind,id,title) => {
      if (id && title) map.set(kind+id,{kind,id:clean(id),title:clean(title),source:'MASA 工程知識，不是 OEM 判定'});
    };
    for (const r of rank(data.fault_trees,intent,query,terms,r=>[r.symptom,r.category,...list(r.aliases)].join(' '))) put('故障樹',r.tree_id,r.symptom);
    for (const r of rank(data.measurement_sop,intent,query,terms,r=>[r.purpose,r.category].join(' '))) put('SOP 索引',r.id,r.purpose);
    for (const r of rank(data.cable_fault_trees,intent,query,terms,r=>[r.symptom,r.category].join(' '))) put('電纜索引',r.tree_id,r.symptom);
    // OEM requires exact manufacturer/model, approved Level A and a source page.
    const approved = new Map(list(data.manual_index).filter(d => manufacturer && model && norm(d.manufacturer)===norm(manufacturer) && norm(d.model)===norm(model) && d.source_level==='A' && d.verification_status==='APPROVED' && d.checksum && d.document_version).map(d=>[d.document_id,d]));
    if (alarm) for (const row of list(data.alarm_codes).filter(r=>approved.has(r.document_id) && norm(r.alarm_code)===norm(alarm) && Number(r.page)>0).slice(0,4)) {
      const d = approved.get(row.document_id);
      map.set('OEM'+row.document_id+row.page,{kind:'OEM 警報索引',id:row.document_id,title:clean(row.alarm_code)+' · '+clean(row.alarm_name || row.description).slice(0,100),source:clean(d.title)+' · '+clean(d.document_version)+' · p.'+row.page});
    }
    const evidence = Array.from(map.values()).sort((a,b)=>Number(b.kind.startsWith('OEM'))-Number(a.kind.startsWith('OEM')));
    const hasOEM = evidence.some(e=>e.kind.startsWith('OEM'));
    const questions = [];
    if (!manufacturer || !model) questions.push('請補廠牌與完整型號，避免把其他機型資料套入。');
    if (!alarm) questions.push('有警報時，請填原樣警報碼。');
    if (!observed) questions.push('請填既有觀察或量測紀錄，不必為了填表新增帶電量測。');
    return {state:evidence.length?'REVIEW':'NEED_EVIDENCE', title:intent.title, sourceType:readonly,
      plan:['先保留原始警報與現場時間序列，不以此結果認定根因。',...intent.asks],
      questions, evidence, oem:hasOEM?'已找到相符的原廠警報索引，仍須核對原檔與版本':oemStatus(model),
      saveAllowed:true};
  }
  const prompts = {
    observed: '現場已經觀察到什麼？可填發生時間、事件順序或已有紀錄。',
    manufacturer: '設備銘牌上的廠牌是什麼？',
    model: '銘牌上的完整型號是什麼？',
    alarm: '紀錄上的原始警報碼是什麼？'
  };
  function nextQuestion(input, turns) {
    const field = Object.keys(prompts).find(key => !clean(input[key]) &&
      !turns.some(t => t.field === key && t.skipped));
    if (!field) return null;
    return {field, prompt: prompts[field], limit: field === 'observed' ? 480 : 80};
  }
  return {run, nextQuestion, requiresStop};
});
