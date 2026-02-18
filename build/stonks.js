"use strict";(()=>{var y="https://collector.onedollarstats.com/events";var C=(d,n)=>{let i=document.createElement("style");i.textContent=`
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
  }`,document.head.appendChild(i);let r=document.createElement("div");if(r.className="dev-modal",r.innerHTML=`
      <button class="close-btn">&times;</button>
      <p class="title">
        onedollarstats debug window
      </p>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
       <span class="text">${`Tracking localhost as ${d}`}</span>
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `,document.body.appendChild(r),r.querySelector(".close-btn")?.addEventListener("click",()=>r.remove(),{once:!0}),window.__stonksModalLog=(a,l)=>{let p=r.querySelector("#event-log");if(!p||r.querySelector("#ad-blocker-warning"))return;let x=document.createElement("p"),k=l?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';x.innerHTML=`${k} <span class="text">${a}</span>`,p.appendChild(x),p.scrollTop=p.scrollHeight},n===y){let a=new Image(1,1);a.onerror=()=>{let l=r.querySelector(".title"),p=document.createElement("p");p.id="ad-blocker-warning",p.innerHTML=`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span class="text">Health check failed - ad blocker might be interfering.</span>`,l?l.insertAdjacentElement("afterend",p):r.appendChild(p)},a.src="https://collector.onedollarstats.com/pixel-health"}};var P=(d,n)=>{let i=d.getAttribute("data-debug"),r=d.getAttribute("data-hostname"),a=d.getAttribute("data-devmode"),l;if(!n)l=!1;else if(a!==null){let w=a.toLowerCase().trim();l=w===""||w==="true"||w==="1"}else i!==null?l=!0:l=!1;let p;return r!==null?p=r.trim()||null:l&&i!==null?p=i:p=null,{hostname:p,devmode:l}};function T(d){let n={},i=["utm_campaign","utm_source","utm_medium","utm_term","utm_content"];for(let r of i){let a=d.get(r);if(!a)continue;let l=j(a).trim();l&&(n[r]=l)}return n}function j(d){let n=d,i=decodeURIComponent(n);for(;i!==n;)n=i,i=decodeURIComponent(n);return n}function v(d){if(!d)return;let n=d.split(";"),i={};for(let r of n){let a=r.split("=").map(l=>l.trim());a.length!==2||a[0]===""||a[1]===""||(i[a[0]]=a[1])}return Object.keys(i).length===0?void 0:i}(()=>{if(!document)return;let d=null;window.stonks={event:p,view:x};let n=document.currentScript,i=n?.getAttribute("data-hash-routing")!==null,r={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)&&(location.protocol==="http:"||location.protocol==="https:")||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};if(r.isLocalhost){let{hostname:e,devmode:t}=P(n,r.isLocalhost);console.log(`[onedollarstats]
Script successfully connected! ${e?`Tracking your localhost as ${e}`:"Debug domain not set"}`),t&&e&&C(e,n?.getAttribute("data-url")||y)}async function a(e,t,s){if(navigator.sendBeacon?.(e,t)){s(!0);return}fetch(e,{method:"POST",body:t,headers:{"Content-Type":"application/json"},keepalive:!0}).then(()=>s(!0)).catch(o=>{console.error("[onedollarstats] fetch() failed:",o.message),s(!1)})}async function l(e){let t=n?.getAttribute("data-url")||y,{hostname:s,devmode:o}=P(n,r.isLocalhost),c=new URL(s?`https://${s}${location.pathname}`:location.href);c.search="","path"in e&&e.path&&(c.pathname=e.path);let m=c.href.replace(/\/$/,""),u=e.referrer??void 0;if(!u){let g=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(g){let R=new URL(g);R.hostname!==c.hostname&&(u=R.href)}}let f={u:m,e:[{t:e.type,h:i,r:u,p:e.props}],debug:o};if(e.utm&&Object.keys(e.utm).length>0&&(f.qs=e.utm),f.debug){let g=`[onedollarstats]
Event name: ${e.type}
Event collected from: ${m}`;e.props&&Object.keys(e.props).length>0&&(g+=`
Props: ${JSON.stringify(e.props,null,2)}`),u&&(g+=`
Referrer: ${u}`),i&&(g+=`
HashRouting: ${i}`),e.utm&&Object.keys(e.utm).length>0&&(g+=`
UTM: ${e.utm}`),console.log(g)}let h=g=>window.__stonksModalLog?.(`${e.type} ${g?"sent":"failed to send"}`,g),b=JSON.stringify(f),S=new TextEncoder().encode(b),E=String.fromCharCode(...S),$=btoa(E);if($.length<=1500){let g=new Image(1,1);g.onload=()=>h(!0),g.onerror=()=>a(t,b,h),g.src=`${t}?data=${$}`}else await a(t,b,h)}async function p(e,t,s){if(L())return;let o={};typeof t=="string"?(o.path=t,s&&(o.props=s)):typeof t=="object"&&(o.props=t);let c=o?.path||void 0;if(!c){let m=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");m&&(c=m)}l({type:e,props:o?.props,path:c})}function w(e){if(e.type==="auxclick"&&e.button!==1)return;let t=e.target;if(!t)return;let s=!!t.closest("a, button"),o=t,c=0;for(;o;){let m=o.getAttribute("data-s-event")||o.getAttribute("data-s:event");if(m){let u=o.getAttribute("data-s-event-props")||o.getAttribute("data-s:event-props"),f=u?v(u):void 0,h=o.getAttribute("data-s-event-path")||o.getAttribute("data-s:event-path")||void 0;p(m,h??f,f);return}if(o=o.parentElement,c++,!s&&c>=3)break}}async function x(e,t){let s={};typeof e=="string"?(s.path=e,t&&(s.props=t)):typeof e=="object"&&(s.props=e),k({path:s?.path,props:s?.props},!1)}async function k(e,t=!0){if(t&&L())return;let s=new URLSearchParams(location.search),o=T(s),c=e?.path||void 0;if(!c){let u=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");u&&(c=u)}let m=e.props||void 0;if(!m){let u=n?.getAttribute("data-props"),f=u?v(u)||{}:{},h=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let b of Array.from(h)){let S=b.getAttribute("data-s-view-props")||b.getAttribute("data-s:view-props");if(!S)continue;let E=v(S);Object.assign(f,E)}m=f}l({type:"PageView",props:Object.keys(m).length>0?m:void 0,path:c,utm:o})}async function A(){let e=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),t=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(e==="false"||t==="false"){d=null;return}if(!(n?.getAttribute("data-autocollect")!=="false")&&e!=="true"&&t!=="true"){d=null;return}if(!i&&d===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(L())return;d=location.pathname;let o=n?.getAttribute("data-props"),c=o?v(o)||{}:{},m=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let u of Array.from(m)){let f=u.getAttribute("data-s-view-props")||u.getAttribute("data-s:view-props");if(!f)continue;let h=v(f);Object.assign(c,h)}k({props:Object.keys(c).length>0?c:void 0},!1)}function L(){let{hostname:e,devmode:t}=P(n,r.isLocalhost);return!!(r.isLocalhost&&(!t||!e)||r.isHeadlessBrowser)}if(window.history.pushState){let e=window.history.pushState;window.history.pushState=function(t,s,o){e.apply(this,[t,s,o]),window.requestAnimationFrame(()=>{A()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{A()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!d&&document.visibilityState==="visible"&&A()}):A(),document.addEventListener("click",w)})();})();
