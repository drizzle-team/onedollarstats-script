import { defaultCollectorUrl } from "./default-collector-url";

export const createDebugModal = (debugUrl: string, analyticsUrl: string) => {
  const style = document.createElement("style");
  style.textContent = `
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
        align-items:flex-start; 
        gap:4px; 
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
    `;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.className = "dev-modal";
  modal.innerHTML = `
      <button class="close-btn">&times;</button>
      <p class="title">
        onedollarstats debug window
      </p>
      <p>
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
       <span class="text">${`Tracking localhost as ${debugUrl}`}</span>
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;" />
    `;
  document.body.appendChild(modal);

  modal.querySelector(".close-btn")?.addEventListener("click", () => modal.remove(), { once: true });

  // "Logging" fn
  window.__stonksModalLog = (message: string, success?: boolean) => {
    const logContainer = modal.querySelector("#event-log");
    if (!logContainer) return;

    // Check if ad blocker warning exists
    const adBlockerWarning = modal.querySelector("#ad-blocker-warning");
    if (adBlockerWarning) return;

    const entry = document.createElement("p");
    const iconSvg = success
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-icon lucide-circle-check"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;

    entry.innerHTML = `${iconSvg} <span class="text">${message}</span>`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  };

  if (analyticsUrl === defaultCollectorUrl) {
    const img = new Image(1, 1);
    img.onerror = () => {
      const titleEl = modal.querySelector(".title");

      const adBlockWarning = document.createElement("p");
      adBlockWarning.id = "ad-blocker-warning";
      adBlockWarning.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span class="text">Health check failed - ad blocker might be interfering.</span>`;

      if (titleEl) titleEl.insertAdjacentElement("afterend", adBlockWarning);
      else modal.appendChild(adBlockWarning); // fallback
    };
    img.src = "https://collector.onedollarstats.com/pixel-health";
  }
};  