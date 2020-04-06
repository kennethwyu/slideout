let addPassiveListener = (el, event, listener) => {
  el.addEventListener(event, listener, false);
  return () => el.removeEventListener(event, listener, false);
};

try {
  const options = Object.defineProperty({}, 'passive', {
    get() {
      addPassiveListener = (el, event, listener) => {
        el.addEventListener(event, listener, { passive: true });
        return () => el.removeEventListener(event, listener, { passive: true });
      };
      return true;
    },
  });

  window.addEventListener('test', null, options);
} catch (err) { // eslint-disable-line no-empty
}

export default (el, event, listener) => addPassiveListener(el, event, listener);
