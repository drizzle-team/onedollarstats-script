export const loadDebugModal = (debugUrl: string, analyticsUrl: string) => {
  // Set initialization data for the modal script
  window.__stonksModalInit = {
    debugUrl,
    analyticsUrl
  };

  // Create and inject the modal script
  const script = document.createElement('script');
  script.src = `${analyticsUrl.replace('/events', '')}/modal.js`;
  script.async = true;
  
  // Handle script loading errors
  script.onerror = () => {
    console.error('[onedollarstats] Failed to load debug modal script');
    delete window.__stonksModalInit;
  };
  
  document.head.appendChild(script);
};