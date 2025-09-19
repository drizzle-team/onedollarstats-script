(() => {
  if (!window.history.pushState) return;

  const originalPushState = window.history.pushState;
  window.history.pushState = function (data, unused, url) {
    originalPushState.apply(this, [data, unused, url]);
    window.requestAnimationFrame(() => {
      console.log("pushstate 2");
    });
  };
})();
