if (typeof exports !== 'undefined') {
  var fs = require('fs');
  var jsdom = require('jsdom').jsdom;
  var html = fs.readFileSync('./test/index.html', 'utf-8');
  var document = jsdom(html);
  window = document.defaultView;
  var slideout = require('../dist/umd');
  var assert = require('better-assert');

  var oldAddEventListener = window.HTMLElement.prototype.addEventListener;
  window.HTMLElement.prototype.addEventListener = function addEventListener(event, listener, options) {
    if (event === 'transitionend') {
      var match = this.style.transition.match(/(\d+)(\w+)/) || []
      var duration = Number(match[1]) || 200;

      if (match[1] === 's') {
        duration *= 1000
      }

      setTimeout(listener, duration + 50);
    } else {
      oldAddEventListener.call(this, event, listener, options);
    }
  };
}


var doc = window.document;
var beforeopenEvent = false;
var openEvent = false;
var beforecloseEvent = false;
var closeEvent = false;
var drawer;

describe('Slideout', function () {

  before(function () {
    drawer = new slideout.Slideout({
      panel: doc.getElementById('panel'),
      menu: doc.getElementById('menu'),
      padding: 256
    });

    drawer.on('beforeopen', function() {
      beforeopenEvent = true;
    });
    drawer.on('open', function() {
      openEvent = true;
    });
    drawer.on('beforeclose', function() {
      beforecloseEvent = true;
    });
    drawer.on('close', function() {
      closeEvent = true;
    });
  });

  it('should be defined.', function () {
    assert(slideout !== undefined);
  });

  it('should be a function.', function () {
    assert(typeof slideout.Slideout === 'function');
  });

  it('should return a new instance.', function () {
    assert(drawer instanceof slideout.Slideout);
  });

  it('should add classnames to panel and menu DOM elements.', function () {
    assert(drawer.panel.className.search('slideout-panel') !== -1);
    assert(drawer.panel.className.search('slideout-panel-left') !== -1);
    assert(drawer.menu.className.search('slideout-menu') !== -1);
    assert(drawer.menu.className.search('slideout-menu-left') !== -1);
  });

  describe('.open()', function () {
    it('should add "slideout-open" classname to HTML.', function () {
      assert(doc.documentElement.className.search('slideout-open') === -1);
      drawer.open();
      assert(doc.documentElement.className.search('slideout-open') !== -1);
    });

    it('should translateX the panel to the given padding.', function () {
      console.log(drawer.panel.style.transform, drawer.panel.style.transition)
      assert(drawer.panel.style.transform === 'translateX(256px)');
      assert(drawer.panel.style.transition.search(/transform 300ms ease/) !== -1);
    });

    it('should set _opened to true.', function () {
      assert(drawer._opened === true);
    });

    it('should emit "beforeopen" event.', function () {
      assert(beforeopenEvent === true);
    });

    it('should emit "open" event.', function (done) {
      setTimeout(function(){
        assert(openEvent === true);
        done();
      }, 400);

    });
  });

  describe('.isOpen()', function () {
    it('should return true if the drawer is opened.', function () {
      assert(drawer.isOpen());
    });
  });

  describe('.close()', function () {
    it('should remove "slideout-open" classname to HTML.', function (done) {
      assert(doc.documentElement.className.search('slideout-open') !== -1);
      drawer.close();
      setTimeout(function(){
        assert(doc.documentElement.className.search('slideout-open') === -1);
        done();
      }, 350);

    });

    it('should translateX the panel to 0.', function () {
      assert(drawer.panel.style.transform === '');
      assert(drawer.panel.style.transition === '');
    });

    it('should set _opened to false.', function () {
      assert(drawer._opened === false);
    });

    it('should emit "beforeclose" event.', function () {
      assert(beforecloseEvent === true);
    });

    it('should emit "close" event.', function () {
      assert(closeEvent === true);
    });
  });

  describe('.toggle()', function () {
    it('should show the drawer if it is not opened.', function (done) {
      assert(doc.documentElement.className.search('slideout-open') === -1);
      drawer.toggle();
      assert(doc.documentElement.className.search('slideout-open') !== -1);
      drawer.toggle();
      setTimeout(function(){
        assert(doc.documentElement.className.search('slideout-open') === -1);
        done();
      }, 350);
    });
  });

  describe('.destroy()', function() {
    it('should destroy the instance internals allowing a new one to be created in it\'s place.', function(){
      drawer.destroy();
      drawer = new slideout.Slideout({
        'panel': doc.getElementById('panel'),
        'menu': doc.getElementById('menu')
      });
      drawer.open();
      setTimeout(function(){ drawer.close(); }, 750);
    });
  });
});
