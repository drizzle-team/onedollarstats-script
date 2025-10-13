"use strict";(()=>{var L=d=>{let a=document.createElement("style");a.textContent=`
      .dev-modal {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #fff;
        padding: 14px;
        border-radius: 8px;
        max-width: 340px;
        max-height: 200px;
        overflow-y: auto;
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
        top:5px; 
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
    `,document.head.appendChild(a);let r=document.createElement("div");r.className="dev-modal",r.innerHTML=`
      <button class="close-btn">&times;</button>
      <h3>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="green" stroke-width="2" fill="none"/>
          <path d="M5 8.5l2 2 4-4" stroke="green" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg> OneDollarStats connected
      </h3>
      <p>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="gray" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="gray" stroke-width="2" fill="none"/>
          <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="600" fill="gray" font-family="Arial, sans-serif">i</text>
          <circle cx="8" cy="11" r="1" fill="gray"/>
        </svg> ${d?`Tracking your localhost as ${d}`:"Debug URL not set"}
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;"></div>
    `,document.body.appendChild(r),r.querySelector(".close-btn")?.addEventListener("click",()=>r.remove(),{once:!0}),window.__stonksModalLog=(u,g)=>{let f=r.querySelector("#event-log");if(!f)return;let w=document.createElement("p"),y="";g?y=`<svg width="14" height="14" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="green" stroke-width="2" fill="none"/>
          <path d="M5 8.5l2 2 4-4" stroke="green" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`:y=`<svg width="14" height="14" viewBox="0 0 16 16" fill="red" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="red" stroke-width="2" fill="none"/>
        <line x1="5" y1="5" x2="11" y2="11" stroke="red" stroke-width="2" stroke-linecap="round"/>
        <line x1="11" y1="5" x2="5" y2="11" stroke="red" stroke-width="2" stroke-linecap="round"/>
      </svg>`,w.innerHTML=`<span>${y}</span> ${u}`,f.appendChild(w),f.scrollTop=f.scrollHeight}};function R(d){let a={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(r=>{let u=d.get(r);u&&(a[r]=u)}),a}function m(d){if(!d)return;let a=d.split(";"),r={};for(let u of a){let g=u.split("=").map(f=>f.trim());g.length!==2||g[0]===""||g[1]===""||(r[g[0]]=g[1])}return Object.keys(r).length===0?void 0:r}(()=>{if(!document)return;let d=null;window.stonks={event:w,view:$};let a=document.currentScript,r=a?.getAttribute("data-hash-routing")!==null,u={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};if(u.isLocalhost){let t=a?.getAttribute("data-debug");console.log(`[onedollarstats]
Script successfully connected! ${t?`Tracking your localhost as ${t}`:"Debug URL not set"}`),L(t)}async function g(t,e){navigator.sendBeacon?.(t,e)||fetch(t,{method:"POST",body:e,headers:{"Content-Type":"application/json"},keepalive:!0}).catch(n=>console.error("[onedollarstats] fetch() failed:",n.message))}async function f(t){let e=a?.getAttribute("data-url")||"https://collector.onedollarstats.com/events",n=new URL(location.href),o=a.getAttribute("data-debug"),s=!1;if(o)try{let c=new URL(`https://${o}${n.pathname}`);n.hostname!==c.hostname&&(s=!0,n=c)}catch{return}n.search="","path"in t&&t.path&&(n.pathname=t.path);let l=n.href.replace(/\/$/,""),i=t.referrer??void 0;if(!i){let c=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(c){let S=new URL(c);S.hostname!==n.hostname&&(i=S.href)}}let p={u:l,e:[{t:t.type,h:r,r:i,p:t.props}]};if(t.utm&&Object.keys(t.utm).length>0&&(p.qs=t.utm),s){p.debug=s;let c=`[onedollarstats]
Event name: ${t.type}
Event collected from: ${l}`;t.props&&Object.keys(t.props).length>0&&(c+=`
Props: ${JSON.stringify(t.props,null,2)}`),i&&(c+=`
Referrer: ${i}`),r&&(c+=`
HashRouting: ${r}`),t.utm&&Object.keys(t.utm).length>0&&(c+=`
UTM: ${t.utm}`),console.log(c)}let h=JSON.stringify(p),b=btoa(h);if(b.length<=1500){let c=new Image(1,1);c.onload=()=>{window.__stonksModalLog&&window.__stonksModalLog(`Event sent: ${t.type}`,!0)},c.onerror=()=>{g(e,h),window.__stonksModalLog&&window.__stonksModalLog(`Event failed: ${t.type}`,!1)},c.src=`${e}?data=${b}`}else await g(e,h)}async function w(t,e,n){if(x())return;let o={};typeof e=="string"?(o.path=e,n&&(o.props=n)):typeof e=="object"&&(o.props=e);let s=o?.path||void 0;if(!s){let l=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");l&&(s=l)}f({type:t,props:o?.props,path:s})}function y(t){if(t.type==="auxclick"&&t.button!==1)return;let e=t.target;if(!e)return;let n=!!e.closest("a, button"),o=e,s=0;for(;o;){let l=o.getAttribute("data-s-event")||o.getAttribute("data-s:event");if(l){let i=o.getAttribute("data-s-event-props")||o.getAttribute("data-s:event-props"),p=i?m(i):void 0,h=o.getAttribute("data-s-event-path")||o.getAttribute("data-s:event-path")||void 0;w(l,h??p,p);return}if(o=o.parentElement,s++,!n&&s>=3)break}}async function $(t,e){let n={};typeof t=="string"?(n.path=t,e&&(n.props=e)):typeof t=="object"&&(n.props=t),A({path:n?.path,props:n?.props},!1)}async function A(t,e=!0){if(e&&x())return;let n=new URLSearchParams(location.search),o=R(n),s=t?.path||void 0;if(!s){let i=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");i&&(s=i)}let l=t.props||void 0;if(!l){let i=a?.getAttribute("data-props"),p=i?m(i)||{}:{},h=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let b of Array.from(h)){let k=b.getAttribute("data-s-view-props")||b.getAttribute("data-s:view-props");if(!k)continue;let P=m(k);Object.assign(p,P)}l=p}f({type:"PageView",props:Object.keys(l).length>0?l:void 0,path:s,utm:o})}async function v(){let t=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),e=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(t==="false"||e==="false"){d=null;return}if(!(a?.getAttribute("data-autocollect")!=="false")&&t!=="true"&&e!=="true"){d=null;return}if(!r&&d===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(x())return;d=location.pathname;let o=a?.getAttribute("data-props"),s=o?m(o)||{}:{},l=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let i of Array.from(l)){let p=i.getAttribute("data-s-view-props")||i.getAttribute("data-s:view-props");if(!p)continue;let h=m(p);Object.assign(s,h)}A({props:Object.keys(s).length>0?s:void 0},!1)}function x(){return!!(u.isLocalhost&&!a?.getAttribute("data-debug")||u.isHeadlessBrowser)}if(window.history.pushState){let t=window.history.pushState;window.history.pushState=function(e,n,o){t.apply(this,[e,n,o]),window.requestAnimationFrame(()=>{v()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{v()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!d&&document.visibilityState==="visible"&&v()}):v(),document.addEventListener("click",y)})();})();
