console.log('script 4 exec');

(() => {
  console.log('script 4 iife');

  if (!window.history.pushState) return;
  console.log('script 4 window.history.pushState exists');
  const originalPushState = window.history.pushState;
  window.history.pushState = function (data, unused, url) {
    originalPushState.apply(this, [data, unused, url]);
    window.requestAnimationFrame(() => {
      console.log('pushstate 4');
    });
  };
})();
