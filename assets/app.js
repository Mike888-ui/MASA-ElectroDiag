/* MASA V1 local modules. No network requests or simulated values presented as live telemetry. */
(() => {
  const D=MASA_DATA, W=document.getElementById('v1Workspace');
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>new Date().toISOString();
  let db, view='Dashboard', activeDiagnosis=null, sim={name:'DOL',run:false,phase:'off',fault:'none',step:0,dir:'正轉'};
  const state={equipment:[],repairs:[],photos:[],customComponents:[],diagnostics:[]};
  const engineeringStores=['components','measurements','fault_trees','fault_steps','diagnostic_rules','safety_rules','repair_cases','maintenance','training_questions','settings'];
  const labels={'Dashboard':'Dashboard','智慧異常搜尋':'智慧異常搜尋','電控元件':'電控元件','電子元件':'電子元件','感測 / 訊號':'感測 / 訊號','量測中心':'量測中心','故障樹':'故障樹','AI 診斷助手':'AI 診斷助手','維修案例':'維修案例','設備履歷':'設備履歷','電匠實作訓練':'電匠實作訓練','元件':'電控元件','量測':'量測中心','AI 診斷':'AI 診斷助手','電匠實作':'電匠實作訓練'};
  const side=document.querySelector('.sidebar .nav');
  ['電路模擬','資料管理','統計月報'].forEach(t=>{const b=document.createElement('button');b.textContent='▣ '+t;side.appendChild(b)});
  document.querySelectorAll('.sidebar .nav button,.mobile-nav button').forEach(b=>b.addEventListener('click',()=>openView(Object.keys(labels).find(k=>b.textContent.includes(k))?labels[Object.keys(labels).find(k=>b.textContent.includes(k))]:b.textContent.replace(/^▣ /,''))));
  function openView(name){
    view=name;document.querySelectorAll('.sidebar .nav button').forEach(b=>b.classList.toggle('active',b.textContent.includes(name)));
    if(name==='電匠實作訓練'){document.getElementById('trainingCenter').scrollIntoView();return}
    W.hidden=false;render();W.scrollIntoView({behavior:'smooth'});
  }
  function req(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
  async function initDB(){
    if(!window.indexedDB)throw Error('此瀏覽器未提供 IndexedDB');
    const r=indexedDB.open('masa-electrodiag-v1',2);
    r.onupgradeneeded=()=>{const d=r.result;[...Object.keys(state),...engineeringStores].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id'})});r.transaction.objectStore('settings').put({id:'schemaVersion',value:2,updatedAt:now()})};
    db=await req(r);db.onversionchange=()=>db.close();await reload();document.getElementById('storageStatus').textContent='IndexedDB v2：已連接';
  }
  async function reload(){for(const n of Object.keys(state))state[n]=await req(db.transaction(n).objectStore(n).getAll());render()}
  async function put(n,item){if(!db)throw Error('本機資料庫不可用');const tx=db.transaction(n,'readwrite');tx.objectStore(n).put(item);await txDone(tx);await reload()}
  async function del(n,id){const tx=db.transaction(n,'readwrite');tx.objectStore(n).delete(id);await txDone(tx);await reload()}
  const head=(title,sub='')=>`<div class="v1-head"><h3>${h(title)}</h3><small>${h(sub)}</small></div>`;
  const card=(title,content)=>`<article class="v1-card"><h4>${h(title)}</h4>${content}</article>`;
  const field=(name,label,type='text',value='')=>`<label>${h(label)}<input name="${h(name)}" type="${type}" value="${h(value)}"></label>`;
  const btn=(action,label,id='')=>`<button type="button" data-action="${h(action)}" data-id="${h(id)}">${h(label)}</button>`;
  function render(){if(!W||W.hidden)return;try{W.innerHTML='<div id="fieldSaveStatus" role="status"></div>'+({
    'Dashboard':dashboard,'智慧異常搜尋':search,'電控元件':()=>knowledge('電控元件'),'電子元件':()=>knowledge('電子元件'),'感測 / 訊號':()=>knowledge('感測 / 訊號'),'量測中心':measurements,'故障樹':diagnostic,'AI 診斷助手':ai,'維修案例':repairs,'設備履歷':equipment,'電路模擬':simulation,'資料管理':dataManagement,'統計月報':statistics
  }[view]||dashboard)()}catch(e){W.innerHTML=head('模組載入失敗')+card('錯誤',`<p>${h(e.message)}</p>`);console.error(e)}}
  function dashboard(){return head('V1.1 本機資料概況','資料源：本機 IndexedDB；非即時設備量測')+
    `<div class="v1-grid">${card('設備',`<p>${state.equipment.length} 台已存設備</p>${btn('go','進入設備','設備履歷')}`)}${card('維修',`<p>${state.repairs.length} 筆；未結案 ${state.repairs.filter(r=>r.status!=='CLOSED').length} 筆</p>${btn('go','維修履歷','維修案例')}`)}${card('訓練',`<p>原始 30 題 + MASA 自編 90 題 = ${trainingQuestions.length} 題</p>${btn('go','開始訓練','電匠實作訓練')}`)}</div>`+
    '<div class="v1-note">舊版上方的 24.1V、0.3V、82% 與事件面板為 V0.3 示例，並非真實設備資料。本機規則引擎不連線 PLC。</div>'}
  function search(){const q=(W.dataset.search||'').trim().toLocaleLowerCase();const match=s=>s.toLocaleLowerCase().includes(q);
    const cs=D.components.concat(state.customComponents).filter(c=>!q||match(c.name+' '+c.category+' '+c.failure));const ds=D.diagnoses.filter(d=>!q||match(d.symptom+' '+d.component+' '+d.cause));const rs=state.repairs.filter(r=>!q||match(r.symptom+' '+r.cause+' '+r.equipmentId));
    return head('智慧異常搜尋','本機索引，無外部 API')+`<input id="v1Search" value="${h(W.dataset.search||'')}" placeholder="輸入症狀、元件或設備編號"><div class="v1-grid">${card('可能元件',cs.slice(0,15).map(c=>`<p>${h(c.name)}</p>`).join('')||'無相符資料')}${card('Fault Tree',ds.map(d=>`<p>${h(d.symptom)} ${btn('diagnose','開始',d.id)}</p>`).join('')||'無相符資料')}${card('量測方法',ds.map(d=>`<p>${h(d.test)}</p>`).join('')||'請查元件 SOP')}${card('維修案例',rs.map(r=>`<p>${h(r.symptom)} — ${h(r.cause||'未判定')}</p>`).join('')||'尚無本機紀錄')}</div>`}
  function knowledge(kind){const items=D.components.concat(state.customComponents).filter(c=>kind==='電子元件'?c.category==='電子元件':kind==='感測 / 訊號'?c.category==='感測／致動':c.category!=='電子元件');
    const q=(W.dataset.componentSearch||'').toLocaleLowerCase();const filtered=items.filter(c=>(c.name+' '+c.category).toLocaleLowerCase().includes(q));
    return head(kind,`${filtered.length} 項；額定值依型號／Datasheet`)+`<input id="componentSearch" placeholder="搜尋元件" value="${h(W.dataset.componentSearch||'')}">`+
      `<details><summary>新增自訂元件</summary><form id="componentForm">${field('name','名稱')}${field('category','分類')}${field('principle','工作原理')}${field('terminals','端子／符號')}${field('failure','常見故障')}${field('sop','量測 SOP')}${field('judgement','判定依據')}<button>儲存元件</button></form></details>`+
      `<div class="v1-grid">${filtered.map(c=>card(c.name,`<small>${h(c.category)} ${c.id?'｜自訂':''}</small><p><b>原理／功能：</b>${h(c.principle)}</p><p><b>端子／符號：</b>${h(c.terminals)}</p><p><b>動作順序：</b>${h(c.sequence||'依設備圖面')}</p><p><b>常見失效：</b>${h(c.failure)}</p><p><b>量測 SOP：</b>${h(c.sop)}</p><p><b>正常／異常：</b>${h(c.judgement)}</p><p class="v1-warn"><b>安全：</b>${h(c.safety||D.safety)}</p>${c.id?btn('deleteComponent','刪除',c.id):''}`)).join('')}</div>`}
  const guides=[
    ['電壓 AC/DC','合格萬用表','對應 AC/DC 電壓檔','否；限受訓者','待測高電位','參考端','設備圖示兩點','依銘牌與圖面','缺電／壓降查上游','檢查保護與端子'],
    ['導通／電阻','萬用表','Ω／蜂鳴檔','必須','元件一端','元件另一端','隔離後元件兩端','依開閉預期','開路／短路','查接點和線路'],
    ['三相電流','合格鉗表','AC A','否；限受訓者','不適用','不適用','每次只鉗單一相','依銘牌及三相比較','不平衡／過載','查缺相與負載'],
    ['馬達繞組','萬用表','Ω','必須','U/V/W 任一相','另一相','隔離驅動器後比較三相','阻值相互接近，非固定 Ω','不平衡／開路','查繞組與接線'],
    ['電容容量','電容表','容量檔','必須放電','電容端子','另一端','隔離且放電後','依元件標示允差','容量衰退／短路','核對規格更換'],
    ['二極體','萬用表','Diode','必須','陽極','陰極','隔離後二極體兩端','正反向表現依型號','雙向短路或開路','核對 Datasheet'],
    ['4–20mA','迴路表／電流表','mA','接線前必須','依迴路圖','依迴路圖','安全隔離後串聯接入','依量程與供電','零電流／偏差','查供電／AI'],
    ['絕緣電阻','合格絕緣測試器','依原廠規定','必須','隔離後繞組','外殼 PE','僅適用允許測試的馬達','依額定與現場標準','絕緣低','停止使用並檢查']
  ];
  function measurements(){return head('量測中心','通用教學流程；不得取代設備圖面／安全程序')+'<div class="v1-grid">'+guides.map(g=>card(g[0],`<p>儀器：${h(g[1])}；檔位：${h(g[2])}</p><p>斷電：${h(g[3])}</p><p>Red Probe：${h(g[4])}；Black Probe：${h(g[5])}</p><p>Test Point：${h(g[6])}</p><p>正常：${h(g[7])}；異常：${h(g[8])}</p><p>下一步：${h(g[9])}</p><p class="v1-warn">${h(D.safety)} 絕緣測試器不得接 PLC、VFD、Servo、Encoder 或 PCB。</p>`)).join('')+'</div>'}
  function diagnostic(){const d=activeDiagnosis?D.diagnoses[activeDiagnosis.id]:null;return head('規則式故障診斷','人工量測輸入，不代表真實設備串接')+
    `<label>症狀<select id="diagnosisSelect"><option value="">請選擇</option>${D.diagnoses.map(x=>`<option value="${x.id}" ${d?.id===x.id?'selected':''}>${h(x.symptom)}</option>`).join('')}</select></label>`+
    (!d?'請選擇症狀開始。':`<div class="v1-grid">${card('1 安全確認',`<p>${h(d.safe)}</p><p class="v1-warn">${h(D.safety)}</p><label><input type="checkbox" id="legacyTrained"> 具備受訓資格</label><label><input type="checkbox" id="legacyCat"> CAT Rating 適合</label><label><input type="checkbox" id="legacyPpe"> PPE 完備</label>`)}${card('2 設備及保護',`<label>設備<select id="diagnosisEquipment"><option value="">未指定</option>${state.equipment.map(e=>`<option value="${h(e.id)}">${h(e.id)} ${h(e.name)}</option>`).join('')}</select></label><p>${h(d.protect)}</p>`)}${card('3 人工量測與判斷',`<p>${h(d.test)}</p><label>量測值（含單位，人工輸入）<input id="measured" placeholder="例：依銘牌填入實測值"></label><label>與銘牌／圖面比對<select id="judgement"><option value="">請選擇</option><option value="normal">符合預期</option><option value="abnormal">異常</option><option value="unknown">無法安全確認</option></select></label>${btn('resolve','判定下一步',d.id)}`)}${card('4 判定與紀錄',`<div id="diagnosisResult" class="v1-result">等待 MANUAL INPUT / SIMULATION；未接入真實設備。</div>${btn('recordFromDiagnosis','建立維修紀錄',d.id)}`)}</div>`)+`<div class="v1-note">診斷為教學用規則，不給出通用電壓／電阻閾值；高風險測試由合格人員依現場 SOP 執行。</div>`}
  function ai(){return head('AI 協助學習／知識更新','目前：本機規則引擎，未設定外部 API')+card('連線狀態','<p>尚未接通雲端 AI。不可把診斷結果當成模型即時判讀。若將來啟用，須配置合法 API、後端金鑰保護與使用者授權；不可把金鑰存瀏覽器。</p>'+btn('go','使用本機故障樹','故障樹'))}
  function equipment(){return head('設備管理','新增、編輯、刪除保存在 IndexedDB')+
    `<form id="equipmentForm" class="v1-grid">${field('id','設備編號')}${field('name','設備名稱')}${field('location','位置')}${field('model','型號')}${field('notes','備註')}<label>照片（手機可選相機）<input type="file" name="image" accept="image/png,image/jpeg,image/webp" capture="environment"></label><button>儲存設備</button></form>`+
    `<div class="v1-grid">${state.equipment.map(e=>card(e.id,`<p>${h(e.name)}｜${h(e.location)}｜${h(e.model)}</p><p>${h(e.notes)}</p>${e.photo?`<img class="v1-photo" src="${e.photo}" alt="設備照片">`:''}<p>維修 ${state.repairs.filter(r=>r.equipmentId===e.id).length} 筆</p><div class="v1-actions">${btn('history','設備履歷',e.id)}${btn('qr','QR Code',e.id)}${btn('editEquipment','編輯',e.id)}${btn('deleteEquipment','刪除',e.id)}</div>`)).join('')||card('尚無設備','請新增第一台設備。')}</div>`}
  function repairs(){const filter=W.dataset.repairFilter||'',shown=state.repairs.filter(r=>!filter||r.equipmentId===filter);return head('維修案例與履歷','照片及紀錄均本機持久化')+
    (filter?`<p>設備篩選：${h(filter)} ${btn('clearHistory','清除篩選')}</p>`:'')+
    `<form id="repairForm" class="v1-grid"><input type="hidden" name="id"><label>設備<select name="equipmentId" required><option value="">選擇設備</option>${state.equipment.map(e=>`<option value="${h(e.id)}">${h(e.id)} ${h(e.name)}</option>`).join('')}</select></label>${field('date','日期','date',new Date().toISOString().slice(0,10))}${field('symptom','故障症狀')}${field('measurement','量測結果（人工資料）')}${field('cause','故障原因')}${field('action','處理方式')}${field('parts','更換零件')}${field('technician','維修人員')}${field('duration','停機分鐘','number')}<label>狀態<select name="status"><option>OPEN</option><option>WATCH</option><option>CLOSED</option></select></label><label>Before Photo<input name="before" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"></label><label>After Photo<input name="after" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"></label><button>儲存維修紀錄</button></form>`+
    `<div class="v1-grid">${shown.slice().reverse().map(r=>card(`${r.date}｜${r.equipmentId}`,`<p>${h(r.symptom)}｜${h(r.status)}</p><p>量測：${h(r.measurement)}；原因：${h(r.cause)}</p><p>處理：${h(r.action)}；${h(r.technician)}</p>${state.photos.filter(p=>p.repairId===r.id).map(p=>`<img class="v1-photo" src="${p.data}" alt="${h(p.kind)} 照片">`).join('')}<div class="v1-actions">${btn('editRepair','編輯',r.id)}${btn('deleteRepair','刪除',r.id)}</div>`)).join('')||card('尚無維修紀錄','儲存後可在設備履歷查看。')}</div>`}
  function statistics(){const completed=state.repairs.filter(r=>r.status==='CLOSED'&&Number(r.duration)>0),mttr=completed.length?(completed.reduce((s,r)=>s+Number(r.duration),0)/completed.length).toFixed(1):'資料不足';const counts={};for(const r of state.repairs)counts[r.equipmentId]=(counts[r.equipmentId]||0)+1;
    return head('維修月報','由本機維修資料計算；MTBF 需可靠的運轉時數與故障時間')+`<div class="v1-grid">${card('故障次數',String(state.repairs.length))}${card('MTTR',h(mttr)+(completed.length?' 分鐘':''))}${card('MTBF','資料不足：尚未收集設備實際運轉時數')}${card('設備故障分布',Object.entries(counts).map(([k,v])=>`<p>${h(k)}：${v}</p>`).join('')||'無資料')}${card('本月紀錄',String(state.repairs.filter(r=>r.date?.startsWith(new Date().toISOString().slice(0,7))).length))}</div>${btn('csv','匯出維修 CSV')}`}
  function dataManagement(){return head('資料管理','JSON 備份／還原；還原前自動下載目前備份')+card('操作',`<div class="v1-actions">${btn('backup','下載 JSON 備份')}${btn('csv','下載維修 CSV')}</div><label>匯入備份 JSON<input type="file" id="restoreFile" accept="application/json,.json"></label><p>僅接受本系統備份格式；不覆蓋原始 V0.3 HTML。</p><p>IndexedDB：${db?'已連線':'不可用'}。V0.3 題目紀錄另存 localStorage，備份會包含；還原後重新整理顯示。</p>`)}
  function simulation(){const mode=sim.name,reverse=mode==='正逆轉互鎖',star=mode==='星三角';const energised=sim.run&&sim.fault==='none';
    const phase=star?(energised?(sim.step>0?'三角':'星形'):'停止'):reverse?(energised?sim.phase:'停止'):(energised?'RUN':'STOP');
    const svg=`<svg class="v1-svg" viewBox="0 0 750 310" role="img" aria-label="${h(mode)} 教學功能回路"><text x="20" y="30" fill="#62dfff">主回路（教學功能圖；非正式配線圖）</text><text x="20" y="88" fill="#d9efff">L1 / L2 / L3</text><path d="M170 82H260 M170 104H260 M170 126H260" stroke="#89adc3" stroke-width="3"/><rect x="260" y="65" width="105" height="80" rx="8" stroke="#4db9db" fill="${energised?'#174a45':'#142338'}"/><text x="273" y="108" fill="#fff">MC ${energised?'閉合':'斷開'}</text><path d="M365 82H455 M365 104H455 M365 126H455" stroke="#89adc3" stroke-width="3"/><rect x="455" y="65" width="110" height="80" rx="8" stroke="#e2bd65" fill="#142338"/><text x="472" y="108" fill="#fff">OL / 保護</text><path d="M565 104H620" stroke="#89adc3" stroke-width="3"/><text x="625" y="108" fill="#fff">M</text><text x="20" y="184" fill="#62dfff">控制回路（邏輯示意）</text><text x="20" y="225" fill="#effaff">控制電源 ─ STOP NC ─ OL 95-96 NC ─ START NO / AUX 13-14 ─ A1 (MC) A2 ─ 返回</text><text x="20" y="264" fill="${energised?'#62e49c':'#ffd477'}">${h(phase)}｜${h(sim.fault==='none'?'無注入故障':sim.fault)}</text></svg>`;
    return head('電路模擬訓練','僅功能教學圖，不得直接當成施工或安全驗證圖')+
      `<label>教學場景<select id="circuitSelect">${D.circuits.map(c=>`<option ${mode===c.name?'selected':''}>${h(c.name)}</option>`).join('')}</select></label>${card(mode,`<p>${h(D.circuits.find(c=>c.name===mode).description)}</p>${svg}<div class="v1-actions">${btn('simStart','START')}${btn('simStop','STOP')}${btn('simReset','RESET')}${reverse?btn('simReverse','REV'):''}${star?btn('simTransition','星→三角切換'):''}</div><label>故障注入<select id="simFault"><option value="none">無</option><option value="open">接點開路</option><option value="coil">線圈故障</option><option value="phase">缺相</option><option value="overload">過載</option><option value="wire">配線錯誤</option></select></label><p id="simFeedback">${h(sim.fault==='none'?'按 START 觀察接觸器及運轉狀態。':sim.fault==='phase'?'缺相：模擬保護應跳脫；請停機查三相供電。':'故障注入後應停機，斷電驗電再查修。')}</p>`)}<div class="v1-note">正逆轉與星三角邏輯禁止接觸器重疊；E-Stop / Safety Relay 為概念訓練，不能用此圖驗證安全完整性。</div>`}
  function download(name,content,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  async function backup(){let legacy=null;try{legacy=JSON.parse(localStorage.getItem('masa_electrodiag_training_v03')||'null')}catch{}const data={};for(const n of [...Object.keys(state),...engineeringStores])data[n]=await req(db.transaction(n).objectStore(n).getAll());return {format:'MASA-v1',version:2,schemaVersion:2,createdAt:now(),data,legacyTraining:legacy}}
  async function restore(obj){if(obj?.format!=='MASA-v1'||![1,2].includes(obj.version)||!obj.data||Object.keys(state).some(n=>!Array.isArray(obj.data[n])))throw Error('備份格式或版本不符');
    const names=obj.version===1?Object.keys(state):[...Object.keys(state),...engineeringStores];
    if(names.some(n=>!Array.isArray(obj.data[n])||obj.data[n].some(v=>!v||typeof v.id!=='string')))throw Error('備份內容缺少有效資料表／ID');
    const tx=db.transaction(names,'readwrite');for(const n of names){const s=tx.objectStore(n);s.clear();obj.data[n].forEach(v=>s.put(v))}await txDone(tx);
    if(obj.legacyTraining){try{localStorage.setItem('masa_electrodiag_training_v03',JSON.stringify(obj.legacyTraining))}catch(e){alert('舊題庫紀錄無法寫入 localStorage：'+e.message)}}await reload()}
  const uid=()=>crypto.randomUUID();
  const photoFile=async f=>{if(!f)return null;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)throw Error('照片須為 JPG/PNG/WEBP 且小於 8MB');return new Promise((resolve,reject)=>{const r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)})};
  async function saveEquipment(form){const f=new FormData(form),id=String(f.get('id')||'').trim();if(!id||!String(f.get('name')||'').trim())throw Error('設備編號與名稱必填');const old=state.equipment.find(e=>e.id===id);const file=form.elements.image.files[0];await put('equipment',{id,name:f.get('name'),location:f.get('location'),model:f.get('model'),notes:f.get('notes'),photo:await photoFile(file)||old?.photo||null,updatedAt:now(),createdAt:old?.createdAt||now()})}
  async function saveRepair(form){const f=new FormData(form),id=String(f.get('id')||'')||uid(),old=state.repairs.find(r=>r.id===id);if(!state.equipment.some(e=>e.id===f.get('equipmentId'))||!f.get('symptom'))throw Error('請選擇設備並輸入症狀');const photos=[];for(const kind of ['before','after']){const data=await photoFile(form.elements[kind].files[0]);if(data)photos.push({id:uid(),repairId:id,equipmentId:f.get('equipmentId'),kind,data,createdAt:now()})}const r={id,equipmentId:f.get('equipmentId'),date:f.get('date'),symptom:f.get('symptom'),measurement:f.get('measurement'),cause:f.get('cause'),action:f.get('action'),parts:f.get('parts'),technician:f.get('technician'),duration:f.get('duration'),status:f.get('status'),revision:(old?.revision||0)+1,updatedAt:now(),createdAt:old?.createdAt||now()};
    const tx=db.transaction(['repairs','photos'],'readwrite');tx.objectStore('repairs').put(r);photos.forEach(p=>tx.objectStore('photos').put(p));await txDone(tx);await reload()}
  function csv(){const cols=['id','equipmentId','date','symptom','measurement','cause','action','parts','technician','duration','status'];return '\ufeff'+cols.join(',')+'\r\n'+state.repairs.map(r=>cols.map(k=>'"'+String(r[k]||'').replace(/"/g,'""')+'"').join(',')).join('\r\n')}
  W.addEventListener('input',e=>{if(e.target.id==='v1Search'){W.dataset.search=e.target.value;const n=e.target.selectionStart;render();document.getElementById('v1Search')?.focus();document.getElementById('v1Search')?.setSelectionRange(n,n)}if(e.target.id==='componentSearch'){W.dataset.componentSearch=e.target.value;const n=e.target.selectionStart;render();document.getElementById('componentSearch')?.focus();document.getElementById('componentSearch')?.setSelectionRange(n,n)}});
  W.addEventListener('change',async e=>{if(e.target.id==='diagnosisSelect'){activeDiagnosis=e.target.value===''?null:D.diagnoses[Number(e.target.value)];render()}if(e.target.id==='circuitSelect'){sim={name:e.target.value,run:false,phase:'off',fault:'none',step:0,dir:'正轉'};render()}if(e.target.id==='simFault'){sim.fault=e.target.value;if(sim.fault!=='none')sim.run=false;render();document.getElementById('simFault').value=sim.fault}if(e.target.id==='restoreFile'){try{const obj=JSON.parse(await e.target.files[0].text());download('MASA_before_restore_'+Date.now()+'.json',JSON.stringify(await backup()),'application/json');await restore(obj);alert('已還原；重新整理可載入舊題庫紀錄。')}catch(err){alert('還原失敗：'+err.message)}}});
  W.addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.target;
    const formId=form.getAttribute('id'); // Forms have a field named id.
    const button=form.querySelector('button[type="submit"],button:not([type])');
    if(button?.disabled)return;
    if(button)button.disabled=true;
    const report=(message,ok)=>{const el=W.querySelector('#fieldSaveStatus');if(el){el.className='v1-note '+(ok?'v1-good':'v1-bad');el.textContent=message}};
    try{
      if(formId==='equipmentForm')await saveEquipment(form);
      else if(formId==='repairForm')await saveRepair(form);
      else if(formId==='componentForm'){const o=Object.fromEntries(new FormData(form));if(!o.name)throw Error('名稱必填');await put('customComponents',{id:uid(),...o,safety:D.safety,createdAt:now()})}
      else return;
      report('已保存至本機資料庫',true);
    }catch(error){report(error.message,false)}
    finally{if(button)button.disabled=false}
  });
  W.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;try{
    if(a==='go'){openView(id);return}if(a==='diagnose'){activeDiagnosis=D.diagnoses[Number(id)];openView('故障樹');return}
    if(a==='resolve'){const gate=window.MASA_ENGINE?.safetyGate({mode:'live_voltage',equipmentEnergized:true,trained:document.getElementById('legacyTrained').checked,catRated:document.getElementById('legacyCat').checked,ppe:document.getElementById('legacyPpe').checked});if(!gate?.allowed){document.getElementById('diagnosisResult').textContent='STOP：'+(gate?.reasons.join('；')||'工程安全模組尚未載入');return}const d=D.diagnoses[Number(id)],value=document.getElementById('measured').value.trim(),j=document.getElementById('judgement').value,eq=document.getElementById('diagnosisEquipment').value;if(!value||!j)throw Error('請輸入量測值與比對判斷');const result=j==='normal'?`已確認此測點符合預期；下一步沿設備圖面檢查下游：${d.cause}。`:j==='abnormal'?`此測點異常；優先檢查上游保護、供電或配線，再查：${d.cause}。`:'無法安全確認：停止量測，交由合格人員依圖面與安全程序處理。';document.getElementById('diagnosisResult').textContent=`MANUAL INPUT：${value}\n設備：${eq||'未指定'}\n${result}\n建議：建立維修紀錄，不要以此推定元件必然損壞。`;await put('diagnostics',{id:uid(),symptom:d.symptom,equipmentId:eq,measurement:value,judgement:j,result,createdAt:now()});return}
    if(a==='recordFromDiagnosis'){const d=D.diagnoses[Number(id)];openView('維修案例');document.querySelector('[name="symptom"]').value=d.symptom;return}
    if(a==='editEquipment'){const x=state.equipment.find(x=>x.id===id);for(const k of ['id','name','location','model','notes'])document.querySelector(`#equipmentForm [name="${k}"]`).value=x[k]||'';document.querySelector('#equipmentForm [name="id"]').readOnly=true;W.scrollIntoView();return}
    if(a==='deleteEquipment'){if(state.repairs.some(r=>r.equipmentId===id))throw Error('此設備已有維修履歷；請保留設備或先處理關聯紀錄');if(confirm('刪除設備 '+id+'？'))await del('equipment',id);return}
    if(a==='deleteComponent'){if(confirm('刪除自訂元件？'))await del('customComponents',id);return}
    if(a==='history'){W.dataset.repairFilter=id;openView('維修案例');return}if(a==='clearHistory'){W.dataset.repairFilter='';render();return}
    if(a==='editRepair'){const r=state.repairs.find(x=>x.id===id),f=document.getElementById('repairForm');for(const k of ['id','equipmentId','date','symptom','measurement','cause','action','parts','technician','duration','status'])f.elements[k].value=r[k]||'';f.scrollIntoView();return}
    if(a==='deleteRepair'){if(!confirm('刪除此維修紀錄與照片？'))return;for(const p of state.photos.filter(p=>p.repairId===id))await del('photos',p.id);await del('repairs',id);return}
    if(a==='qr'){showQR(id);return}if(a==='backup'){download('MASA_Backup_'+Date.now()+'.json',JSON.stringify(await backup()),'application/json');return}if(a==='csv'){download('MASA_Repairs.csv',csv(),'text/csv;charset=utf-8');return}
    if(a==='simStart'){if(sim.fault!=='none'){sim.run=false;alert('故障已注入；須先排除、RESET，禁止強行啟動。')}else{sim.run=true;sim.phase=sim.dir}render();return}
    if(a==='simStop'){sim.run=false;sim.phase='off';sim.step=0;render();return}if(a==='simReset'){sim.run=false;sim.fault='none';sim.phase='off';sim.step=0;render();return}
    if(a==='simReverse'){if(sim.run)throw Error('先按 STOP 並確認機械完全停止；不允許帶轉換向');sim.dir=sim.dir==='正轉'?'反轉':'正轉';render();alert('已選擇'+sim.dir+'；確認機械停止後再按 START。互鎖禁止同時吸合。');return}
    if(a==='simTransition'){if(sim.run)sim.step=1;render();return}
  }catch(err){alert(err.message);console.error(err)}});
  function showQR(id){
    if(typeof QRCode==='undefined')throw Error('離線 QR 模組尚未就緒');
    const text=new URL('?equipment='+encodeURIComponent(id),location.href).href;
    const q=new QRCode(0,0);q.addData(text);q.make();
    const size=q.getModuleCount(),rect=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(q.isDark(y,x))rect.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${size+8} ${size+8}" width="240" height="240"><rect x="-4" y="-4" width="${size+8}" height="${size+8}" fill="white"/><g fill="black">${rect.join('')}</g></svg>`;
    // WebView / mobile file viewers often block popup windows. Render the same QR inline.
    if(window.MASA_NATIVE || matchMedia('(max-width:980px)').matches){
      document.getElementById('masaQrDialog')?.remove();
      const overlay=document.createElement('div');overlay.id='masaQrDialog';
      overlay.style.cssText='position:fixed;inset:0;z-index:1100;background:#000b;display:grid;place-items:center;padding:16px';
      const panel=document.createElement('div');
      panel.style.cssText='background:#0a1b2c;color:white;border:1px solid #3984ae;border-radius:14px;padding:18px;text-align:center;max-width:100%;overflow-wrap:anywhere';
      panel.innerHTML='<h3>設備 QR</h3>'+svg+'<p>'+h(id)+'</p><small>離線檔案／APK 產生的 QR 網址僅適用目前裝置，跨裝置請以設備編號搜尋。</small>';
      const save=document.createElement('button');save.textContent='下載 SVG';save.type='button';
      const close=document.createElement('button');close.textContent='關閉';close.type='button';
      close.style.marginLeft='10px';
      save.onclick=()=>download(id+'.svg',svg,'image/svg+xml');close.onclick=()=>overlay.remove();
      panel.append(save,close);overlay.append(panel);document.body.append(overlay);
      overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
      return;
    }
    const win=window.open('','_blank');if(!win)throw Error('請允許彈出視窗');
    win.document.write(`<title>設備 QR ${h(id)}</title><div>${svg}</div><p>${h(id)}</p><p>${h(text)}</p><button onclick="print()">列印</button><button id="save">下載 SVG</button>`);
    win.document.close();
    win.document.getElementById('save').onclick=()=>{const a=win.document.createElement('a');a.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));a.download=id+'.svg';a.click()};
  }

  document.querySelectorAll('.kpi .value').forEach(x=>{x.title='V0.3 固定教學示例，非設備即時數據';x.insertAdjacentHTML('afterend','<small class="v1-warn">SIMULATION</small>')});
  document.querySelector('.sidebar .nav button .badge').textContent='DEMO';
  const topNote=document.createElement('div');topNote.className='v1-note';topNote.textContent='V0.3 原始 Dashboard 數值與事件為教學示例，不是 PLC／設備即時資料；正式紀錄請使用下方本機功能。';document.querySelector('.main .grid').prepend(topNote);
  const oldRun=window.runDiagnosis;window.runDiagnosis=function(){oldRun();const v=document.getElementById('searchInput').value;const match=D.diagnoses.find(d=>v.includes(d.symptom)||d.symptom.includes(v));activeDiagnosis=match||D.diagnoses[0];openView('故障樹')};window.nextStep=()=>openView('故障樹');
  trainingQuestions.push(...D.questions);const count=document.getElementById('examCount');for(const n of [60,90,120]){const o=document.createElement('option');o.value=n;o.textContent=n;count.append(o)};
  window.shuffled=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
  try{document.getElementById('statTotal').textContent=trainingQuestions.length;renderQuestionList();stats()}catch(e){console.error('Training refresh',e)}
  window.MASA_LOAD_AGENT_RECORDS=async ()=>{
    await window.MASA_LOCAL_READY;
    const rows=await req(db.transaction('diagnostics').objectStore('diagnostics').getAll());
    return rows.filter(x=>x.kind==='LOCAL_AGENT').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,30);
  };
  window.MASA_SAVE_AGENT_RECORD=async event=>{
    if(!event?.decision?.saveAllowed || event.decision.state==='STOP') throw Error('不允許儲存此判讀。');
    await window.MASA_LOCAL_READY;
    const now=new Date().toISOString();
    const record={id:'agent-'+crypto.randomUUID(),equipmentId:'',createdAt:now,updatedAt:now,revision:1,
      kind:'LOCAL_AGENT',sourceType:'MANUAL INPUT · LOCAL RULES',turns:event.turns||[],input:event.input,decision:event.decision,knowledgeChecksum:event.knowledgeChecksum};
    const tx=db.transaction('diagnostics','readwrite');
    tx.objectStore('diagnostics').add(record);
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存中斷'));});
    state.diagnostics.push(record);
    return record;
  };
  const equipmentParam=new URLSearchParams(location.search).get('equipment');window.MASA_LOCAL_READY=initDB();window.MASA_LOCAL_READY.then(()=>{if(equipmentParam)openView('設備履歷');else {W.hidden=false;render()}if(equipmentParam&&!state.equipment.some(x=>x.id===equipmentParam))alert('找不到設備：'+equipmentParam)}).catch(e=>{document.getElementById('storageStatus').textContent='IndexedDB 不可用：無法保存';W.hidden=false;render();console.error(e)});
})();
