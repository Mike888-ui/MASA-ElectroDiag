(() => {
  'use strict';
  const workspace = document.createElement('section');
  workspace.className='panel v1-panel';
  workspace.id='masaAgentWorkspace';
  workspace.hidden=true;
  document.querySelector('main').append(workspace);
  workspace.innerHTML=`
    <h2>MASA 查修 Agent</h2>
    <p class="v1-note">離線規則代理 · 本機知識包 · 人工輸入。未使用生成式模型，未連接 PLC 或伺服。</p>
    <form id="masaAgentForm" class="v1-grid">
      <label>故障現象（必填）<input name="symptom" required maxlength="480" placeholder="例如：U21 離線後，U22～U24 同組停機"></label>
      <label>廠牌<input name="manufacturer" maxlength="80"></label>
      <label>完整型號<input name="model" maxlength="80"></label>
      <label>原始警報碼<input name="alarm" maxlength="80"></label>
      <label>已有觀察或量測紀錄<textarea name="observed" maxlength="480" rows="2"></textarea></label>
      <div><button type="submit">執行查修 Agent</button></div>
    </form>
    <p id="masaAgentStatus" role="status"></p>
    <div id="masaAgentResult"></div>
    <form id="masaFollow" hidden>
      <label><strong id="masaPrompt"></strong><input name="answer" required></label>
      <button type="submit">送出補充並重新判讀</button>
      <button type="button" id="masaSkip">資料未知，略過</button>
    </form>
    <button id="masaAgentSave" type="button" hidden>確認儲存判讀紀錄</button>
    <details id="masaAgentHistory"><summary>本機 Agent 紀錄</summary><div id="masaAgentHistoryList"></div></details>`;
  const form=workspace.querySelector('form');
  const status=workspace.querySelector('#masaAgentStatus');
  const result=workspace.querySelector('#masaAgentResult');
  const save=workspace.querySelector('#masaAgentSave');
  const follow=workspace.querySelector('#masaFollow');
  let turns=[];
  let current=null;
  function showTurns(entries,parent){
    if (!entries.length) return;
    add('h4','本次追問紀錄',parent);
    const list=add('ol','',parent);
    for (const t of entries) add('li',t.prompt+' '+(t.skipped?'（資料未知）':t.answer),list);
  }
  const history=workspace.querySelector('#masaAgentHistory');
  let historyRevision=0;
  function open() {workspace.hidden=false;workspace.scrollIntoView({block:'start'});}
  document.getElementById('fieldAgentQuick')?.addEventListener('click',open);
  for (const nav of document.querySelectorAll('.sidebar .nav,.mobile-nav')) {
    const b=document.createElement('button');
    b.type='button'; b.textContent='✦ AI 查修 Agent'; b.addEventListener('click',open);
    nav.prepend(b);
  }
  const add=(tag,content,parent=result)=>{
    const el=document.createElement(tag);el.textContent=content;parent.append(el);return el;
  };
  async function showHistory(){
    const request=++historyRevision;
    const target=workspace.querySelector('#masaAgentHistoryList');
    try {
      const entries=await window.MASA_LOAD_AGENT_RECORDS();
      if (request!==historyRevision) return;
      target.replaceChildren();
      if (!entries.length) add('p','尚無本機 Agent 紀錄。',target);
      for (const row of entries) {
        const item=add('details','',target);
        add('summary',row.createdAt+' · '+(row.input?.symptom||row.id),item);
        add('p',row.decision?.title||'查修判讀',item);
        showTurns(Array.isArray(row.turns)?row.turns:[],item);
        const resume=add('button','接續這筆查修',item);
        resume.type='button';
        resume.onclick=()=>{
          for (const key of ['symptom','manufacturer','model','alarm','observed'])
            form.elements[key].value=row.input?.[key]||'';
          turns=Array.isArray(row.turns)?row.turns.slice():[];
          history.open=false;
          form.scrollIntoView({block:'center'});
          evaluate();
        };
        for (const step of row.decision?.plan||[]) add('p',step,item);
        add('p',row.decision?.oem||'未核對原廠資料。',item);
      }
    } catch(error) {
      if (request===historyRevision) target.textContent='無法讀取：'+error.message;
    }
  }
  history.addEventListener('toggle',()=>{if(history.open) showHistory();});
  const reset=()=>{current=null;follow.hidden=true;save.hidden=true;result.replaceChildren();workspace.dispatchEvent(new CustomEvent('masa-agent-reset'));};
  let revision=0;
  form.addEventListener('input',()=>{turns=[];revision++;reset();status.textContent='內容已變更，請重新執行。';});
  form.addEventListener('submit',event=>{event.preventDefault();evaluate();});
  function reply(skipped){
    if (!current || follow.hidden) return;
    const q=window.MASA_AGENT.nextQuestion(current.input,turns);
    const answer=skipped?'':follow.elements.answer.value.trim();
    if (!skipped && !answer) {status.textContent='請填寫補充資料，或選擇略過。';return;}
    form.elements[q.field].value=answer;
    turns=[...turns,{field:q.field,prompt:q.prompt,answer,skipped}];
    evaluate();
  }
  follow.addEventListener('submit',e=>{e.preventDefault();reply(false);});
  workspace.querySelector('#masaSkip').onclick=()=>reply(true);
  async function evaluate(){
    reset();
    const request=++revision;
    const input=Object.fromEntries(new FormData(form));
    const button=form.querySelector('button[type=submit]');button.disabled=true;
    status.textContent='正在檢查本機證據…';
    try {
      const pack=await window.MASA_FIELD.ensureDefault();
      const decision=window.MASA_AGENT.run(input,pack);
      if (request!==revision) return;
      current={input,decision,turns:[...turns],knowledgeChecksum:pack?.checksum};
      workspace.dispatchEvent(new CustomEvent('masa-agent-decision',{detail:{input,decision}}));
      add('h3',decision.title);
      add('p',decision.oem);
      add('h4',decision.state==='STOP'?'安全閘門已阻擋':'查修清單（待人工確認）');
      const items=add('ol','');
      for (const step of decision.plan) add('li',step,items);
      if (decision.questions.length) {
        add('h4','還缺哪些資料');
        const q=add('ul','');
        for (const step of decision.questions) add('li',step,q);
      }
      add('h4','本機來源');
      if (!decision.evidence.length) add('p','沒有相符來源。');
      for (const source of decision.evidence) add('p',`${source.kind} · ${source.id} · ${source.title} · ${source.source}`);
      status.textContent=decision.state==='STOP'?'STOP｜不產生查修紀錄':'完成｜不是自動故障判定';
      if (decision.saveAllowed){
        showTurns(turns,result);
        const next=window.MASA_AGENT.nextQuestion(input,turns);
        if (next){
          workspace.querySelector('#masaPrompt').textContent=next.prompt;
          follow.elements.answer.value='';
          follow.elements.answer.maxLength=next.limit;
          follow.hidden=false;
        } else {
          add('p','追問已完成，可核對來源後儲存本次判讀。');
        }
      }
      save.hidden=!decision.saveAllowed;
    } catch(error) {
      if (request===revision) status.textContent='無法執行：'+error.message;
    } finally {if (request===revision || !current) button.disabled=false;}
  }
  save.addEventListener('click',async ()=>{
    if (!current?.decision.saveAllowed || save.disabled) return;
    const pending=current;save.disabled=true;
    try {
      const record=await window.MASA_SAVE_AGENT_RECORD(pending);
      if (history.open) showHistory();
      if (current===pending) {save.hidden=true;status.textContent='已儲存 · '+record.id+'。可用「現場紀錄 匯出／匯入」備份。';}
    } catch(error) {
      if (current===pending) status.textContent='未儲存：'+error.message;
    } finally {save.disabled=false;}
  });
})();
