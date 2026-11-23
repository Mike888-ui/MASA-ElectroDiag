/* Optional AI view: no persisted API key, no implicit upload, no AI-owned equipment actions. */
(() => {
  'use strict';
  const workspace=document.getElementById('masaAgentWorkspace');
  const backend=window.MASA_FREE_AI;
  if(!workspace || !backend) return;
  const panel=document.createElement('section');
  panel.className='v1-panel';
  panel.id='masaFreeAI';
  panel.innerHTML=`
    <h3>✨ 免費生成式 AI｜輔助判讀（選用）</h3>
    <p class="v1-note">必須先執行上方「規則查修 Agent」。生成式 AI 只能整理候選原因，不具原廠認證，不能操作設備。手機斷網仍可用上方規則 Agent；下列模式各有條件。</p>
    <div class="v1-grid">
      <label>AI 模式
        <select id="masaFreeProvider">
          <option value="gemini">Gemini 免費額度｜需要網路及自己的 API Key</option>
          <option value="ollama">Ollama 免費本機模型｜只適用有安裝的電腦</option>
          <option value="chrome">Chrome 內建 AI｜支援裝置端模型後可離線</option>
        </select>
      </label>
      <label id="masaGeminiKeyWrap">自己的 Gemini API Key（不儲存、不寫入紀錄）
        <input id="masaGeminiKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="僅本次呼叫使用">
      </label>
      <label id="masaGeminiModelWrap">Gemini 模型
        <select id="masaGeminiModel"><option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option><option value="gemini-2.5-flash">Gemini 2.5 Flash</option></select>
      </label>
      <label id="masaOllamaWrap" hidden>本機 Ollama 模型名稱
        <input id="masaOllamaModel" value="qwen2.5:3b" maxlength="60" spellcheck="false">
      </label>
    </div>
    <p id="masaProviderAdvice" class="v1-note"></p>
    <label id="masaCloudConsentWrap"><input id="masaCloudConsent" type="checkbox"> 我確認僅傳送本次人工輸入與已列出的工程知識索引，不含機密、個資或內網憑證，並同意傳給 Google Gemini。</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button id="masaAskFreeAI" type="button" disabled>先執行規則 Agent</button>
      <button id="masaFreeAICopy" type="button" hidden>複製 AI 文字</button>
    </div>
    <p id="masaFreeAIStatus" role="status" aria-live="polite"></p>
    <pre id="masaFreeAIResult" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:28rem;overflow:auto" hidden></pre>
    <p class="v1-note">安全閘門優先：規則 Agent 顯示 STOP 時，生成式 AI 呼叫一律禁止。Gemini 免費額度可能有配額限制；API Key 僅存在本頁輸入欄／當次請求中，網頁端金鑰仍可能遭裝置上的惡意軟體或擴充功能讀取。建議僅個人測試，不要輸入公司機密。AI 回覆不自動儲存或加入原廠證據。</p>`;
  const history=workspace.querySelector('#masaAgentHistory');
  if(history) workspace.insertBefore(panel,history);
  else workspace.append(panel);
  const get=id=>panel.querySelector('#'+id);
  const provider=get('masaFreeProvider'),button=get('masaAskFreeAI'),copy=get('masaFreeAICopy');
  const status=get('masaFreeAIStatus'),result=get('masaFreeAIResult'),key=get('masaGeminiKey');
  let current=null,active=false,serial=0,controller=null,lastText='';
  const notes={
    gemini:'Gemini：需要連網與 Google AI Studio 申請的個人 API Key。用量超出免費額度可能收到 429，請自行確認 API 專案是否為免費方案。',
    ollama:'Ollama：Windows 電腦上安裝 Ollama，先執行 ollama pull qwen2.5:3b，再啟動服務；如從 HTTPS 網站操作，需允許該網站的 CORS 來源。手機 127.0.0.1 是手機自己，不是 Windows。',
    chrome:'Chrome 內建 AI：目前僅部分桌面版 Chrome 支援，模型可能首次需要網路下載，下載後才可能離線；Android／iPhone 瀏覽器不支援此模式。'
  };
  function clearOutput(){lastText='';result.textContent='';result.hidden=true;copy.hidden=true;}
  function draw(){
    const p=provider.value;
    get('masaGeminiKeyWrap').hidden=get('masaGeminiModelWrap').hidden=get('masaCloudConsentWrap').hidden=(p!=='gemini');
    get('masaOllamaWrap').hidden=p!=='ollama';
    get('masaProviderAdvice').textContent=notes[p];
    button.disabled=!current || current.decision?.state==='STOP' || active;
    button.textContent=active?'AI 產生中…':'以免費 AI 整理查修建議';
    if(current?.decision?.state==='STOP'){status.textContent='STOP｜安全閘門禁止生成式 AI';}
  }
  function invalidate(){serial++;controller?.abort();controller=null;active=false;current=null;status.textContent='請先完成本機規則判讀。';clearOutput();draw();}
  workspace.addEventListener('masa-agent-reset',invalidate);
  workspace.addEventListener('masa-agent-decision',event=>{serial++;controller?.abort();controller=null;active=false;current=event.detail;clearOutput();status.textContent='規則判讀完成。可選擇是否呼叫免費 AI。';draw();});
  provider.addEventListener('change',()=>{serial++;controller?.abort();controller=null;active=false;clearOutput();status.textContent='已切換 AI 模式。';draw();});
  button.addEventListener('click',async()=>{
    if(!current || active || current.decision?.state==='STOP') return;
    const request=++serial;
    const mode=provider.value;
    if(mode==='gemini' && !get('masaCloudConsent').checked){status.textContent='先確認資料不含機密並勾選同意傳送。';return;}
    const apiKey=key.value;
    if(mode==='gemini' && !apiKey.trim()){status.textContent='請輸入自己的 Gemini API Key。';return;}
    active=true;controller=new AbortController();draw();clearOutput();
    status.textContent=mode==='chrome'?'正在確認並準備瀏覽器內建模型…':'正在請求 AI，請勿把回覆當成原廠判定…';
    // Do not keep secrets or generated output in localStorage, IndexedDB, or exported logs.
    const context=current;
    try {
      let outcome;
      if(mode==='gemini')outcome=await backend.askGemini(context,{key:apiKey,model:get('masaGeminiModel').value,signal:controller.signal});
      else if(mode==='ollama')outcome=await backend.askOllama(context,{model:get('masaOllamaModel').value,signal:controller.signal});
      else outcome=await backend.askChrome(context,{signal:controller.signal});
      if(request!==serial)return;
      lastText=outcome.provider+'｜生成式 AI 輔助建議，待人工驗證\n\n'+outcome.text;
      result.textContent=lastText;result.hidden=false;copy.hidden=false;
      status.textContent='已產生輔助建議｜不代表原廠確認，不會自動儲存';
    }catch(error){if(request===serial)status.textContent=error?.name==='AbortError'?'已取消 AI 請求':'未執行成功：'+(error?.message||'未知錯誤');}
    finally{if(request===serial){key.value='';controller=null;active=false;draw();}}
  });
  copy.addEventListener('click',async()=>{if(lastText){try{await navigator.clipboard.writeText(lastText);status.textContent='已複製 AI 文字，請核對後再使用。';}catch{status.textContent='複製失敗，請手動選取內容。';}}});
  draw();
})();
