"use strict";(()=>{var L=d=>{let a=document.createElement("style");a.textContent=`
      .dev-modal {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #fff;
        padding: 14px;
        border-radius: 8px;
        max-width: 340px;
        max-height: 180px;
        overflow-y: none;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        font-family: sans-serif;
        z-index: 99999;
        animation: slideIn 0.3s ease-out;
      }
      .dev-modal h3 { 
        margin:0 0 8px 0; 
        font-size:16px; 
        display:flex; 
        gap:6px; 
        align-items:center; 
      }
      .dev-modal p { 
        margin:4px 0; 
        font-size:14px; 
        display:flex; 
        align-items:center; 
        gap:6px; 
      }
      .dev-modal .close-btn { 
        position:absolute; 
        top:2px; 
        right:8px; 
        background:transparent; 
        border:none; 
        cursor:pointer; 
        font-size:14px; 
        font-weight:bold; 
        color:#333; 
      }
      @keyframes slideIn { 
        from { opacity:0; transform:translateX(100%); } 
        to { opacity:1; transform:translateX(0); } 
      }
    `,document.head.appendChild(a);let s=document.createElement("div");s.className="dev-modal",s.innerHTML=`
      <button class="close-btn">&times;</button>
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>  OneDollarStats
      </h3>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> ${d?`Tracking localhost as ${d}`:"Debug URL not set"}
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `,document.body.appendChild(s),s.querySelector(".close-btn")?.addEventListener("click",()=>s.remove(),{once:!0}),window.__stonksModalLog=(u,g)=>{let f=s.querySelector("#event-log");if(!f)return;let w=document.createElement("p"),b="";g?b='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>':b='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',w.innerHTML=`<span>${b}</span> ${u}`,f.appendChild(w),f.scrollTop=f.scrollHeight}};function $(d){let a={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(s=>{let u=d.get(s);u&&(a[s]=u)}),a}function m(d){if(!d)return;let a=d.split(";"),s={};for(let u of a){let g=u.split("=").map(f=>f.trim());g.length!==2||g[0]===""||g[1]===""||(s[g[0]]=g[1])}return Object.keys(s).length===0?void 0:s}(()=>{if(!document)return;let d=null;window.stonks={event:w,view:R};let a=document.currentScript,s=a?.getAttribute("data-hash-routing")!==null,u={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};if(u.isLocalhost){let t=a?.getAttribute("data-debug");console.log(`[onedollarstats]
Script successfully connected! ${t?`Tracking your localhost as ${t}`:"Debug domain not set"}`),L(t)}async function g(t,e){navigator.sendBeacon?.(t,e)||fetch(t,{method:"POST",body:e,headers:{"Content-Type":"application/json"},keepalive:!0}).catch(n=>console.error("[onedollarstats] fetch() failed:",n.message))}async function f(t){let e=a?.getAttribute("data-url")||"https://collector.onedollarstats.com/events",n=new URL(location.href),o=a.getAttribute("data-debug"),r=!1;if(o)try{let l=new URL(`https://${o}${n.pathname}`);n.hostname!==l.hostname&&(r=!0,n=l)}catch{return}n.search="","path"in t&&t.path&&(n.pathname=t.path);let c=n.href.replace(/\/$/,""),i=t.referrer??void 0;if(!i){let l=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(l){let S=new URL(l);S.hostname!==n.hostname&&(i=S.href)}}let p={u:c,e:[{t:t.type,h:s,r:i,p:t.props}]};if(t.utm&&Object.keys(t.utm).length>0&&(p.qs=t.utm),r){p.debug=r;let l=`[onedollarstats]
Event name: ${t.type}
Event collected from: ${c}`;t.props&&Object.keys(t.props).length>0&&(l+=`
Props: ${JSON.stringify(t.props,null,2)}`),i&&(l+=`
Referrer: ${i}`),s&&(l+=`
HashRouting: ${s}`),t.utm&&Object.keys(t.utm).length>0&&(l+=`
UTM: ${t.utm}`),console.log(l)}let h=JSON.stringify(p),y=btoa(h);if(y.length<=1500){let l=new Image(1,1);l.onload=()=>{window.__stonksModalLog&&window.__stonksModalLog(`${t.type} sent`,!0)},l.onerror=()=>{g(e,h),window.__stonksModalLog&&window.__stonksModalLog(`${t.type} failed`,!1)},l.src=`${e}?data=${y}`}else await g(e,h)}async function w(t,e,n){if(k())return;let o={};typeof e=="string"?(o.path=e,n&&(o.props=n)):typeof e=="object"&&(o.props=e);let r=o?.path||void 0;if(!r){let c=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");c&&(r=c)}f({type:t,props:o?.props,path:r})}function b(t){if(t.type==="auxclick"&&t.button!==1)return;let e=t.target;if(!e)return;let n=!!e.closest("a, button"),o=e,r=0;for(;o;){let c=o.getAttribute("data-s-event")||o.getAttribute("data-s:event");if(c){let i=o.getAttribute("data-s-event-props")||o.getAttribute("data-s:event-props"),p=i?m(i):void 0,h=o.getAttribute("data-s-event-path")||o.getAttribute("data-s:event-path")||void 0;w(c,h??p,p);return}if(o=o.parentElement,r++,!n&&r>=3)break}}async function R(t,e){let n={};typeof t=="string"?(n.path=t,e&&(n.props=e)):typeof t=="object"&&(n.props=t),A({path:n?.path,props:n?.props},!1)}async function A(t,e=!0){if(e&&k())return;let n=new URLSearchParams(location.search),o=$(n),r=t?.path||void 0;if(!r){let i=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");i&&(r=i)}let c=t.props||void 0;if(!c){let i=a?.getAttribute("data-props"),p=i?m(i)||{}:{},h=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let y of Array.from(h)){let x=y.getAttribute("data-s-view-props")||y.getAttribute("data-s:view-props");if(!x)continue;let P=m(x);Object.assign(p,P)}c=p}f({type:"PageView",props:Object.keys(c).length>0?c:void 0,path:r,utm:o})}async function v(){let t=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),e=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(t==="false"||e==="false"){d=null;return}if(!(a?.getAttribute("data-autocollect")!=="false")&&t!=="true"&&e!=="true"){d=null;return}if(!s&&d===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(k())return;d=location.pathname;let o=a?.getAttribute("data-props"),r=o?m(o)||{}:{},c=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let i of Array.from(c)){let p=i.getAttribute("data-s-view-props")||i.getAttribute("data-s:view-props");if(!p)continue;let h=m(p);Object.assign(r,h)}A({props:Object.keys(r).length>0?r:void 0},!1)}function k(){return!!(u.isLocalhost&&!a?.getAttribute("data-debug")||u.isHeadlessBrowser)}if(window.history.pushState){let t=window.history.pushState;window.history.pushState=function(e,n,o){t.apply(this,[e,n,o]),window.requestAnimationFrame(()=>{v()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{v()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!d&&document.visibilityState==="visible"&&v()}):v(),document.addEventListener("click",b)})();})();
