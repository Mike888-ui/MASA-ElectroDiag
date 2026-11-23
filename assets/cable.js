/* Offline cable engineering estimates and manual evidence. Never represents a device link. */
(function(root,factory){const api=factory(root.MASA_ENGINE|| (typeof require==='function'?require('../assets/engineering-engine.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.MASA_CABLE=api})(typeof window!=='undefined'?window:globalThis,function(ENGINE){
 const SAFETY='STOP → ISOLATE → LOTO → VERIFY ZERO ENERGY；檢查回灌與 Stored Energy。絕緣測試前完全隔離 VFD／Servo／PLC／Sensor／Encoder／PCB。';
 const materials={copper:{rho:0.017241,alpha:0.00393},aluminum:{rho:0.028264,alpha:0.00403}}; // indicative 20°C reference, NOT an OEM rating
 const finitePositive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
 function safetyGate(x){const base=ENGINE.safetyGate(x),reasons=[...base.reasons],mode=String(x.mode||'').toLowerCase();
   if(['insulation','resistance','continuity','winding_resistance'].includes(mode)){
     if(x.allEndsIsolated!==true)reasons.push('隔離電纜兩端設備並核對回灌');
     if(mode==='insulation'&&x.electronicsIsolated!==true)reasons.push('隔離 VFD／Servo／PLC／Sensor／Encoder／PCB 等電子設備');
   }
   return {allowed:reasons.length===0,stop:reasons.length>0,reasons,safety:SAFETY};
 }
 function estimate(input){const {material,areaMm2,lengthM,temperatureC=20,currentA,voltageV,system='DC',powerFactor=1}=input||{},m=materials[material];
   if(!m||![areaMm2,lengthM,currentA,voltageV].every(finitePositive)||!Number.isFinite(temperatureC)||temperatureC< -40||temperatureC>150||!finitePositive(powerFactor)||powerFactor>1||!['DC','SINGLE_PHASE_AC','THREE_PHASE_AC'].includes(system))throw Error('輸入材料、截面、單程長度、電流、電壓、溫度及功率因數的有效值');
   const ohmsPerConductor=m.rho*lengthM/areaMm2*(1+m.alpha*(temperatureC-20));
   const factor=system==='THREE_PHASE_AC'?Math.sqrt(3):2;
   const dropV=factor*ohmsPerConductor*currentA*(system==='DC'?1:powerFactor);
   const lossW=(system==='THREE_PHASE_AC'?3:2)*currentA*currentA*ohmsPerConductor;
   return {ohmsPerConductor,dropV,dropPercent:100*dropV/voltageV,estimatedLoadV:voltageV-dropV,lossW,sourceType:'CALCULATED ESTIMATE',note:'僅導體 20°C 參考電阻與線性溫度估計；AC 忽略電抗、諧波、集膚效應與敷設條件；須與原廠／核准設計／實測及規範比對。',safety:SAFETY};
 }
 function diagnose(input){const x=input||{},forEvidence=[],against=[],missing=[];let finding='資料不足，尚不能定位故障段',next='填寫核准圖面、電路及相鄰測點',repair='不得僅憑估計結果更換電纜';
   const observed=(k,label,allowNegative=false)=>{if(typeof x[k]!=='number'||!Number.isFinite(x[k])||(!allowNegative&&x[k]<0)){missing.push(label||k);return false}return true};
   if(x.kind==='24v_drop'){
     const points=[['PSU Output','psu'],['Fuse Output','fuse'],['Distribution Terminal','distribution'],['Intermediate Terminal','intermediate'],['Load Terminal','load']];
     const seen=points.filter(([label,key])=>observed(key,label));
     if(seen.length>=2){const segments=[];for(let i=1;i<seen.length;i++)segments.push({from:seen[i-1][0],to:seen[i][0],dropV:x[seen[i-1][1]]-x[seen[i][1]],adjacent:points.findIndex(p=>p[1]===seen[i][1])-points.findIndex(p=>p[1]===seen[i-1][1])===1});
       const top=segments.filter(s=>s.adjacent).sort((a,b)=>b.dropV-a.dropV)[0];
       if(top&&top.dropV>0){finding=`最大實測壓降區段：${top.from} → ${top.to}`;forEvidence.push(`${top.from} 至 ${top.to} 差值 ${top.dropV.toFixed(3)} V（MANUAL INPUT）`);next=`查 ${top.from}／${top.to} 端子、保護與線纜；依核准設計確認容許壓降`;repair='斷電驗電後查鬆動、氧化及負載電流，查證後修復'}
       else if(top){finding='已取得相鄰測點，未定位正向壓降';against.push('相鄰測點無正向壓降');next='核對 0V 參考點、負載工況與測點方向'}
       else missing.push('至少兩個相鄰測點');
       if(seen.length<points.length)missing.push('其餘 SOURCE → LOAD 測點');
     }
     if(!observed('loadCurrent','Load Current')){} // no invented acceptable current threshold
   }else if(x.kind==='motor_path'){
     if(observed('mcOutput','MC T2 Output')&&observed('motorTerminal','Motor Terminal')){
       if(x.mcOutput>0&&x.motorTerminal<x.mcOutput*.1){finding='MC 輸出存在，馬達端缺相：電纜／端子路徑可疑';forEvidence.push('MC T2 有輸出','馬達端相對 MC T2 近零');next='隔離後依序查 OL 輸出、端子台、接頭、電纜與馬達端';repair='查明開路點後依核准圖面修復'}
       else{against.push('MC 至馬達端無明顯相對缺失');next='核對電壓參考點、回灌及負載運轉條件'}
     }
   }else if(x.kind==='thermal'){
     if(observed('ambient','Ambient',true)&&observed('terminal','Terminal',true)&&observed('cableSurface','Cable Surface',true)&&observed('loadCurrent','Load Current')){
       forEvidence.push(`端子與環境溫差 ${(x.terminal-x.ambient).toFixed(1)} °C`,`電纜與環境溫差 ${(x.cableSurface-x.ambient).toFixed(1)} °C`);
       if(x.terminal>x.cableSurface&&x.terminal>x.ambient){finding='端子較電纜表面熱：接點／壓接需檢查';next='停機隔離後檢查氧化、壓接、鬆動，對照負載與核准溫升規範'}else finding='溫度證據不足以定位熱點';
       missing.push('核准設計容許溫升與同工況參考');
     }
   }else missing.push('選擇診斷類型');
   const score=forEvidence.length,confidence=missing.length?'Low':score>=2&&against.length===0?'High':score>=1?'Medium':'Low';
   return {finding,confidence,scoreBasis:`支持 ${score} 項／反證 ${against.length} 項／缺少 ${missing.length} 項`,evidenceFor:forEvidence,evidenceAgainst:against,missingInformation:missing,nextMeasurement:next,possibleFaultSegment:finding.includes('區段')?finding:'未確定',repairSuggestion:repair,safety:SAFETY,sourceType:'MANUAL INPUT'};
 }
 return {safetyGate,estimate,diagnose,materials};
});
