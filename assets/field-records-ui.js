/* Local record exchange. Review every conflict before a transaction is committed. */
(()=>{'use strict';const API=window.MASA_FIELD_RECORDS;if(!API)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host=document.createElement('aside');host.id='fieldRecordsPanel';host.hidden=true;host.style.cssText='position:fixed;z-index:10000;inset:8% 3% auto auto;width:min(550px,94vw);max-height:82vh;overflow:auto;background:#071928;color:#e8faff;border:1px solid #27bfd6;border-radius:12px;padding:16px;box-shadow:0 12px 40px #000b';
const toggle=document.createElement('button');toggle.id='fieldRecordsToggle';toggle.textContent='現場紀錄 匯出／匯入';toggle.style.cssText='position:fixed;z-index:9999;right:12px;bottom:12px;padding:12px;background:#07394b;color:#e8faff;border:1px solid #27bfd6;border-radius:8px;min-height:44px';toggle.onclick=()=>{host.hidden=!host.hidden;render()};document.body.append(toggle,host);
let pending=null,conflicts=[];function render(){host.innerHTML=`<h3>FIELD RECORDS｜離線紀錄</h3><p>設備、維修、照片與診斷資料保存在此瀏覽器；匯入前逐筆審查衝突。</p><button id="fieldRecordsClose">關閉</button> <button id="fieldRecordsExport">EXPORT FIELD RECORDS</button><p><label>IMPORT FIELD RECORDS ZIP <input id="fieldRecordsImport" type="file" accept=".zip,application/zip"></label></p><div id="fieldRecordsStatus" role="status"></div><div id="fieldRecordsConflicts"></div>`;host.querySelector('#fieldRecordsClose').onclick=()=>host.hidden=true;host.querySelector('#fieldRecordsExport').onclick=exportRecords;host.querySelector('#fieldRecordsImport').onchange=importRecords}
function status(s){host.querySelector('#fieldRecordsStatus').textContent=s}
async function exportRecords(){
 const button=host.querySelector('#fieldRecordsExport');
 if(button.disabled)return;
 button.disabled=true;
 try{
   const blob=new Blob([await API.make(await API.snapshot())],{type:'application/zip'});
   const capacitor=window.Capacitor;
   if(capacitor?.getPlatform?.()==='android'){
     if(blob.size>16*1024*1024)throw Error('超過 Android 單次匯出上限 16 MB；請保留原紀錄，改分批整理照片。');
     const archive=capacitor.Plugins?.LocalArchive;
     if(!archive?.saveZip)throw Error('Android ZIP 儲存功能未載入。');
     const base64=await new Promise((resolve,reject)=>{
       const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);
       reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
     });
     const result=await archive.saveZip({base64});
     status(result.saved?'紀錄 ZIP 已儲存。':'已取消匯出。');
   }else{
     const url=URL.createObjectURL(blob),a=document.createElement('a');
     a.href=url;a.download='MASA_FIELD_RECORDS.zip';a.click();
     setTimeout(()=>URL.revokeObjectURL(url),5000);
     status('已送出 ZIP 下載，請確認檔案已儲存。');
   }
 }catch(e){status('匯出失敗：'+e.message)}
 finally{button.disabled=false;}
}
async function importRecords(e){pending=null;conflicts=[];const file=e.target.files[0];if(!file)return;try{pending=await API.verify(await file.arrayBuffer());conflicts=API.plan(pending,await API.snapshot());const area=host.querySelector('#fieldRecordsConflicts');area.innerHTML=`<p>驗證通過。${Object.entries(pending.manifest.counts).map(([k,v])=>`${esc(k)} ${v}`).join('；')}；衝突 ${conflicts.length} 筆。</p>`+conflicts.map((c,i)=>`<label style="display:block;padding:8px;border-top:1px solid #315569">${esc(c.store)} / ${esc(c.id)}<br><small>本機：${esc(c.windows.updatedAt||c.windows.createdAt||'—')}；匯入：${esc(c.field.updatedAt||c.field.createdAt||'—')}</small><select data-conflict="${i}" style="display:block;min-height:44px"><option value="">請選擇處理方式</option><option value="KEEP_WINDOWS">保留本機</option><option value="KEEP_FIELD">採用匯入紀錄</option><option value="CREATE_COPY">建立副本</option></select></label>`).join('')+'<button id="fieldRecordsCommit">確認並寫入本機</button>';area.querySelector('#fieldRecordsCommit').onclick=commit;status('匯入資料尚未寫入。')}catch(err){status('匯入遭拒：'+err.message)}}
async function commit(){try{const choices={};for(const select of host.querySelectorAll('[data-conflict]')){const c=conflicts[Number(select.dataset.conflict)];choices[`${c.store}:${c.id}`]=select.value}if(conflicts.some(c=>!choices[`${c.store}:${c.id}`]))throw Error('請逐筆選擇衝突處理方式');const result=await API.apply(pending,choices);status(`匯入完成：${result.status}；衝突已審查 ${result.conflicts} 筆。重新載入畫面以檢視。`);pending=null;host.querySelector('#fieldRecordsConflicts').innerHTML='<button id="fieldRecordsReload">重新載入</button>';host.querySelector('#fieldRecordsReload').onclick=()=>location.reload()}catch(e){status('未寫入：'+e.message)}}
})();
