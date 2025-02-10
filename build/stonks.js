"use strict";function g(t){let e={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(n=>{let o=t.get(n);o&&(e[n]=o)}),e}function u(t){if(!t)return;let e=t.split(";"),n={};for(let o of e){let r=o.split("=").map(s=>s.trim());r.length!==2||r[0]===""||r[1]===""||(n[r[0]]=r[1])}return Object.keys(n).length===0?void 0:n}window.stonks={event:w,view:S};var l=document.currentScript,h=l?.getAttribute("data-hash-routing")!==null,m={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};async function y(t){let e=l?.getAttribute("data-url")||"https://collector.onedollarstats.com/events",n=new URL(location.href);n.search="","path"in t&&t.path&&(n.pathname=t.path);let o=n.href.replace(/\/$/,""),r=t.referrer??void 0;if(!r){let i=new URL(location.href),c=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(c){let p=new URL(c);p.hostname!==i.hostname&&(r=p.href)}}let s={u:o,e:[{t:t.type,h,r,p:t.props}]};t.utm&&Object.keys(t.utm).length>0&&(s.qs=t.utm),!(navigator.sendBeacon!==void 0&&navigator.sendBeacon(e,JSON.stringify(s)))&&fetch(e,{body:JSON.stringify(s),headers:{"Content-Type":"application/json"},keepalive:!0,method:"POST"}).catch(i=>console.error(`fetch() failed: ${i.message}`))}async function w(t,e,n){if(d())return;let o={};typeof e=="string"?(o.path=e,n&&(o.props=n)):typeof e=="object"&&(o.props=e);let r=o?.path||void 0;if(!r){let s=document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");s&&(r=s)}y({type:t,props:o?.props,path:r})}function A(t){if(t.type==="auxclick"&&t.button!==1)return;let e=t.target,n=e.getAttribute("data-s:event");if(!n)return;let o=e.getAttribute("data-s:event-props"),r=o?u(o):void 0,s=e.getAttribute("data-s:event-path")||void 0;w(n,s,r)}async function S(t,e){let n={};typeof t=="string"?(n.path=t,e&&(n.props=e)):typeof t=="object"&&(n.props=t),b({path:n?.path,props:n?.props},!1)}async function b(t,e=!0){if(e&&d())return;let n=new URLSearchParams(location.search),o=g(n),r=t?.path||void 0;if(!r){let i=document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");i&&(r=i)}let s=t.props||void 0;if(!s){let i=l?.getAttribute("data-props"),c=i?u(i)||{}:{},p=document.querySelectorAll("[data-s\\:view-props]");for(let v of Array.from(p)){let f=v.getAttribute("data-s:view-props");if(!f)continue;let P=u(f);Object.assign(c,P)}s=c}y({type:"PageView",props:Object.keys(s).length>0?s:void 0,path:r,utm:o})}async function a(){let t=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),e=document.body?.getAttribute("data-s:collect");if(t==="false"||e==="false"||!(l?.getAttribute("data-autocollect")!=="false")&&t!=="true"&&e!=="true")return;if(!h&&a.lastPage===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(d())return;a.lastPage=location.pathname;let o=l?.getAttribute("data-props"),r=o?u(o)||{}:{},s=document.querySelectorAll("[data-s\\:view-props]");for(let i of Array.from(s)){let c=i.getAttribute("data-s:view-props");if(!c)continue;let p=u(c);Object.assign(r,p)}b({props:Object.keys(r).length>0?r:void 0},!1)}(e=>e.lastPage=null)(a||={});function d(){return!!(m.isLocalhost&&l?.getAttribute("data-allow-localhost")!=="true"||m.isHeadlessBrowser)}if(window.history.pushState){let t=window.history.pushState;window.history.pushState=function(e,n,o){t.apply(this,[e,n,o]),a()},window.addEventListener("popstate",a)}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!a.lastPage&&document.visibilityState==="visible"&&a()}):a();document.addEventListener("click",A);
