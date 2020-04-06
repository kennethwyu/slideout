import decouple from './decouple';
import addPassiveListener from './passiveListener';
import { VENDOR_PREFIX, setStyle } from './utils/vendorCss';
import { touch, transition } from './utils/vendorEvents';

const doc = window.document;
const html = doc.documentElement;

function hasIgnoredElements(el) {
  let currentElement = el;

  while (currentElement.parentNode) {
    if (currentElement.getAttribute('data-slideout-ignore') !== null) {
      return currentElement;
    }
    currentElement = currentElement.parentNode;
  }
  return null;
}

let scrolling = false;

export default class Slideout {
  constructor(options = {}) {
    this.panel = options.panel;
    this.menu = options.menu;
    this._eventsEmitter = options.eventsEmitter || this.panel;

    // initial values
    this._startOffsetX = 0;
    this._currentOffsetX = 0;
    this._opening = false;
    this._moved = false;
    this._opened = false;
    this._preventOpen = false;

    // Sets options
    this._touch = typeof options.touch === 'undefined' || !!options.touch;
    this._side = options.side || 'left';
    this._easing = options.easing || 'ease';
    this._duration = parseInt(options.duration, 10) || 300;
    this._tolerance = parseInt(options.tolerance, 10) || 70;
    this._padding = parseInt(options.padding, 10) || window.innerWidth * 0.8;
    this._translateTo = this._padding;
    this._orientation = this._side === 'right' ? -1 : 1;
    this._translateTo *= this._orientation;

    this._setCssClasses();

    if (this._touch) {
      this._initTouchEvents();
      this._touch = this._touch !== 'manual';
    }
  }

  _setCssClasses() {
    const panelClassList = this.panel.classList;
    const menuClassList = this.menu.classList;

    if (!panelClassList.contains('slideout-panel')) {
      panelClassList.add('slideout-panel');
    }

    if (!panelClassList.contains(`slideout-panel-${this._side}`)) {
      panelClassList.add(`slideout-panel-${this._side}`);
    }

    if (!menuClassList.contains('slideout-menu')) {
      menuClassList.add('slideout-menu');
    }

    if (!menuClassList.contains(`slideout-menu-${this._side}`)) {
      menuClassList.add(`slideout-menu-${this._side}`);
    }
  }

  _emit(name) {
    this._eventsEmitter.dispatchEvent(new window.CustomEvent(name));
    return this;
  }

  on(name, listener, options) {
    this._eventsEmitter.addEventListener(name, listener, options);
    return () => this._eventsEmitter.removeEventListener(name, listener, options);
  }

  open() {
    this._emit('beforeopen');

    if (!html.classList.contains('slideout-open')) {
      html.classList.add('slideout-open');
    }

    this._setTransition();
    this._translateXTo(this._translateTo);
    this._opened = true;

    const self = this;
    this.panel.addEventListener(transition.end, function open() {
      self.panel.removeEventListener(transition.end, open);
      setStyle(self.panel, 'transition', '');
      self._emit('open'); // eslint-disable-line no-underscore-dangle
    });
    return this;
  }

  close() {
    if (!this.isOpen() && !this._opening) {
      return this;
    }

    this._emit('beforeclose');
    this._setTransition();
    this._translateXTo(0);
    this._opened = false;

    const self = this;
    this.panel.addEventListener(transition.end, function close() {
      self.panel.removeEventListener(transition.end, close);
      html.classList.remove('slideout-open');
      setStyle(self.panel, 'transition', '');
      setStyle(self.panel, 'transform', '');
      self._emit('close'); // eslint-disable-line no-underscore-dangle
    });
    return this;
  }

  toggle() {
    return this.isOpen() ? this.close() : this.open();
  }

  isOpen() {
    return this._opened;
  }

  _translateXTo(x) {
    this._currentOffsetX = x;
    setStyle(this.panel, 'transform', `translateX(${x}px)`);
  }

  _setTransition() {
    setStyle(this.panel, 'transition', `${VENDOR_PREFIX}transform ${this._duration}ms ${this._easing}`);
  }

  _initTouchEvents() {
    const notScrolling = () => {
      scrolling = false;
    };
    let scrollTimeout;

    this._unwatchScroll = decouple(doc, 'scroll', () => {
      if (!this._moved) {
        clearTimeout(scrollTimeout);
        scrolling = true;
        scrollTimeout = setTimeout(notScrolling, 250);
      }
    });

    this._unwatchTouch = addPassiveListener(this.panel, touch.start, (event) => {
      if (typeof event.touches === 'undefined') {
        return;
      }

      this._moved = false;
      this._opening = false;
      this._startOffsetX = event.touches[0].pageX;
      this._preventOpen = !this._touch || !this.isOpen() && this.menu.clientWidth !== 0;
    });

    this._unwatchTouchCancel = addPassiveListener(this.panel, touch.cancel, () => {
      this._moved = false;
      this._opening = false;
    });

    this._unwatchTouchEnd = addPassiveListener(this.panel, touch.end, () => {
      if (this._moved) {
        this._emit('translateend');

        if (this._opening && Math.abs(this._currentOffsetX) > this._tolerance) {
          this.open();
        } else if (this._translateTo - Math.abs(this._currentOffsetX) <= this._tolerance / 2) {
          this._setTransition();
          this._translateXTo(this._translateTo);

          const self = this;
          this.panel.addEventListener(transition.end, function back() {
            this.panel.removeEventListener(transition.end, back);
            setStyle(self.panel, 'transition', '');
          });
        } else {
          this.close();
        }
      }

      this._moved = false;
    });

    this._unwatchTouchMove = addPassiveListener(this.panel, touch.move, (event) => {
      const shouldIgnore = scrolling
        || this._preventOpen
        || typeof event.touches === 'undefined'
        || hasIgnoredElements(event.target);

      if (shouldIgnore) {
        return;
      }

      const diffX = event.touches[0].clientX - this._startOffsetX;
      let translateX = diffX;
      this._currentOffsetX = diffX;

      if (Math.abs(translateX) > this._padding || Math.abs(diffX) <= 20) {
        return;
      }

      this._opening = true;
      const orientedDiffX = diffX * this._orientation;

      if (this._opened && orientedDiffX > 0 || !this._opened && orientedDiffX < 0) {
        return;
      }

      if (!this._moved) {
        this._emit('translatestart');
      }

      if (orientedDiffX <= 0) {
        translateX = diffX + this._padding * this._orientation;
        this._opening = false;
      }

      if (!(this._moved && html.classList.contains('slideout-open'))) {
        html.classList.add('slideout-open');
      }

      setStyle(this.panel, 'transform', `translateX(${translateX}px)`);
      this._emit('translate', translateX);
      this._moved = true;
    });
  }

  enableTouch() {
    this._touch = true;
    return this;
  }

  disableTouch() {
    this._touch = false;
    return this;
  }

  destroy() {
    this.close();
    this._unwatchTouch();
    this._unwatchTouchCancel();
    this._unwatchTouchEnd();
    this._unwatchTouchMove();
    this._unwatchScroll();
  }
}
