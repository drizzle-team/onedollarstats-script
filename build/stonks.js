"use strict";(()=>{var y="https://collector.onedollarstats.com/events";var C=(d,i)=>{let a=document.createElement("style");a.textContent=`
  .dev-modal {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #f6f6f7;
    color: #21272F;
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
    margin: 4px 0;
    font-size: 14px;
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }

  .dev-modal .text {
    word-break: break-word;
  }

  .dev-modal p svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 1px;
  }

  .dev-modal .close-btn {
    position: absolute;
    top: 2px;
    right: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    color: #333;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }`,document.head.appendChild(a);let n=document.createElement("div");if(n.className="dev-modal",n.innerHTML=`
      <button class="close-btn">&times;</button>
      <p class="title">
        onedollarstats debug window
      </p>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
       <span class="text">${`Tracking localhost as ${d}`}</span>
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `,document.body.appendChild(n),n.querySelector(".close-btn")?.addEventListener("click",()=>n.remove(),{once:!0}),window.__stonksModalLog=(p,u)=>{let l=n.querySelector("#event-log");if(!l||n.querySelector("#ad-blocker-warning"))return;let x=document.createElement("p"),k=u?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';x.innerHTML=`${k} <span class="text">${p}</span>`,l.appendChild(x),l.scrollTop=l.scrollHeight},i===y){let p=new Image(1,1);p.onerror=()=>{let u=n.querySelector(".title"),l=document.createElement("p");l.id="ad-blocker-warning",l.innerHTML=`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span class="text">Health check failed - ad blocker might be interfering.</span>`,u?u.insertAdjacentElement("afterend",l):n.appendChild(l)},p.src="https://collector.onedollarstats.com/pixel-health"}};var P=(d,i)=>{let a=d.getAttribute("data-debug"),n=d.getAttribute("data-hostname"),p=d.getAttribute("data-devmode"),u;if(!i)u=!1;else if(p!==null){let w=p.toLowerCase().trim();u=w===""||w==="true"||w==="1"}else a!==null?u=!0:u=!1;let l;return n!==null?l=n.trim()||null:u&&a!==null?l=a:l=null,{hostname:l,devmode:u}};function T(d){let i={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(a=>{let n=d.get(a)?.trim();n&&(i[a]=n)}),i}function v(d){if(!d)return;let i=d.split(";"),a={};for(let n of i){let p=n.split("=").map(u=>u.trim());p.length!==2||p[0]===""||p[1]===""||(a[p[0]]=p[1])}return Object.keys(a).length===0?void 0:a}(()=>{if(!document)return;let d=null;window.stonks={event:l,view:x};let i=document.currentScript,a=i?.getAttribute("data-hash-routing")!==null,n={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)&&(location.protocol==="http:"||location.protocol==="https:")||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};if(n.isLocalhost){let{hostname:e,devmode:t}=P(i,n.isLocalhost);console.log(`[onedollarstats]
Script successfully connected! ${e?`Tracking your localhost as ${e}`:"Debug domain not set"}`),t&&e&&C(e,i?.getAttribute("data-url")||y)}async function p(e,t,r){if(navigator.sendBeacon?.(e,t)){r(!0);return}fetch(e,{method:"POST",body:t,headers:{"Content-Type":"application/json"},keepalive:!0}).then(()=>r(!0)).catch(o=>{console.error("[onedollarstats] fetch() failed:",o.message),r(!1)})}async function u(e){let t=i?.getAttribute("data-url")||y,{hostname:r,devmode:o}=P(i,n.isLocalhost),s=new URL(r?`https://${r}${location.pathname}`:location.href);s.search="","path"in e&&e.path&&(s.pathname=e.path);let m=s.href.replace(/\/$/,""),c=e.referrer??void 0;if(!c){let g=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(g){let R=new URL(g);R.hostname!==s.hostname&&(c=R.href)}}let f={u:m,e:[{t:e.type,h:a,r:c,p:e.props}],debug:o};if(e.utm&&Object.keys(e.utm).length>0&&(f.qs=e.utm),f.debug){let g=`[onedollarstats]
Event name: ${e.type}
Event collected from: ${m}`;e.props&&Object.keys(e.props).length>0&&(g+=`
Props: ${JSON.stringify(e.props,null,2)}`),c&&(g+=`
Referrer: ${c}`),a&&(g+=`
HashRouting: ${a}`),e.utm&&Object.keys(e.utm).length>0&&(g+=`
UTM: ${e.utm}`),console.log(g)}let h=g=>window.__stonksModalLog?.(`${e.type} ${g?"sent":"failed to send"}`,g),b=JSON.stringify(f),S=new TextEncoder().encode(b),E=String.fromCharCode(...S),$=btoa(E);if($.length<=1500){let g=new Image(1,1);g.onload=()=>h(!0),g.onerror=()=>p(t,b,h),g.src=`${t}?data=${$}`}else await p(t,b,h)}async function l(e,t,r){if(L())return;let o={};typeof t=="string"?(o.path=t,r&&(o.props=r)):typeof t=="object"&&(o.props=t);let s=o?.path||void 0;if(!s){let m=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");m&&(s=m)}u({type:e,props:o?.props,path:s})}function w(e){if(e.type==="auxclick"&&e.button!==1)return;let t=e.target;if(!t)return;let r=!!t.closest("a, button"),o=t,s=0;for(;o;){let m=o.getAttribute("data-s-event")||o.getAttribute("data-s:event");if(m){let c=o.getAttribute("data-s-event-props")||o.getAttribute("data-s:event-props"),f=c?v(c):void 0,h=o.getAttribute("data-s-event-path")||o.getAttribute("data-s:event-path")||void 0;l(m,h??f,f);return}if(o=o.parentElement,s++,!r&&s>=3)break}}async function x(e,t){let r={};typeof e=="string"?(r.path=e,t&&(r.props=t)):typeof e=="object"&&(r.props=e),k({path:r?.path,props:r?.props},!1)}async function k(e,t=!0){if(t&&L())return;let r=new URLSearchParams(location.search),o=T(r),s=e?.path||void 0;if(!s){let c=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");c&&(s=c)}let m=e.props||void 0;if(!m){let c=i?.getAttribute("data-props"),f=c?v(c)||{}:{},h=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let b of Array.from(h)){let S=b.getAttribute("data-s-view-props")||b.getAttribute("data-s:view-props");if(!S)continue;let E=v(S);Object.assign(f,E)}m=f}u({type:"PageView",props:Object.keys(m).length>0?m:void 0,path:s,utm:o})}async function A(){let e=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),t=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(e==="false"||t==="false"){d=null;return}if(!(i?.getAttribute("data-autocollect")!=="false")&&e!=="true"&&t!=="true"){d=null;return}if(!a&&d===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(L())return;d=location.pathname;let o=i?.getAttribute("data-props"),s=o?v(o)||{}:{},m=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let c of Array.from(m)){let f=c.getAttribute("data-s-view-props")||c.getAttribute("data-s:view-props");if(!f)continue;let h=v(f);Object.assign(s,h)}k({props:Object.keys(s).length>0?s:void 0},!1)}function L(){let{hostname:e,devmode:t}=P(i,n.isLocalhost);return!!(n.isLocalhost&&(!t||!e)||n.isHeadlessBrowser)}if(window.history.pushState){let e=window.history.pushState;window.history.pushState=function(t,r,o){e.apply(this,[t,r,o]),window.requestAnimationFrame(()=>{A()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{A()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!d&&document.visibilityState==="visible"&&A()}):A(),document.addEventListener("click",w)})();})();
