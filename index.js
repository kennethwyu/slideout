'use strict';

/**
 * Module dependencies
 */
var decouple = require('decouple');
var Emitter = require('emitter');

/**
 * Privates
 */
var scrollTimeout;
var scrolling = false;
var doc = window.document;
var html = doc.documentElement;
var msPointerSupported = window.navigator.msPointerEnabled;
var touch = {
  start: msPointerSupported ? 'MSPointerDown' : 'touchstart',
  move: msPointerSupported ? 'MSPointerMove' : 'touchmove',
  end: msPointerSupported ? 'MSPointerUp' : 'touchend'
};
var transition = {
  end: 'webkitTransitionEnd' in html.style ? 'webkitTransitionEnd' : 'transitionend'
};

var prefix = (function prefix() {
  var regex = /^(Webkit|Khtml|Moz|ms|O)(?=[A-Z])/;
  var styleDeclaration = html.style;
  for (var prop in styleDeclaration) {
    if (regex.test(prop)) {
      return '-' + prop.match(regex)[0].toLowerCase() + '-';
    }
  }
  // Nothing found so far? Webkit does not enumerate over the CSS properties of the style object.
  // However (prop in style) returns the correct value, so we'll have to test for
  // the precence of a specific property
  if ('WebkitOpacity' in styleDeclaration) { return '-webkit-'; }
  if ('KhtmlOpacity' in styleDeclaration) { return '-khtml-'; }
  return '';
}());

var addPassiveListener = function(el, event, listener) {
  el.addEventListener(event, listener, false);
};

try {
  var options = Object.defineProperty({}, 'passive', {
    get: function() {
      addPassiveListener = function(el, event, listener) {
        el.addEventListener(event, listener, { passive: true });
      };
    }
  });

  window.addEventListener('test', null, options);
} catch(err) {
}


function hasIgnoredElements(el) {
  while (el.parentNode) {
    if (el.getAttribute('data-slideout-ignore') !== null) {
      return el;
    }
    el = el.parentNode;
  }
  return null;
}

/**
 * Slideout constructor
 */
function Slideout(options) {
  options = options || {};

  // Sets default values
  this._startOffsetX = 0;
  this._currentOffsetX = 0;
  this._opening = false;
  this._moved = false;
  this._opened = false;
  this._preventOpen = false;

  // Sets panel
  this.panel = options.panel;
  this.menu = options.menu;

  // Sets options
  this._touch = options.touch === undefined || !!options.touch;
  this._side = options.side || 'left';
  this._easing = options.easing || 'ease';
  this._duration = parseInt(options.duration, 10) || 300;
  this._tolerance = parseInt(options.tolerance, 10) || 70;
  this._padding = this._translateTo = parseInt(options.padding, 10) || window.innerWidth * 0.8;
  this._orientation = this._side === 'right' ? -1 : 1;
  this._translateTo *= this._orientation;

  var panelClassList = this.panel.classList;
  var menuClassList = this.menu.classList;
  // Sets  classnames
  if (!panelClassList.contains('slideout-panel')) {
    panelClassList.add('slideout-panel');
  }
  if (!panelClassList.contains('slideout-panel-' + this._side)) {
    panelClassList.add('slideout-panel-' + this._side);
  }
  if (!menuClassList.contains('slideout-menu')) {
    menuClassList.add('slideout-menu');
  }
  if (!menuClassList.contains('slideout-menu-' + this._side)) {
    menuClassList.add('slideout-menu-' + this._side);
  }

  if (this._touch) {
    this._initTouchEvents();
    this._touch = this._touch !== 'manual';
  }
}

Slideout.prototype = Object.create(Emitter.prototype);
Slideout.prototype.constructor = Slideout;

/**
 * Opens the slideout menu.
 */
Slideout.prototype.open = function() {
  var self = this;
  this.emit('beforeopen');
  if (!html.classList.contains('slideout-open')) {
    html.classList.add('slideout-open');
  }
  this._setTransition();
  this._translateXTo(this._translateTo);
  this._opened = true;

  this.panel.addEventListener(transition.end, function open() {
    self.panel.removeEventListener(transition.end, open);
    self.panel.style[prefix + 'transition'] = '';
    self.emit('open');
  });
  return this;
};

/**
 * Closes slideout menu.
 */
Slideout.prototype.close = function() {
  var self = this;
  if (!this.isOpen() && !this._opening) {
    return this;
  }
  this.emit('beforeclose');
  this._setTransition();
  this._translateXTo(0);
  this._opened = false;
  this.panel.addEventListener(transition.end, function close() {
    self.panel.removeEventListener(transition.end, close);
    html.classList.remove('slideout-open');
    self.panel.style[prefix + 'transition'] = '';
    self.panel.style[prefix + 'transform'] = '';
    self.emit('close');
  });
  return this;
};

/**
 * Toggles (open/close) slideout menu.
 */
Slideout.prototype.toggle = function() {
  return this.isOpen() ? this.close() : this.open();
};

/**
 * Returns true if the slideout is currently open, and false if it is closed.
 */
Slideout.prototype.isOpen = function() {
  return this._opened;
};

/**
 * Translates panel and updates currentOffset with a given X point
 */
Slideout.prototype._translateXTo = function(translateX) {
  this._currentOffsetX = translateX;
  this.panel.style[prefix + 'transform'] = 'translateX(' + translateX + 'px)';
  return this;
};

/**
 * Set transition properties
 */
Slideout.prototype._setTransition = function() {
  this.panel.style[prefix + 'transition'] = prefix + 'transform ' + this._duration + 'ms ' + this._easing;
};

/**
 * Initializes touch event
 */
Slideout.prototype._initTouchEvents = function() {
  var self = this;

  /**
   * Decouple scroll event
   */
  var notScrolling = function() {
    scrolling = false;
  };
  this._onScrollFn = decouple(doc, 'scroll', function() {
    if (!self._moved) {
      clearTimeout(scrollTimeout);
      scrolling = true;
      scrollTimeout = setTimeout(notScrolling, 250);
    }
  });

  /**
   * Resets values on touchstart
   */
  this._resetTouchFn = function(eve) {
    if (typeof eve.touches === 'undefined') {
      return;
    }

    self._moved = false;
    self._opening = false;
    self._startOffsetX = eve.touches[0].pageX;
    self._preventOpen = (!self._touch || (!self.isOpen() && self.menu.clientWidth !== 0));
  };

  addPassiveListener(this.panel, touch.start, this._resetTouchFn);

  /**
   * Resets values on touchcancel
   */
  this._onTouchCancelFn = function() {
    self._moved = false;
    self._opening = false;
  };

  addPassiveListener(this.panel, 'touchcancel', this._onTouchCancelFn);

  /**
   * Toggles slideout on touchend
   */
  this._onTouchEndFn = function() {
    if (self._moved) {
      self.emit('translateend');
      (self._opening && Math.abs(self._currentOffsetX) > self._tolerance) ? self.open() : self.close();
    }
    self._moved = false;
  };

  addPassiveListener(this.panel, touch.end, this._onTouchEndFn);

  /**
   * Translates panel on touchmove
   */
  this._onTouchMoveFn = function(eve) {
    if (
      scrolling ||
      self._preventOpen ||
      typeof eve.touches === 'undefined' ||
      hasIgnoredElements(eve.target)
    ) {
      return;
    }

    var dif_x = eve.touches[0].clientX - self._startOffsetX;
    var translateX = self._currentOffsetX = dif_x;

    if (Math.abs(translateX) > self._padding) {
      return;
    }

    if (Math.abs(dif_x) > 20) {

      self._opening = true;

      var oriented_dif_x = dif_x * self._orientation;

      if (self._opened && oriented_dif_x > 0 || !self._opened && oriented_dif_x < 0) {
        return;
      }

      if (!self._moved) {
        self.emit('translatestart');
      }

      if (oriented_dif_x <= 0) {
        translateX = dif_x + self._padding * self._orientation;
        self._opening = false;
      }

      if (!(self._moved && html.classList.contains('slideout-open'))) {
        html.classList.add('slideout-open');
      }

      self.panel.style[prefix + 'transform'] = 'translateX(' + translateX + 'px)';
      self.emit('translate', translateX);
      self._moved = true;
    }

  };

  addPassiveListener(this.panel, touch.move, this._onTouchMoveFn);

  return this;
};

/**
 * Enable opening the slideout via touch events.
 */
Slideout.prototype.enableTouch = function() {
  this._touch = true;
  return this;
};

/**
 * Disable opening the slideout via touch events.
 */
Slideout.prototype.disableTouch = function() {
  this._touch = false;
  return this;
};

/**
 * Destroy an instance of slideout.
 */
Slideout.prototype.destroy = function() {
  // Close before clean
  this.close();

  // Remove event listeners
  this.panel.removeEventListener(touch.start, this._resetTouchFn);
  this.panel.removeEventListener('touchcancel', this._onTouchCancelFn);
  this.panel.removeEventListener(touch.end, this._onTouchEndFn);
  this.panel.removeEventListener(touch.move, this._onTouchMoveFn);
  doc.removeEventListener('scroll', this._onScrollFn);

  // Return the instance so it can be easily dereferenced
  return this;
};

/**
 * Expose Slideout
 */
module.exports = Slideout;
