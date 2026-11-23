/* Android native wrapper only. No permission or credential handling in a remote page. */
(()=>{
 'use strict';
 if(!window.MASA_NATIVE || !/MASA_ANDROID_OFFLINE\/1\.4\.4/.test(navigator.userAgent))return;
 const native=window.MASA_NATIVE;
 const originalOpen=window.open.bind(window);
 window.open=(url,target,features)=>{
   if(typeof url==='string' && /^https:\/\//i.test(url)){
     native.openExternal(url);
     return null;
   }
   return originalOpen(url,target,features);
 };
 async function saveLocalBlob(anchor){
   try{
     const response=await fetch(anchor.href);
     const blob=await response.blob();
     if(blob.size>20*1024*1024)throw Error('檔案超過手機匯出限制 20 MB');
     const reader=new FileReader();
     reader.onload=()=>{
       const encoded=String(reader.result||'').split(',')[1];
       native.saveDownload(anchor.download||'masa-export',blob.type||'application/octet-stream',encoded||'');
     };
     reader.readAsDataURL(blob);
   }catch(error){alert('手機匯出失敗：'+error.message)}
 }
 const originalClick=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(...args){
   // Original MASA exports use detached <a download>. Delegated clicks do not
   // see these, so intercept the DOM API itself only inside native APK.
   if(this.hasAttribute('download') && /^(blob:|data:)/.test(this.href)){
     saveLocalBlob(this);return;
   }
   return originalClick.apply(this,args);
 };
 document.addEventListener('click',e=>{
   const anchor=e.target.closest('a');
   if(!anchor)return;
   if(anchor.hasAttribute('download') && /^(blob:|data:)/.test(anchor.href)){
     e.preventDefault();saveLocalBlob(anchor);return;
   }
   if(/^https:\/\//i.test(anchor.href) && !anchor.href.startsWith('https://appassets.androidplatform.net/')){
     e.preventDefault();
     native.openExternal(anchor.href);
   }
 },true);
})();
