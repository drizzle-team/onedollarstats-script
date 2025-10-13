// Debug modal with SVG icons
export const createDebugModal = (debugUrl: string | null) => {
  // Styles
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
    `;
  document.head.appendChild(style);

  // Modal
  const modal = document.createElement("div");
  modal.className = "dev-modal";
  modal.innerHTML = `
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
          <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="800" fill="gray" font-family="Arial, sans-serif">i</text>
          <circle cx="8" cy="11" r="1" fill="gray"/>
        </svg> ${debugUrl ? `Tracking your localhost as ${debugUrl}` : "Debug URL not set"}
      </p>
      <div id="event-log" style="max-height: 100px; overflow-y: auto;"></div>
    `;
  document.body.appendChild(modal);

  modal.querySelector(".close-btn")?.addEventListener("click", () => modal.remove(), { once: true });

  // Logging function
  window.__stonksModalLog = (message: string, success?: boolean) => {
    const logContainer = modal.querySelector("#event-log");
    if (!logContainer) return;

    const entry = document.createElement("p");
    let iconSvg = "";
    if (success) {
      iconSvg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="green" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="green" stroke-width="2" fill="none"/>
          <path d="M5 8.5l2 2 4-4" stroke="green" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    } else {
      iconSvg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="red" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="red" stroke-width="2" fill="none"/>
        <line x1="5" y1="5" x2="11" y2="11" stroke="red" stroke-width="2" stroke-linecap="round"/>
        <line x1="11" y1="5" x2="5" y2="11" stroke="red" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }

    entry.innerHTML = `<span>${iconSvg}</span> ${message}`;
    logContainer.appendChild(entry);

    logContainer.scrollTop = logContainer.scrollHeight;
  };
};
