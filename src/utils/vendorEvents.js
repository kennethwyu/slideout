const msPointerSupported = window.navigator.msPointerEnabled;
const html = window.document.documentElement;

export const touch = {
  start: msPointerSupported ? 'MSPointerDown' : 'touchstart',
  move: msPointerSupported ? 'MSPointerMove' : 'touchmove',
  end: msPointerSupported ? 'MSPointerUp' : 'touchend',
  cancel: 'touchcancel',
};

export const transition = {
  end: 'webkitTransitionEnd' in html.style ? 'webkitTransitionEnd' : 'transitionend',
};
