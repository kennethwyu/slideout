const html = window.document.documentElement;

export const VENDOR_PREFIX = (() => {
  const options = ['Webkit', 'Khtml', 'Moz', 'ms', 'O'];

  for (let i = 0; i < options.length; i++) {
    if (`${options[i]}Opacity` in html.style) {
      return `-${options[i].toLowerCase()}-`;
    }
  }
  return '';
})();

export function setStyle(el, prop, value) {
  el.style[VENDOR_PREFIX + prop] = value;
}
