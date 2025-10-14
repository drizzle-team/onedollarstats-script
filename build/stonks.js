"use strict";(()=>{var $=d=>{let c=document.createElement("style");c.textContent=`
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
      .dev-modal .title {
        text-transform: uppercase;
        font-size: 11px;
        font-weight: 500;
        margin: 0 0 6px 0;
        color: #333;
        letter-spacing: 0.5px;
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
    `,document.head.appendChild(c);let r=document.createElement("div");r.className="dev-modal",r.innerHTML=`
      <button class="close-btn">&times;</button>
      <p class="title">
        onedollarstats debug window
      </p>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> ${d?`Tracking localhost as ${d}`:"Debug URL not set"}
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `,document.body.appendChild(r),r.querySelector(".close-btn")?.addEventListener("click",()=>r.remove(),{once:!0}),window.__stonksModalLog=(u,g)=>{let f=r.querySelector("#event-log");if(!f)return;let w=document.createElement("p"),y="";g?y='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>':y='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',w.innerHTML=`<span>${y}</span> ${u}`,f.appendChild(w),f.scrollTop=f.scrollHeight}};function L(d){let c={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(r=>{let u=d.get(r);u&&(c[r]=u)}),c}function b(d){if(!d)return;let c=d.split(";"),r={};for(let u of c){let g=u.split("=").map(f=>f.trim());g.length!==2||g[0]===""||g[1]===""||(r[g[0]]=g[1])}return Object.keys(r).length===0?void 0:r}(()=>{if(!document)return;let d=null;window.stonks={event:w,view:R};let c=document.currentScript,r=c?.getAttribute("data-hash-routing")!==null,u={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};if(u.isLocalhost){let t=c?.getAttribute("data-debug");console.log(`[onedollarstats]
Script successfully connected! ${t?`Tracking your localhost as ${t}`:"Debug domain not set"}`),$(t)}async function g(t,o,e){if(navigator.sendBeacon?.(t,o)){e(!0);return}fetch(t,{method:"POST",body:o,headers:{"Content-Type":"application/json"},keepalive:!0}).then(()=>e(!0)).catch(n=>{console.error("[onedollarstats] fetch() failed:",n.message),e(!1)})}async function f(t){let o=c?.getAttribute("data-url")||"https://collector.onedollarstats.com/events",e=new URL(location.href),n=c.getAttribute("data-debug"),s=!1;if(n)try{let i=new URL(`https://${n}${e.pathname}`);e.hostname!==i.hostname&&(s=!0,e=i)}catch{return}e.search="","path"in t&&t.path&&(e.pathname=t.path);let l=e.href.replace(/\/$/,""),a=t.referrer??void 0;if(!a){let i=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(i){let S=new URL(i);S.hostname!==e.hostname&&(a=S.href)}}let p={u:l,e:[{t:t.type,h:r,r:a,p:t.props}]};if(t.utm&&Object.keys(t.utm).length>0&&(p.qs=t.utm),s){p.debug=s;let i=`[onedollarstats]
Event name: ${t.type}
Event collected from: ${l}`;t.props&&Object.keys(t.props).length>0&&(i+=`
Props: ${JSON.stringify(t.props,null,2)}`),a&&(i+=`
Referrer: ${a}`),r&&(i+=`
HashRouting: ${r}`),t.utm&&Object.keys(t.utm).length>0&&(i+=`
UTM: ${t.utm}`),console.log(i)}let m=i=>window.__stonksModalLog?.(`${t.type} ${i?"sent":"failed to send"}`,i),h=JSON.stringify(p),v=btoa(h);if(v.length<=1500){let i=new Image(1,1);i.onload=()=>m(!0),i.onerror=()=>g(o,h,m),i.src=`${o}?data=${v}`}else await g(o,h,m)}async function w(t,o,e){if(A())return;let n={};typeof o=="string"?(n.path=o,e&&(n.props=e)):typeof o=="object"&&(n.props=o);let s=n?.path||void 0;if(!s){let l=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");l&&(s=l)}f({type:t,props:n?.props,path:s})}function y(t){if(t.type==="auxclick"&&t.button!==1)return;let o=t.target;if(!o)return;let e=!!o.closest("a, button"),n=o,s=0;for(;n;){let l=n.getAttribute("data-s-event")||n.getAttribute("data-s:event");if(l){let a=n.getAttribute("data-s-event-props")||n.getAttribute("data-s:event-props"),p=a?b(a):void 0,m=n.getAttribute("data-s-event-path")||n.getAttribute("data-s:event-path")||void 0;w(l,m??p,p);return}if(n=n.parentElement,s++,!e&&s>=3)break}}async function R(t,o){let e={};typeof t=="string"?(e.path=t,o&&(e.props=o)):typeof t=="object"&&(e.props=t),k({path:e?.path,props:e?.props},!1)}async function k(t,o=!0){if(o&&A())return;let e=new URLSearchParams(location.search),n=L(e),s=t?.path||void 0;if(!s){let a=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");a&&(s=a)}let l=t.props||void 0;if(!l){let a=c?.getAttribute("data-props"),p=a?b(a)||{}:{},m=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let h of Array.from(m)){let v=h.getAttribute("data-s-view-props")||h.getAttribute("data-s:view-props");if(!v)continue;let P=b(v);Object.assign(p,P)}l=p}f({type:"PageView",props:Object.keys(l).length>0?l:void 0,path:s,utm:n})}async function x(){let t=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),o=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(t==="false"||o==="false"){d=null;return}if(!(c?.getAttribute("data-autocollect")!=="false")&&t!=="true"&&o!=="true"){d=null;return}if(!r&&d===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(A())return;d=location.pathname;let n=c?.getAttribute("data-props"),s=n?b(n)||{}:{},l=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let a of Array.from(l)){let p=a.getAttribute("data-s-view-props")||a.getAttribute("data-s:view-props");if(!p)continue;let m=b(p);Object.assign(s,m)}k({props:Object.keys(s).length>0?s:void 0},!1)}function A(){return!!(u.isLocalhost&&!c?.getAttribute("data-debug")||u.isHeadlessBrowser)}if(window.history.pushState){let t=window.history.pushState;window.history.pushState=function(o,e,n){t.apply(this,[o,e,n]),window.requestAnimationFrame(()=>{x()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{x()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!d&&document.visibilityState==="visible"&&x()}):x(),document.addEventListener("click",y)})();})();
