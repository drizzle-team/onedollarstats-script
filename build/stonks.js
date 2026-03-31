"use strict";(()=>{var R=[{pattern:/Googlebot/i,kind:"search_engine",name:"Googlebot"},{pattern:/Google-InspectionTool/i,kind:"search_engine",name:"Googlebot"},{pattern:/Storebot-Google/i,kind:"search_engine",name:"Googlebot"},{pattern:/AdsBot-Google/i,kind:"search_engine",name:"Google Ads"},{pattern:/Mediapartners-Google/i,kind:"search_engine",name:"Google Adsense"},{pattern:/bingbot/i,kind:"search_engine",name:"Bingbot"},{pattern:/msnbot/i,kind:"search_engine",name:"MSNBot"},{pattern:/YandexBot/i,kind:"search_engine",name:"YandexBot"},{pattern:/YandexAccessibilityBot/i,kind:"search_engine",name:"YandexBot"},{pattern:/Baiduspider/i,kind:"search_engine",name:"Baidu"},{pattern:/DuckDuckBot/i,kind:"search_engine",name:"DuckDuckBot"},{pattern:/Sogou/i,kind:"search_engine",name:"Sogou"},{pattern:/Exabot/i,kind:"search_engine",name:"Exabot"},{pattern:/ia_archiver/i,kind:"search_engine",name:"Alexa"},{pattern:/SemrushBot/i,kind:"search_engine",name:"SemrushBot"},{pattern:/AhrefsBot/i,kind:"search_engine",name:"AhrefsBot"},{pattern:/MJ12bot/i,kind:"search_engine",name:"MJ12bot"},{pattern:/DotBot/i,kind:"search_engine",name:"DotBot"},{pattern:/PetalBot/i,kind:"search_engine",name:"PetalBot"},{pattern:/Applebot/i,kind:"search_engine",name:"Applebot"},{pattern:/GPTBot/i,kind:"search_engine",name:"GPTBot"},{pattern:/ChatGPT-User/i,kind:"search_engine",name:"ChatGPT"},{pattern:/ClaudeBot/i,kind:"search_engine",name:"ClaudeBot"},{pattern:/CCBot/i,kind:"search_engine",name:"Common Crawl"},{pattern:/anthropic-ai/i,kind:"search_engine",name:"Anthropic"},{pattern:/PerplexityBot/i,kind:"search_engine",name:"PerplexityBot"},{pattern:/facebookexternalhit/i,kind:"social_crawler",name:"Facebook"},{pattern:/Facebot/i,kind:"social_crawler",name:"Facebook"},{pattern:/Twitterbot/i,kind:"social_crawler",name:"Twitter"},{pattern:/LinkedInBot/i,kind:"social_crawler",name:"LinkedIn"},{pattern:/Slackbot/i,kind:"social_crawler",name:"Slack"},{pattern:/Discordbot/i,kind:"social_crawler",name:"Discord"},{pattern:/TelegramBot/i,kind:"social_crawler",name:"Telegram"},{pattern:/WhatsApp/i,kind:"social_crawler",name:"WhatsApp"},{pattern:/Pinterestbot/i,kind:"social_crawler",name:"Pinterest"},{pattern:/Snapchat/i,kind:"social_crawler",name:"Snapchat"},{pattern:/HeadlessChrome/i,kind:"headless",name:"Headless Chrome"},{pattern:/PhantomJS/i,kind:"headless",name:"PhantomJS"},{pattern:/Selenium/i,kind:"automation",name:"Selenium"},{pattern:/Puppeteer/i,kind:"automation",name:"Puppeteer"},{pattern:/curl\//i,kind:"library",name:"curl"},{pattern:/Wget\//i,kind:"library",name:"Wget"},{pattern:/python-requests/i,kind:"library",name:"Python Requests"},{pattern:/python-urllib/i,kind:"library",name:"Python urllib"},{pattern:/node-fetch/i,kind:"library",name:"node-fetch"},{pattern:/axios\//i,kind:"library",name:"Axios"},{pattern:/Go-http-client/i,kind:"library",name:"Go HTTP"},{pattern:/Java\//i,kind:"library",name:"Java HTTP"},{pattern:/libwww-perl/i,kind:"library",name:"Perl LWP"},{pattern:/Apache-HttpClient/i,kind:"library",name:"Apache HttpClient"},{pattern:/okhttp/i,kind:"library",name:"OkHttp"},{pattern:/Scrapy/i,kind:"library",name:"Scrapy"},{pattern:/bot|crawl|spider|slurp|fetch|archiver/i,kind:"unknown_bot",name:"generic"}],O=["__selenium_unwrapped","__selenium_evaluate","__webdriver_evaluate","__webdriver_script_fn","__webdriver_script_func","__webdriver_script_function","__fxdriver_evaluate","__fxdriver_unwrapped","_Selenium_IDE_Recorder","__puppeteer_evaluation_script__","callPhantom","_phantom","phantom","__nightmare","__playwright","__pw_manual","__casper","__testcafe","webdriver","domAutomation","domAutomationController"];function D(){let e=$(),t=e.userAgentBot!==null||e.webdriver||e.headless||e.automationGlobals.length>0||e.liesDetected>2||e.liesDetected>0&&e.hasProxy,r="human";if(t)if(e.userAgentBot!==null){let i=navigator.userAgent||"";r=R.find(o=>o.pattern.test(i))?.kind??"unknown_bot"}else e.headless?r="headless":e.webdriver||e.automationGlobals.length>0?r="automation":r="unknown_bot";return{isBot:t,botKind:r,signals:e}}function $(){return{userAgentBot:H(),webdriver:j(),headless:N(),automationGlobals:U(),...q(),missingLanguages:I(),missingPlugins:F()}}function H(){let e=navigator.userAgent||"";if(!e)return"empty-ua";for(let{pattern:t,name:r}of R)if(t.test(e))return r;return null}function j(){return!!navigator.webdriver}function N(){let e=window,t=navigator;if(/Chrome/.test(t.userAgent)&&!e.chrome||/HeadlessChrome/.test(t.userAgent))return!0;try{if(Notification.permission==="denied"&&t.permissions&&(!t.plugins||t.plugins.length===0)&&!/Mobile|Android/i.test(t.userAgent))return!0}catch{}return!1}function U(){let e=window;return O.filter(t=>{try{return t in e&&e[t]!==void 0}catch{return!1}})}function q(){let e=0,t=!1,r=[["Navigator.prototype.userAgent",()=>x(Navigator.prototype,"userAgent")],["Navigator.prototype.languages",()=>x(Navigator.prototype,"languages")],["Navigator.prototype.platform",()=>x(Navigator.prototype,"platform")],["Navigator.prototype.hardwareConcurrency",()=>x(Navigator.prototype,"hardwareConcurrency")],["Navigator.prototype.webdriver",()=>x(Navigator.prototype,"webdriver")],["HTMLCanvasElement.prototype.toDataURL",()=>HTMLCanvasElement.prototype.toDataURL],["CanvasRenderingContext2D.prototype.fillText",()=>CanvasRenderingContext2D.prototype.fillText],["Date.prototype.getTimezoneOffset",()=>Date.prototype.getTimezoneOffset]];for(let[i,p]of r)try{let o=p();if(o==null)continue;if(typeof o=="function"){let l=Function.prototype.toString.call(o);C(l)||e++}if(i.includes(".prototype.")&&typeof o!="function"){let l=i.split("."),f=V(l[0]),w=l[l.length-1];if(f){let y=Object.getOwnPropertyDescriptor(f,w);if(y?.get){let v=Function.prototype.toString.call(y.get);C(v)||e++}}}if(typeof o=="function"&&o.toString!==Function.prototype.toString)try{let l=Function.prototype.toString.call(o),f=o.toString();l!==f&&(e++,t=!0)}catch{e++,t=!0}}catch{}try{let i=Function.prototype.toString.call(Function.prototype.toString);C(i)||e++}catch{}return{liesDetected:e,hasProxy:t}}function I(){let e=navigator.languages;return!e||e.length===0}function F(){return/Mobile|Android/i.test(navigator.userAgent)?!1:!navigator.plugins||navigator.plugins.length===0}function C(e){return/^function\s[^{]*\{\s*\[native code\]\s*\}$/.test(e)||e==="function () { [native code] }"||/^\(\)\s*=>\s*\{\s*\[native code\]\s*\}$/.test(e)}function x(e,t){return Object.getOwnPropertyDescriptor(e,t)}function V(e){try{return window[e]?.prototype??null}catch{return null}}var A="https://collector.onedollarstats.com/events";var M=(e,t)=>{let r=document.createElement("style");r.textContent=`
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
  }`,document.head.appendChild(r);let i=document.createElement("div");if(i.className="dev-modal",i.innerHTML=`
      <button class="close-btn">&times;</button>
      <p class="title">
        onedollarstats debug window
      </p>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
       <span class="text">${`Tracking localhost as ${e}`}</span>
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `,document.body.appendChild(i),i.querySelector(".close-btn")?.addEventListener("click",()=>i.remove(),{once:!0}),window.__stonksModalLog=(p,o)=>{let l=i.querySelector("#event-log");if(!l||i.querySelector("#ad-blocker-warning"))return;let w=document.createElement("p"),y=o?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';w.innerHTML=`${y} <span class="text">${p}</span>`,l.appendChild(w),l.scrollTop=l.scrollHeight},t===A){let p=new Image(1,1);p.onerror=()=>{let o=i.querySelector(".title"),l=document.createElement("p");l.id="ad-blocker-warning",l.innerHTML=`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span class="text">Health check failed - ad blocker might be interfering.</span>`,o?o.insertAdjacentElement("afterend",l):i.appendChild(l)},p.src="https://collector.onedollarstats.com/pixel-health"}};var S=(e,t)=>{let r=e.getAttribute("data-debug"),i=e.getAttribute("data-hostname"),p=e.getAttribute("data-devmode"),o;if(!t)o=!1;else if(p!==null){let f=p.toLowerCase().trim();o=f===""||f==="true"||f==="1"}else r!==null?o=!0:o=!1;let l;return i!==null?l=i.trim()||null:o&&r!==null?l=r:l=null,{hostname:l,devmode:o}};function G(e){let t={},r=["utm_campaign","utm_source","utm_medium","utm_term","utm_content"];for(let i of r){let p=e.get(i);if(!p)continue;let o=W(p);o&&(t[i]=o)}return t}function W(e){let t=e,r="";for(;t!==r;){r=t;try{t=decodeURIComponent(t)}catch{return t.trim()}}return t.trim()}function _(e){if(!e)return;let t=e.split(";"),r={};for(let i of t){let p=i.split("=").map(o=>o.trim());p.length!==2||p[0]===""||p[1]===""||(r[p[0]]=p[1])}return Object.keys(r).length===0?void 0:r}(()=>{if(!document)return;let e=null;window.stonks={event:l,view:w};let t=document.currentScript,r=t?.getAttribute("data-hash-routing")!==null,i=/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname)&&(location.protocol==="http:"||location.protocol==="https:")||location.protocol==="file:";if(i){let{hostname:n,devmode:a}=S(t,i);console.log(`[onedollarstats]
Script successfully connected! ${n?`Tracking your localhost as ${n}`:"Debug domain not set"}`),a&&n&&M(n,t?.getAttribute("data-url")||A)}async function p(n,a,c){if(navigator.sendBeacon?.(n,a)){c(!0);return}fetch(n,{method:"POST",body:a,headers:{"Content-Type":"application/json"},keepalive:!0}).then(()=>c(!0)).catch(s=>{console.error("[onedollarstats] fetch() failed:",s.message),c(!1)})}async function o(n){let a=t?.getAttribute("data-url")||A,{hostname:c,devmode:s}=S(t,i),d=new URL(c?`https://${c}${location.pathname}`:location.href);d.search="","path"in n&&n.path&&(d.pathname=n.path);let g=d.href.replace(/\/$/,""),u=n.referrer??void 0;if(!u){let m=document.referrer&&document.referrer!=="null"?document.referrer:void 0;if(m){let E=new URL(m);E.hostname!==d.hostname&&(u=E.href)}}let h={u:g,e:[{t:n.type,h:r,r:u,p:n.props}],debug:s};if(n.utm&&Object.keys(n.utm).length>0&&(h.qs=n.utm),h.debug){let m=`[onedollarstats]
Event name: ${n.type}
Event collected from: ${g}`;n.props&&Object.keys(n.props).length>0&&(m+=`
Props: ${JSON.stringify(n.props,null,2)}`),u&&(m+=`
Referrer: ${u}`),r&&(m+=`
HashRouting: ${r}`),n.utm&&Object.keys(n.utm).length>0&&(m+=`
UTM: ${n.utm}`),console.log(m)}let b=m=>window.__stonksModalLog?.(`${n.type} ${m?"sent":"failed to send"}`,m),k=JSON.stringify(h),B=new TextEncoder().encode(k),T=String.fromCharCode(...B),L=btoa(T);if(L.length<=1500){let m=new Image(1,1);m.onload=()=>b(!0),m.onerror=()=>p(a,k,b),m.src=`${a}?data=${L}`}else await p(a,k,b)}async function l(n,a,c){if(P())return;let s={};typeof a=="string"?(s.path=a,c&&(s.props=c)):typeof a=="object"&&(s.props=a);let d=s?.path||void 0;if(!d){let g=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");g&&(d=g)}o({type:n,props:s?.props,path:d})}function f(n){if(n.type==="auxclick"&&n.button!==1)return;let a=n.target;if(!a)return;let c=!!a.closest("a, button"),s=a,d=0;for(;s;){let g=s.getAttribute("data-s-event")||s.getAttribute("data-s:event");if(g){let u=s.getAttribute("data-s-event-props")||s.getAttribute("data-s:event-props"),h=u?_(u):void 0,b=s.getAttribute("data-s-event-path")||s.getAttribute("data-s:event-path")||void 0;l(g,b??h,h);return}if(s=s.parentElement,d++,!c&&d>=3)break}}async function w(n,a){let c={};typeof n=="string"?(c.path=n,a&&(c.props=a)):typeof n=="object"&&(c.props=n),y({path:c?.path,props:c?.props},!1)}async function y(n,a=!0){if(a&&P())return;let c=new URLSearchParams(location.search),s=G(c),d=n?.path||void 0;if(!d){let u=document.body?.getAttribute("data-s-path")||document.body?.getAttribute("data-s:path")||document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");u&&(d=u)}let g=n.props||void 0;if(!g){let u=t?.getAttribute("data-props"),h=u?_(u)||{}:{},b=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let k of Array.from(b)){let B=k.getAttribute("data-s-view-props")||k.getAttribute("data-s:view-props");if(!B)continue;let T=_(B);Object.assign(h,T)}g=h}o({type:"PageView",props:Object.keys(g).length>0?g:void 0,path:d,utm:s})}async function v(){let n=document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content"),a=document.body?.getAttribute("data-s-collect")||document.body?.getAttribute("data-s:collect");if(n==="false"||a==="false"){e=null;return}if(!(t?.getAttribute("data-autocollect")!=="false")&&n!=="true"&&a!=="true"){e=null;return}if(!r&&e===location.pathname){console.warn("Ignoring event PageView - pathname has not changed");return}if(P())return;e=location.pathname;let s=t?.getAttribute("data-props"),d=s?_(s)||{}:{},g=document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");for(let u of Array.from(g)){let h=u.getAttribute("data-s-view-props")||u.getAttribute("data-s:view-props");if(!h)continue;let b=_(h);Object.assign(d,b)}y({props:Object.keys(d).length>0?d:void 0},!1)}function P(){let{hostname:n,devmode:a}=S(t,i);if(i&&(!a||!n))return!0;let{isBot:c,botKind:s}=D();return!!(c&&s!=="human")}if(window.history.pushState){let n=window.history.pushState;window.history.pushState=function(a,c,s){n.apply(this,[a,c,s]),window.requestAnimationFrame(()=>{v()})},window.addEventListener("popstate",()=>{window.requestAnimationFrame(()=>{v()})})}document.visibilityState!=="visible"?document.addEventListener("visibilitychange",()=>{!e&&document.visibilityState==="visible"&&v()}):v(),document.addEventListener("click",f)})();})();
