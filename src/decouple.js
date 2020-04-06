import addPassiveListener from './passiveListener';

const FRAME_PER_SEC = 1000 / 60;
const requestAnimationFrame = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || ((callback) => setTimeout(callback, FRAME_PER_SEC));

export default function decouple(node, eventName, fn) {
  let waiting = false;
  let event;

  const update = () => {
    fn.call(node, event);
    waiting = false;
  };

  return addPassiveListener(node, eventName, (e) => {
    event = e;

    if (!waiting) {
      requestAnimationFrame(update);
      waiting = true;
    }
  });
}
