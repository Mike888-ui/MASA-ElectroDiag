/* MASA V1.4.3: independent responsive, multi-provider chat. No third-party account credentials in MASA. */
(()=>{
  'use strict';
  const engine=window.MASA_AI_CHAT,vault=window.MASA_AI_VAULT,main=document.querySelector('main');
  if(!engine||!vault||!main)return;
  const section=document.createElement('section');
  section.className='masa-chat v1-panel';section.id='masaAIChat';section.hidden=true;
  section.innerHTML=`
    <header class="masa-chat-header"><h3>💬 MASA AI Agent 多模型聊天室</h3><span class="masa-chat-badge">免費入口 · 個人 API · 本機模式</span></header>
    <p class="masa-chat-hint">可連續追問、切換 AI；第三方正式登入由各家官方網站處理，MASA 不讀取你的帳號密碼。</p>
    <div class="masa-chat-controls">
      <label>選擇 AI 服務<select id="mcProvider">
        <optgroup label="官方網站（可用既有免費／付費帳號登入）">
          <option value="site:chatgpt">ChatGPT 官方網站</option>
          <option value="site:geminiweb">Google Gemini 官方網站</option>
          <option value="site:claude">Claude 官方網站</option>
          <option value="site:deepseek">DeepSeek 官方網站</option>
          <option value="site:kimi">Kimi 官方網站</option>
          <option value="site:qwen">Qwen 官方網站</option>
          <option value="site:grok">Grok 官方網站</option>
          <option value="site:meta">Meta AI 官方網站</option>
          <option value="site:copilot">Copilot 官方網站</option>
        </optgroup>
        <optgroup label="聊天室內直接回答（免費額度，需要 API Key）">
          <option value="gemini">Google Gemini API</option>
          <option value="groq">GroqCloud API</option>
          <option value="openrouter">OpenRouter 免費模型 API</option>
        </optgroup>
        <optgroup label="本機模型（已安裝／支援裝置才可用）">
          <option value="ollama">Ollama 本機</option>
          <option value="chrome">Chrome 內建 Prompt API</option>
        </optgroup>
      </select></label>
      <label>對話用途<select id="mcScope"><option value="general">一般問答（不附加設備資料）</option><option value="diagnostic">工程查修（需先通過規則 Agent）</option></select></label>
    </div>
    <div id="mcWebsite" class="masa-chat-website">
      <p id="mcSiteHint" class="masa-chat-hint">官方網站會在另一個分頁開啟；登入狀態由該網站與手機瀏覽器管理。</p>
      <div class="masa-chat-actions"><a id="mcSiteLink" class="masa-chat-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">開啟官方 AI 聊天室</a></div>
      <p class="masa-chat-hint">使用 Chrome／Safari 官方登入頁面與手機密碼管理員的自動填入、通行金鑰或既有登入工作階段。付費訂閱在官方站繼續生效；本頁不能代替官方網站直接送訊息。</p>
      <details><summary>📱 設定只有自己的手機自動登入</summary><p class="masa-chat-hint">第一次在官方網站登入並允許手機的密碼管理員／通行金鑰儲存。以後點同一官方入口，網站登入工作階段尚有效時即可免重登；過期或要求二階段驗證仍需重新登入。若不希望密碼同步到雲端，請在手機密碼管理員設定中關閉同步或使用其本機儲存模式（依手機品牌與系統而異）。不要將網站帳號或密碼輸入 MASA API Key 欄。</p></details>
    </div>
    <div id="mcApiPanel" hidden>
      <div class="masa-chat-controls">
        <label>使用模型<select id="mcModel"></select></label>
        <label id="mcKeyWrap">個人 API Key（不等於網站登入密碼）<input id="mcKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="本次使用；不會自動保存" /></label>
      </div>
      <div class="masa-chat-actions" id="mcKeyActions"><a id="mcDocs" class="masa-chat-link" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">申請／查看官方 API Key</a><button id="mcToggleVault" type="button">🔐 本裝置加密金鑰</button></div>
      <details id="mcVault" hidden><summary>僅此裝置保存加密的 API Key（需要每次解鎖）</summary>
        <p class="masa-chat-hint">僅儲存 AES-GCM 加密後的 API Key；不儲存 AI 網站帳密、密語或聊天內容。非 HTTPS／無 Web Crypto 無法使用。清除網站資料後金鑰也會消失。</p>
        <label>加密密語（至少 12 字；不是 AI 網站密碼）<input id="mcPassphrase" type="password" autocomplete="off" placeholder="每次開啟需要再輸入" /></label>
        <div class="masa-chat-actions"><button id="mcSaveKey" type="button">加密保存目前金鑰</button><button id="mcUnlockKey" type="button">解鎖已保存金鑰</button><button id="mcDeleteKey" type="button" class="danger">刪除此裝置的金鑰</button></div>
      </details>
      <label id="mcConsentLabel" class="masa-chat-consent"><input id="mcConsent" type="checkbox" /> 我確認只把本次聊天文字傳到所選 AI 服務，不包含帳密、個資、公司機密及未核准工程資料。</label>
      <p id="mcApiHint" class="masa-chat-hint"></p>
    </div>
    <div class="masa-chat-log" id="mcLog" role="log" aria-live="polite" aria-relevant="additions text"></div>
    <form id="mcForm" class="masa-chat-compose">
      <label for="mcInput" class="sr-only">輸入問題</label><textarea id="mcInput" maxlength="3600" rows="3" placeholder="輸入問題…（Enter 送出；Shift+Enter 換行）"></textarea>
      <button type="submit" id="mcSend">複製問題並開啟</button>
    </form>
    <div class="masa-chat-actions"><button type="button" id="mcNew">＋新對話</button><button type="button" id="mcCancel" hidden>停止回覆</button><button type="button" id="mcCopy">複製本次對話</button></div>
    <p id="mcStatus" class="masa-chat-status" role="status" aria-live="polite"></p>
    <p class="masa-chat-warning">⚠️ AI 僅供人工輔助，不代表原廠診斷。工程 STOP 一律不呼叫內建 AI API。手機須連網才能使用雲端；本機知識庫與規則查修可離線。API Key 在呼叫時仍必須傳送給供應商，瀏覽器端無法提供伺服器級密鑰防護。</p>`;
  main.append(section);
  const $=id=>section.querySelector('#'+id);
  const pick=$('mcProvider'),scope=$('mcScope'),model=$('mcModel'),key=$('mcKey'),input=$('mcInput'),form=$('mcForm'),log=$('mcLog'),status=$('mcStatus');
  let turns=[],decision=null,busy=false,aborter=null,epoch=0;
  function notice(message){const item=document.createElement('div');item.className='masa-chat-msg notice';const bubble=document.createElement('div');bubble.className='masa-chat-bubble';bubble.textContent=message;item.append(bubble);log.append(item);log.scrollTop=log.scrollHeight;}
  function bubble(role,content){const item=document.createElement('div');item.className='masa-chat-msg '+(role==='user'?'user':'assistant');const who=document.createElement('span');who.className='masa-chat-who';who.textContent=role==='user'?'你':(engine.PROVIDERS[pick.value]?.label||'AI');const body=document.createElement('div');body.className='masa-chat-bubble';body.textContent=content;item.append(who,body);log.append(item);log.scrollTop=log.scrollHeight;return body;}
  function currentApi(){return engine.PROVIDERS[pick.value];}
  function site(){return pick.value.startsWith('site:')?engine.SITES[pick.value.slice(5)]:null;}
  function blocked(){return decision?.decision?.state==='STOP';}
  function setBusy(value){busy=value;$('mcSend').disabled=value;$('mcCancel').hidden=!value;pick.disabled=value;scope.disabled=value;model.disabled=value;key.disabled=value;if(value)status.textContent='AI 正在回覆…';}
  function reset(message){epoch++;aborter?.abort();aborter=null;setBusy(false);turns=[];log.replaceChildren();notice(message||'新對話已建立。不同 AI 服務的對話不會自動互傳。');}
  function render(){
    const conf=currentApi(),web=site();
    $('mcWebsite').hidden=!web;$('mcApiPanel').hidden=!conf;
    if(web){$('mcSiteLink').href=web.url;$('mcSiteLink').textContent='開啟 '+web.label;$('mcSiteHint').textContent='使用官方登入：'+web.label+'。首次需手動登入，之後由瀏覽器工作階段決定是否免登入。';}
    if(conf){model.replaceChildren();for(const v of conf.models){const o=document.createElement('option');o.value=v;o.textContent=v;model.append(o);}const needing=conf.requiresKey;$('mcKeyWrap').hidden=!needing;$('mcKeyActions').hidden=!needing;$('mcVault').hidden=true;$('mcConsentLabel').hidden=conf.type!=='api';$('mcDocs').href=conf.docs;
      $('mcApiHint').textContent=conf.type==='local'?(pick.value==='ollama'?'Ollama 限此電腦 127.0.0.1，手機無法連到 Windows 的 localhost。':'Chrome 內建模型只支援符合條件的電腦版瀏覽器；手機不支援。'):'使用自己申請的 API Key；免費額度依帳號方案和目前供應商規定，付費 API 方案可能產生費用。直連可能受 CORS 政策限制。';
    }
    $('mcSend').textContent=web?'複製問題並開啟':'傳送訊息';
  }
  function open(){section.hidden=false;section.scrollIntoView({block:'start'});}
  const openButton=document.createElement('button');openButton.type='button';openButton.id='fieldChatQuick';openButton.textContent='💬 多家 AI 聊天室';openButton.addEventListener('click',open);
  document.getElementById('fieldAgentQuick')?.insertAdjacentElement('afterend',openButton);
  for(const nav of document.querySelectorAll('.sidebar .nav,.mobile-nav')){const b=document.createElement('button');b.type='button';b.textContent='💬 多家 AI 聊天室';b.addEventListener('click',open);nav.prepend(b);}
  const agent=document.getElementById('masaAgentWorkspace');
  agent?.addEventListener('masa-agent-decision',event=>{decision=event.detail;if(blocked())status.textContent='STOP｜本次工程查修已由本機安全閘門阻擋。';});
  agent?.addEventListener('masa-agent-reset',()=>{decision=null;});
  pick.addEventListener('change',()=>{key.value='';$('mcPassphrase').value='';$('mcConsent').checked=false;reset('已切換服務。對話歷史不會送給新的供應商。');render();});
  scope.addEventListener('change',()=>reset('已切換用途；對話已清空，工程查修模式需先完成規則 Agent。'));
  $('mcNew').addEventListener('click',()=>reset());
  $('mcCancel').addEventListener('click',()=>{epoch++;aborter?.abort();aborter=null;setBusy(false);status.textContent='已取消。部分雲端 API 可能已收到取消前的輸入。';});
  $('mcCopy').addEventListener('click',async()=>{const str=turns.map(t=>(t.role==='user'?'你':'AI')+'：'+t.content).join('\n\n');if(!str){status.textContent='目前沒有可複製的對話。';return;}try{await navigator.clipboard.writeText(str);status.textContent='已複製本次對話。';}catch{status.textContent='瀏覽器拒絕複製，請檢查剪貼簿權限。';}});
  $('mcToggleVault').addEventListener('click',()=>{$('mcVault').hidden=!$('mcVault').hidden;});
  $('mcSaveKey').addEventListener('click',async()=>{const p=pick.value,pass=$('mcPassphrase');try{if(!key.value.trim())throw Error('請先輸入 API Key。');const encrypted=await vault.encrypt(key.value.trim(),pass.value);localStorage.setItem(vault.storageKey(p),encrypted);pass.value='';status.textContent='僅在此瀏覽器保存加密的 '+p+' API Key。下次需輸入加密密語解鎖。';}catch(e){status.textContent=e.message;pass.value='';}});
  $('mcUnlockKey').addEventListener('click',async()=>{const pass=$('mcPassphrase');try{const encrypted=localStorage.getItem(vault.storageKey(pick.value));if(!encrypted)throw Error('此裝置尚未保存這個服務的 API Key。');key.value=await vault.decrypt(encrypted,pass.value);status.textContent='已於本次頁面解鎖 API Key（僅放在記憶體／輸入欄）。';}catch(e){status.textContent=e.message;}finally{pass.value='';}});
  $('mcDeleteKey').addEventListener('click',()=>{localStorage.removeItem(vault.storageKey(pick.value));$('mcPassphrase').value='';key.value='';status.textContent='已刪除此裝置已保存的 API Key。';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const question=input.value.trim();const chosen=pick.value,web=site(),conf=currentApi();
    if(!question&&!web){status.textContent='請輸入問題。';return;}
    if(web){
      // Browser popup and password manager run in official origin, never under MASA.
      const link=$('mcSiteLink');
      // Open synchronously during the tap so Android browsers do not block it after clipboard permission awaits.
      window.open(link.href,'_blank','noopener,noreferrer');
      if(question){try{await navigator.clipboard.writeText(question);status.textContent='問題已複製；貼到官方聊天室即可。';}catch{status.textContent='剪貼簿未授權，請自行複製輸入的問題。';}}
      return;
    }
    if(blocked()){status.textContent='STOP：目前工程安全規則已阻擋 MASA AI 問答。';return;}
    if(scope.value==='diagnostic'&&!decision){status.textContent='工程模式需要先執行「AI 查修 Agent」，完成本機規則判讀。';return;}
    if(conf?.type==='api'&&!$('mcConsent').checked){status.textContent='請先確認並勾選同意傳送文字到指定 AI 服務。';return;}
    if(conf?.requiresKey&&!key.value.trim()){status.textContent='請先輸入或解鎖這個服務的 API Key。';return;}
    const t={role:'user',content:question};turns.push(t);bubble('user',question);input.value='';setBusy(true);const serial=++epoch;aborter=new AbortController();
    try{
      const reply=await engine.send({provider:chosen,key:key.value,model:model.value,turns,scope:scope.value,context:scope.value==='diagnostic'?decision:null,signal:aborter.signal});
      if(serial!==epoch)return;
      turns.push({role:'assistant',content:reply.text});bubble('assistant',reply.text);status.textContent=reply.provider+' · '+reply.model+'｜完成；未儲存聊天紀錄。';
    }catch(error){if(serial===epoch){turns.pop();const display=error?.name==='AbortError'?'已取消。':error.message;notice('未完成：'+display);status.textContent=display;}}
    finally{if(serial===epoch){aborter=null;setBusy(false);if(status.textContent==='')status.textContent='回覆完成。';}}
  });
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
  reset('歡迎使用 MASA AI Agent。可選「官方網站沿用原帳號」，或以個人 API Key 在此直接聊天。');render();
})();
