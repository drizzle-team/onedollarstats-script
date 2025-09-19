console.log('script 3 exec');

(() => {
  console.log('script 3 iife');

  if (!window.history.pushState) return;
  console.log('script 3 window.history.pushState exists');
  const originalPushState = window.history.pushState;
  window.history.pushState = function (data, unused, url) {
    originalPushState.apply(this, [data, unused, url]);
    window.requestAnimationFrame(() => {
      console.log('pushstate 3');
    });
  };
})();
