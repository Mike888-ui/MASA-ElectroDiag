/* Per-device encrypted API-key store. No passwords, remote sync, or auto-unlock. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MASA_AI_VAULT=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const PREFIX='masa.electrodiag.ai-key.enc.v1.';
  function encode(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes)));}
  function decode(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
  async function derive(passphrase,salt,cryptoObj){
    const seed=await cryptoObj.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
    return cryptoObj.subtle.deriveKey({name:'PBKDF2',salt,iterations:220000,hash:'SHA-256'},seed,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encrypt(secret,passphrase,cryptoObj=globalThis.crypto){
    if(!cryptoObj?.subtle||!cryptoObj?.getRandomValues)throw Error('需要 HTTPS 安全環境與 Web Crypto。');
    if(typeof secret!=='string'||!secret||secret.length>1024)throw Error('金鑰格式錯誤。');
    if(typeof passphrase!=='string'||passphrase.length<12)throw Error('本機加密密語至少 12 字；不可與 AI 帳號密碼相同。');
    const salt=cryptoObj.getRandomValues(new Uint8Array(16)),iv=cryptoObj.getRandomValues(new Uint8Array(12));
    const aes=await derive(passphrase,salt,cryptoObj);
    const ciphertext=await cryptoObj.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(secret));
    return JSON.stringify({v:1,s:encode(salt),i:encode(iv),c:encode(ciphertext)});
  }
  async function decrypt(payload,passphrase,cryptoObj=globalThis.crypto){
    if(!cryptoObj?.subtle)throw Error('此裝置不支援加密解鎖。');
    let parsed;try{parsed=JSON.parse(payload);}catch{throw Error('本機金鑰資料損毀。');}
    if(parsed?.v!==1||!['s','i','c'].every(x=>typeof parsed[x]==='string'))throw Error('加密格式不支援。');
    try{const aes=await derive(passphrase,decode(parsed.s),cryptoObj);const pt=await cryptoObj.subtle.decrypt({name:'AES-GCM',iv:decode(parsed.i)},aes,decode(parsed.c));return new TextDecoder().decode(pt);}
    catch{throw Error('解鎖失敗：密語不正確或加密資料損毀。');}
  }
  function storageKey(provider){if(!/^[a-z]{3,20}$/.test(provider))throw Error('無效的供應商代碼。');return PREFIX+provider;}
  return {PREFIX,encrypt,decrypt,storageKey};
});
