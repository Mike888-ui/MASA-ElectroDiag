/* V1.4.4: keep exact desktop sidebar on mobile; drawer is only a viewport adaptation. */
(()=>{
 'use strict';
 const sidebar=document.querySelector('.sidebar');
 const root=document.querySelector('.app');
 if(!sidebar||!root)return;
 const bar=document.createElement('header');
 bar.className='masa-mobile-bar';
 bar.innerHTML='<button type="button" class="masa-menu-trigger" aria-controls="masaDesktopSidebar" aria-expanded="false" aria-label="開啟完整功能選單">☰</button><div class="masa-mobile-brand">MASA ElectroDiag <small>V1.4.4 · 電腦／手機同介面 · OFFLINE</small></div><button type="button" class="masa-quick-chat">💬 AI 聊天</button>';
 const shade=document.createElement('div');shade.className='masa-mobile-shade';shade.setAttribute('aria-hidden','true');
 sidebar.id='masaDesktopSidebar';document.body.insertBefore(bar,root);document.body.append(shade);
 const toggle=bar.querySelector('.masa-menu-trigger');
 function drawer(open){document.body.classList.toggle('masa-drawer-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'關閉功能選單':'開啟完整功能選單');}
 toggle.addEventListener('click',()=>drawer(!document.body.classList.contains('masa-drawer-open')));
 shade.addEventListener('click',()=>drawer(false));
 sidebar.addEventListener('click',e=>{if(e.target.closest('button'))drawer(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')drawer(false)});
 const desktop=window.matchMedia('(min-width:981px)');
 desktop.addEventListener?.('change',e=>{if(e.matches)drawer(false)});
 bar.querySelector('.masa-quick-chat').addEventListener('click',()=>document.querySelector('#fieldChatQuick')?.click());
 // Self contained build stays read-only offline for web APIs; all existing local panels are unmodified.
})();
