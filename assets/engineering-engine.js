/* Offline evidence and safety engine. No hardware telemetry or unsafe bypass instructions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MASA_ENGINE=api})(typeof window!=='undefined'?window:globalThis,function(){
  const safety='STOP → ISOLATE → LOTO → VERIFY ZERO ENERGY；檢查 Stored Energy / DC Bus Discharge。帶電檢查僅限受訓人員使用適當 PPE 與 CAT Rating 儀表。不得繞過 E-Stop／Safety Relay／STO。';
  const offModes=new Set(['resistance','continuity','diode','capacitance','insulation','pcb_resistance','winding_resistance','coil_resistance']);
  function safetyGate(x){const reasons=[];const mode=String(x.mode||'').toLowerCase(),target=String(x.target||'').toLowerCase();if(/bypass|short.*safety|短接|跨接/.test(mode))reasons.push('禁止旁路安全功能');
    if(offModes.has(mode)||mode==='dc_bus'){if(x.equipmentEnergized!==false)reasons.push('STOP：設備必須斷電並隔離');if(x.loto!==true)reasons.push('執行 LOTO');if(x.zeroVerified!==true)reasons.push('驗證零能量');if(x.storedEnergyDischarged!==true)reasons.push('放電並確認 Stored Energy／DC Bus');if(mode==='insulation'&&/vfd|servo|plc|encoder|pcb|drive|變頻|伺服|編碼器|電路板/.test(target))reasons.push('絕緣測試器不得直接接驅動器／PLC／Encoder／PCB')}
    if(mode==='live_voltage'||mode==='live_current'||mode==='dc_bus'){if(x.trained!==true)reasons.push('僅受訓人員可執行帶電量測');if(x.catRated!==true)reasons.push('確認儀表 CAT Rating');if(x.ppe!==true)reasons.push('確認 PPE')}
    return {allowed:reasons.length===0,stop:reasons.length>0,reasons,safety};
  }
  const n=x=>typeof x==='number'&&Number.isFinite(x)?x:typeof x==='string'&&x.trim()!==''&&Number.isFinite(Number(x))?Number(x):null;
  const yes=x=>x===true||x==='ON'||x==='true';
  const no=x=>x===false||x==='OFF'||x==='false';
  const close=(v,target,p=.15)=>n(v)!==null&&n(target)!==null&&n(target)>0&&Math.abs(n(v)-n(target))<=n(target)*p;
  function diagnose(input){const x=input||{},forEvidence=[],against=[],missing=[];let finding='資訊不足，尚不能判定',next='補齊銘牌、圖面與安全可取得的量測',repair='完成證據鏈前不建議更換元件';let matched=false;
    const have=(key,label)=>{if(x[key]===undefined||x[key]===null||x[key]===''){missing.push(label||key);return false}return true};
    const mark=(condition,text)=>{if(condition)forEvidence.push(text);else against.push(text)};
    switch(x.kind){
    case 'motor_phase':{
      if(!['voltageRS','voltageST','voltageTR','currentR','currentS','currentT'].every(k=>have(k,k)))break;
      const v=[n(x.voltageRS),n(x.voltageST),n(x.voltageTR)],i=[n(x.currentR),n(x.currentS),n(x.currentT)];if([...v,...i].some(z=>z===null||z<0)){missing.push('量測值須為非負數');break}
      const refV=Math.max(v[0],v[2]),refI=Math.max(i[0],i[2]);mark(refV>0&&v[0]>refV*.7&&v[2]>refV*.7,'R-S 與 T-R 相對於其他線間讀值仍存在');mark(refV>0&&v[1]<refV*.1,'S-T 相對電壓缺失');mark(refI>0&&i[1]<refI*.1,'S 相電流近零');mark(refI>0&&Math.abs(i[0]-i[2])<refI*.25,'R 與 T 相電流相近');
      if(forEvidence.length>=3&&against.length<=1){finding='S 相缺相／開路';matched=true;next='停機隔離後查 S Fuse、MCCB S 極、MC L2-T2、OL S 相、端子及 Cable；注意回灌電壓';repair='確認開路點與根因後，依額定更換故障元件或修復線路'}else{finding='未證實 S 相缺相';next='核對量測位置、相序、回灌和三相負載條件';matched=true}break}
    case 'contactor':{
      if(!['ratedCoil','coilVoltage','command'].every(k=>have(k,k)))break;
      const rated=n(x.ratedCoil),cv=n(x.coilVoltage);if(!(rated>0)||cv===null){missing.push('有效線圈銘牌／實測電壓');break}
      mark(yes(x.command),'控制命令存在');
      if(yes(x.command)&&cv<rated*.1){mark(true,'A1-A2 幾乎沒有線圈電壓');finding='線圈控制鏈無電壓';next='依圖面查 PB／PLC、Safety、OL 95-96、Interlock、A1-A2；禁止短接安全回路';repair='定位斷點並修復控制電源或接線';matched=true}
      else if(yes(x.command)&&close(cv,rated)&&no(x.mechanicalClosed)){mark(true,'A1-A2 接近銘牌額定');mark(true,'機械鐵心未吸合');finding='線圈／機械機構異常';next='停電後查線圈、鐵心卡滯與原廠線圈規格';repair='按型號修復或更換接觸器';matched=true}
      else if(yes(x.command)&&close(cv,rated)&&yes(x.mechanicalClosed)&&n(x.inputL2)>0&&n(x.outputT2)!==null&&n(x.outputT2)<n(x.inputL2)*.1){mark(true,'接觸器已吸合且 L2 有輸入');mark(true,'T2 輸出相對 L2 缺失');finding='接觸器單極不導通';next='停電後查 L2-T2 主接點、端子及熱損傷';repair='依額定與原廠規格更換故障接點／接觸器';matched=true}
      else{finding='線圈／主接點證據不足';next='補充 A1-A2、L1/L2/L3、T1/T2/T3、13-14、21-22、95-96 狀態';matched=true}break}
    case 'psu':{
      if(!['ratedVoltage','noLoadVoltage','loadVoltage'].every(k=>have(k,k)))break;const rated=n(x.ratedVoltage),nl=n(x.noLoadVoltage),l=n(x.loadVoltage);if(!(rated>0)||nl===null||l===null)break;mark(close(nl,rated),'空載電壓接近實際銘牌額定');mark(l<nl*.85,'帶載比空載下降超過比較門檻（非產品容差）');mark(l<rated*.85,'帶載顯著低於銘牌額定');finding=forEvidence.length>=3?'24V 帶載掉壓':'供電資料未能證實帶載掉壓';next='停電隔離可疑負載，核對總電流、接線壓降與 PSU 額定／Datasheet';repair='排除過載／短路後再評估 PSU';matched=true;break}
    case 'plc_di':{
      if(!['sensorPower','sensorOutput','plcInput'].every(k=>have(k,k)))break;mark(yes(x.sensorPower),'Sensor 有供電');mark(yes(x.sensorOutput),'Sensor Output 動作');mark(no(x.plcInput),'PLC DI 未切換');finding=forEvidence.length===3?'PLC DI 端或 COM／配線異常':'PLC DI 訊號鏈尚未定位';next='核對 NPN/PNP、Sensor OUT、Cable、Terminal、DI COM、模組與程式位址';repair='確認斷點後修復；不得以 LED 單獨證明輸出';matched=true;break}
    case 'plc_do':{
      if(!['led','commonPower','loadVoltage'].every(k=>have(k,k)))break;mark(yes(x.led),'PLC DO LED ON');mark(no(x.commonPower),'DO COM 供電缺失');mark(n(x.loadVoltage)===0,'負載端無輸出電壓');finding=forEvidence.length===3?'PLC DO 共用端供電異常':'PLC DO 輸出鏈尚未定位';next='按模組型式檢查 COM、保險絲、DO 端、負載線與負載兩端';repair='修復 COM 電源或線路；核對輸出型式／額定';matched=true;break}
    case 'vfd_oc':{
      if(!['stage','alarm','motorCurrentHigh'].every(k=>have(k,k)))break;mark(String(x.alarm).toUpperCase()==='OC','Alarm 類別為 OC');mark(yes(x.motorCurrentHigh),'電流／負載偏高（依銘牌判斷）');const stages={power_on:['VFD 上電過電流','隔離後查整流／功率級與外部短路'],acceleration:['VFD 加速過電流','查加速時間、負載卡滯、馬達及輸出配線'],constant:['VFD 定速過電流','查持續負載、馬達額定、冷卻及供電'],deceleration:['VFD 減速過電流','查減速時間、再生能量與煞車單元']};const s=stages[x.stage];if(s&&forEvidence.length===2){mark(true,'OC 發生時機：'+x.stage);finding=s[0];next=s[1];repair='依原廠 Alarm 手冊確認根因再調整／修復'}else{finding='VFD Alarm 證據不足';next='讀取故障碼、發生時機、供電與負載'}matched=true;break}
    case 'servo_ready':{
      if(!['acPower','dcBusReady','stoHealthy','alarm'].every(k=>have(k,k)))break;mark(yes(x.acPower),'AC 供電存在');mark(yes(x.dcBusReady),'DC Bus Ready 指示成立');mark(no(x.stoHealthy),'STO 未就緒');mark(no(x.alarm),'驅動器無其他 Alarm');finding=forEvidence.length===4?'Servo STO 未就緒':'Servo Ready 鏈需補證據';next='依原廠手冊和安全電路圖查 STO 狀態，不得旁路';repair='由合格人員查安全鏈，禁止短接 STO';matched=true;break}
    case 'pcb_rail':{
      if(!['inputReady','rail12','rail5','rail3v3','expected3v3'].every(k=>have(k,k)))break;mark(yes(x.inputReady),'輸入電源存在');mark(n(x.rail12)>0&&n(x.rail5)>0,'12V／5V Rail 存在');mark(n(x.expected3v3)>0&&n(x.rail3v3)!==null&&n(x.rail3v3)<n(x.expected3v3)*.1,'3.3V Rail 近零（相對標稱）');finding=forEvidence.length===3?'PCB 3.3V Rail 缺失':'PCB Rail 資料不足';next='斷電放電後查上游 Regulator Enable、短路與負載；在板量測受並聯影響';repair='定位根因後依 Datasheet 修復電源級';matched=true;break}
    case 'mosfet':{
      if(!['powerOff','drainSourceShort','gateLeakage'].every(k=>have(k,k)))break;mark(yes(x.powerOff),'已隔離供電（仍需 LOTO／放電／驗電）');mark(yes(x.drainSourceShort),'D-S 雙向疑似短路');mark(no(x.gateLeakage),'未觀察到 Gate 漏電');finding=forEvidence.length===3?'MOSFET D-S 疑似短路':'MOSFET 在板判定不充分';next='確認 D/G/S 腳位與 Body Diode；隔離並依 Datasheet 複測';repair='查驅動／負載過應力後再更換同規格元件';matched=true;break}
    default:missing.push('選擇診斷類別');
    }
    const score=forEvidence.length,confidence=matched&&!missing.length?(score>=3&&against.length<=1?'High':score>=2?'Medium':'Low'):'Low';
    return {finding,confidence,scoreBasis:`支持 ${score} 項／反證 ${against.length} 項／缺少 ${missing.length} 項`,evidenceFor:forEvidence,evidenceAgainst:against,missingInformation:missing,nextMeasurement:next,safety,repairSuggestion:repair,sourceType:'MANUAL INPUT / SIMULATION'};
  }
  const aliases={'馬達不轉':'motor','馬達很燙':'motor','三相不平衡':'phase','MC 不吸':'contactor','MC 抖動':'contactor','接點黏死':'contactor','Fuse 一直燒':'fuse','MCCB 一直跳':'mccb','PLC 有燈沒輸出':'plc','Sensor 有燈 PLC 沒訊號':'sensor','24V 掉壓':'24v','VFD OC':'vfd','VFD OV':'vfd','Servo Not Ready':'servo','Encoder Alarm':'encoder','4-20mA 0mA':'4-20','RS485 Error':'rs485','PCB No Power':'pcb','MOSFET Short':'mosfet'};
  function search(query,components=[],faultTrees=[],measurements=[],repairCases=[]){const q=String(query||'').trim().toLowerCase(),alternate=(aliases[query]||'').toLowerCase();const match=x=>!q||JSON.stringify(x).toLowerCase().includes(q)||(alternate&&JSON.stringify(x).toLowerCase().includes(alternate));return {components:components.filter(match),faultTrees:faultTrees.filter(match),measurements:measurements.filter(match),repairCases:repairCases.filter(match)}}
  return {diagnose,safetyGate,search,safety};
});
