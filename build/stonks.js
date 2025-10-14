"use strict";(()=>{var v="https://collector.onedollarstats.com/events";var $=(p,l)=>{let d=document.createElement("style");d.textContent=`
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
    `,document.head.appendChild(d);let r=document.createElement("div");if(r.className="dev-modal",r.innerHTML=`
      <button class="close-btn">&times;</button>
      <p class="title">
        onedollarstats debug window
      </p>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> ${p?`Tracking localhost as ${p}`:"Debug URL not set"}
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `,document.body.appendChild(r),r.querySelector(".close-btn")?.addEventListener("click",()=>r.remove(),{once:!0}),window.__stonksModalLog=(u,m)=>{let g=r.querySelector("#event-log");if(!g||r.querySelector("#ad-blocker-warning"))return;let k=document.createElement("p"),x=m?'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';k.innerHTML=`<span>${x}</span> ${u}`,g.appendChild(k),g.scrollTop=g.scrollHeight},l===v){let u=new Image(1,1);u.onerror=()=>{let m=r.querySelector(".title"),g=document.createElement("p");g.id="ad-blocker-warning",g.innerHTML=`
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>Helth check failed - ad blocker might be interfering.`,m?m.insertAdjacentElement("afterend",g):r.appendChild(g)},u.src="https://test-collector.onedollarstats.com/pixel-health"}};function R(p){let l={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(d=>{let r=p.get(d);r&&(l[d]=r)}),l}function b(p){if(!p)return;let l=p.split(";"),d={};for(let r of l){let u=r.split("=").map(m=>m.trim());u.length!==2||u[0]===""||u[1]===""||(d[u[0]]=u[1])}return Object.keys(d).length===0?void 0:d}(()=>{if(!document)return;let p=null;window.stonks={event:g,view:k};let l=document.currentScript,d=l?.getAttribute("data-hash-routing")!==null,r={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};if(r.isLocalhost){let e=l?.getAttribute("data-debug");console.log(`[onedollarstats]
Script successfully connected! ${e?`Tracking your localhost as ${e}`:"Debug domain not set"}`),$(e,l?.getAttribute("data-url")||v)}async function u(e,o,t){if(navigator.sendBeacon?.(e,o)){t(!0);return}fetch(e,{method:"POST",body:o,headers:{"Content-Type":"application/json"},keepalive:!0}).then(()=>t(!0)).catch(n=>{console.error("[onedollarstats] fetch() failed:",n.message),t(!1)})}async function m(e){let o=l?.getAttribute("data-url")||v,t=new URL(location.href),n=l.getAttribute("data-debug"),s=!1;if(n)try{let i=new URL(`https://${n}${t.pathname}`);t.hostname!==i.hostname&&(s=!0,t=i)}catch{return}t.search="","path"in e&&e.path&&(t.pathname=e.path);let c=t.href.replace(/\/$/,""),a=e.referrer??void 0;if(!a){let i=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(i){let L=new URL(i);L.hostname!==t.hostname&&(a=L.href)}}let f={u:c,e:[{t:e.type,h:d,r:a,p:e.props}]};if(e.utm&&Object.keys(e.utm).length>0&&(f.qs=e.utm),s){f.debug=s;let i=`[onedollarstats]
Event name: ${e.type}
Event collected from: ${c}`;e.props&&Object.keys(e.props).length>0&&(i+=`
Props: ${JSON.stringify(e.props,null,2)}`),a&&(i+=`
Referrer: ${a}`),d&&(i+=`
HashRouting: ${d}`),e.utm&&Object.keys(e.utm).length>0&&(i+=`
UTM: ${e.utm}`),console.log(i)}let h=i=>window.__stonksModalLog?.(`${e.type} ${i?"sent":"failed to send"}`,i),w=JSON.stringify(f),y=btoa(w);if(y.length<=1500){let i=new Image(1,1);i.onload=()=>h(!0),i.onerror=()=>u(o,w,h),i.src=`${o}?data=${y}`}else await u(o,w,h)}async function g(e,o,t){if(S())return;let n={};typeof o=="string"?(n.path=o,t&&(n.props=t)):typeof o=="object"&&(n.props=o);let s=n?.path||void 0;if(!s){let c=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");c&&(s=c)}m({type:e,props:n?.props,path:s})}function P(e){if(e.type==="auxclick"&&e.button!==1)return;let o=e.target;if(!o)return;let t=!!o.closest("a, button"),n=o,s=0;for(;n;){let c=n.getAttribute("data-s-event")||n.getAttribute("data-s:event");if(c){let a=n.getAttribute("data-s-event-props")||n.getAttribute("data-s:event-props"),f=a?b(a):void 0,h=n.getAttribute("data-s-event-path")||n.getAttribute("data-s:event-path")||void 0;g(c,h??f,f);return}if(n=n.parentElement,s++,!t&&s>=3)break}}async function k(e,o){let t={};typeof e=="string"?(t.path=e,o&&(t.props=o)):typeof e=="object"&&(t.props=e),x({path:t?.path,props:t?.props},!1)}async function x(e,o=!0){if(o&&S())return;let t=new URLSearchParams(location.search),n=R(t),s=e?.path||void 0;if(!s){let a=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");a&&(s=a)}let c=e.props||void 0;if(!c){let a=l?.getAttribute("data-props"),f=a?b(a)||{}:{},h=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let w of Array.from(h)){let y=w.getAttribute("data-s-view-props")||w.getAttribute("data-s:view-props");if(!y)continue;let E=b(y);Object.assign(f,E)}c=f}m({type:"PageView",props:Object.keys(c).length>0?c:void 0,path:s,utm:n})}async function A(){let e=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),o=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(e==="false"||o==="false"){p=null;return}if(!(l?.getAttribute("data-autocollect")!=="false")&&e!=="true"&&o!=="true"){p=null;return}if(!d&&p===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(S())return;p=location.pathname;let n=l?.getAttribute("data-props"),s=n?b(n)||{}:{},c=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let a of Array.from(c)){let f=a.getAttribute("data-s-view-props")||a.getAttribute("data-s:view-props");if(!f)continue;let h=b(f);Object.assign(s,h)}x({props:Object.keys(s).length>0?s:void 0},!1)}function S(){return!!(r.isLocalhost&&!l?.getAttribute("data-debug")||r.isHeadlessBrowser)}if(window.history.pushState){let e=window.history.pushState;window.history.pushState=function(o,t,n){e.apply(this,[o,t,n]),window.requestAnimationFrame(()=>{A()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{A()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!p&&document.visibilityState==="visible"&&A()}):A(),document.addEventListener("click",P)})();})();
