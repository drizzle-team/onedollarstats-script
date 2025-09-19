const window = {
  history: {
    pushState: () => {
      console.log("pushState");
    },
  },
};

// svelte
const pushState = window.history.pushState;

// script
const temp = window.history.pushState;
window.history.pushState = () => {
  console.log("patched");
  temp();
};

window.history.pushState();
pushState();
