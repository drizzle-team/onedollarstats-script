"use strict";(()=>{var i={hostname:null,devmode:!1,collectorUrl:"https://collector.onedollarstats.com/events",hashRouting:!1,autocollect:!0,excludePages:[],includePages:[]};var c=(n,s)=>{if(!document.getElementById("onedollatstats-modal-styles")){let t=document.createElement("style");t.id="onedollatstats-modal-styles",t.textContent=d,document.head.appendChild(t)}let e=document.createElement("div");if(e.className="dev-modal",e.innerHTML=`
    <button class="close-btn">&times;</button>
    <p class="title">onedollarstats debug window</p>
    <p>${a.info}<span class="text">Tracking localhost as ${n}</span></p>
    <div id="event-log" style="max-height: 100px; overflow-y: auto;"></div>
  `,document.body.appendChild(e),e.querySelector(".close-btn")?.addEventListener("click",()=>e.remove(),{once:!0}),s===i.collectorUrl){let t=new Image(1,1);t.onerror=()=>{if(e.querySelector("#ad-blocker-warning"))return;let o=document.createElement("p");o.id="ad-blocker-warning",o.innerHTML=`${a.warning}<span class="text">Health check failed - ad blocker might be interfering.</span>`,e.querySelector(".title")?.insertAdjacentElement("afterend",o)},t.src="https://collector.onedollarstats.com/pixel-health"}return(t,o)=>{let r=e.querySelector("#event-log");if(!r||e.querySelector("#ad-blocker-warning"))return;let l=document.createElement("p");l.innerHTML=`${o?a.success:a.error}<span class="text">${t}</span>`,r.appendChild(l),r.scrollTop=r.scrollHeight}},a={info:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',success:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',error:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',warning:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'},d=`
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
}`;(()=>{let n=window.__stonksDebugConfig;if(!n)return;let s=c(n.hostname,n.collectorUrl);window.__stonksModalLog=s;let e=window.__stonksModalQueue;if(e){for(let[t,o]of e)s(t,o);e.length=0}window.__stonksModalReady=!0})();})();
