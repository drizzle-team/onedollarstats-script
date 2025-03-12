"use strict";function m(t){let n={};return["utm_campaign","utm_source","utm_medium","utm_term","utm_content"].forEach(e=>{let r=t.get(e);r&&(n[e]=r)}),n}function l(t){if(!t)return;let n=t.split(";"),e={};for(let r of n){let o=r.split("=").map(s=>s.trim());o.length!==2||o[0]===""||o[1]===""||(e[o[0]]=o[1])}return Object.keys(e).length===0?void 0:e}window.stonks={event:y,view:S};var p=document.currentScript,b=p?.getAttribute("data-hash-routing")!==null,h={isLocalhost:/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)||location.protocol==="file:",isHeadlessBrowser:!!(window._phantom||window.__nightmare||window.navigator.webdriver||window.Cypress)};async function w(t){let n=p?.getAttribute("data-url")||"https://collector.onedollarstats.com/events",e=new URL(location.href),r=p.getAttribute("data-debug"),o=!1;if(r)try{let a=new URL(`https://${r}${e.pathname}`);e.hostname!==a.hostname&&(o=!0,e=a)}catch{return}e.search="","path"in t&&t.path&&(e.pathname=t.path);let s=e.href.replace(/\/$/,""),i=t.referrer??void 0;if(!i){let a=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(a){let d=new URL(a);d.hostname!==e.hostname&&(i=d.href)}}let u={u:s,e:[{t:t.type,h:b,r:i,p:t.props}]};o&&(u.debug=o),t.utm&&Object.keys(t.utm).length>0&&(u.qs=t.utm),!(navigator.sendBeacon!==void 0&&navigator.sendBeacon(n,JSON.stringify(u)))&&fetch(n,{body:JSON.stringify(u),headers:{"Content-Type":"application/json"},keepalive:!0,method:"POST"}).catch(a=>console.error(`fetch() failed: ${a.message}`))}async function y(t,n,e){if(f())return;let r={};typeof n=="string"?(r.path=n,e&&(r.props=e)):typeof n=="object"&&(r.props=n);let o=r?.path||void 0;if(!o){let s=document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");s&&(o=s)}w({type:t,props:r?.props,path:o})}function A(t){if(t.type==="auxclick"&&t.button!==1)return;let n=t.target,e=n.getAttribute("data-s:event");if(!e)return;let r=n.getAttribute("data-s:event-props"),o=r?l(r):void 0,s=n.getAttribute("data-s:event-path")||void 0;y(e,s,o)}async function S(t,n){let e={};typeof t=="string"?(e.path=t,n&&(e.props=n)):typeof t=="object"&&(e.props=t),v({path:e?.path,props:e?.props},!1)}async function v(t,n=!0){if(n&&f())return;let e=new URLSearchParams(location.search),r=m(e),o=t?.path||void 0;if(!o){let i=document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");i&&(o=i)}let s=t.props||void 0;if(!s){let i=p?.getAttribute("data-props"),u=i?l(i)||{}:{},a=document.querySelectorAll("[data-s\\:view-props]");for(let d of Array.from(a)){let g=d.getAttribute("data-s:view-props");if(!g)continue;let P=l(g);Object.assign(u,P)}s=u}w({type:"PageView",props:Object.keys(s).length>0?s:void 0,path:o,utm:r})}async function c(){let t=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),n=document.body?.getAttribute("data-s:collect");if(t==="false"||n==="false"){c.lastPage=null;return}if(!(p?.getAttribute("data-autocollect")!=="false")&&t!=="true"&&n!=="true"){c.lastPage=null;return}if(!b&&c.lastPage===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(f())return;c.lastPage=location.pathname;let r=p?.getAttribute("data-props"),o=r?l(r)||{}:{},s=document.querySelectorAll("[data-s\\:view-props]");for(let i of Array.from(s)){let u=i.getAttribute("data-s:view-props");if(!u)continue;let a=l(u);Object.assign(o,a)}v({props:Object.keys(o).length>0?o:void 0},!1)}(n=>n.lastPage=null)(c||={});function f(){return!!(h.isLocalhost&&!p?.getAttribute("data-debug")||h.isHeadlessBrowser)}if(window.history.pushState){let t=window.history.pushState;window.history.pushState=function(n,e,r){t.apply(this,[n,e,r]),window.requestAnimationFrame(()=>{c()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{c()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!c.lastPage&&document.visibilityState==="visible"&&c()}):c();document.addEventListener("click",A);
