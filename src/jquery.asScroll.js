/*
 * scrollTo
 * https://github.com/amazingsurge/jquery-scrollTo
 *
 * Copyright (c) 2015 amazingsurge
 * Licensed under the GPL license.
 */

(function(window, document, $, undefined) {
  'use strict';
  // Constructor
  //

  var getTime = function() {
    if (typeof window.performance !== 'undefined' && window.performance.now) {
      return window.performance.now();
    } else {
      return Date.now();
    }
  };
  
  var isPercentage = function(n) {
    return typeof n === 'string' && n.indexOf('%') != -1;
  };

  var conventToPercentage = function(n) {
    if (n < 0) {
      n = 0;
    } else if (n > 1) {
      n = 1;
    }
    return parseFloat(n).toFixed(4) * 100 + '%';
  };

  var convertPercentageToFloat = function(n) {
    return parseFloat(n.slice(0, -1) / 100, 10);
  };

  var requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var cancelAnimationFrame = (function(id){
    return  window.cancelAnimationFrame       ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame    ||
            function( id ){
               window.clearTimeout( id );
            };
  })();


  var easingBezier = function(mX1, mY1, mX2, mY2) {
    function a(aA1, aA2) {
      return 1.0 - 3.0 * aA2 + 3.0 * aA1;
    }

    function b(aA1, aA2) {
      return 3.0 * aA2 - 6.0 * aA1;
    }

    function c(aA1) {
      return 3.0 * aA1;
    }

    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    function calcBezier(aT, aA1, aA2) {
      return ((a(aA1, aA2) * aT + b(aA1, aA2)) * aT + c(aA1)) * aT;
    }

    // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    function getSlope(aT, aA1, aA2) {
      return 3.0 * a(aA1, aA2) * aT * aT + 2.0 * b(aA1, aA2) * aT + c(aA1);
    }

    function getTForX(aX) {
      // Newton raphson iteration
      var aGuessT = aX;
      for (var i = 0; i < 4; ++i) {
        var currentSlope = getSlope(aGuessT, mX1, mX2);
        if (currentSlope === 0.0) return aGuessT;
        var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
        aGuessT -= currentX / currentSlope;
      }
      return aGuessT;
    }

    if (mX1 === mY1 && mX2 === mY2) {
      return {
        css: 'linear',
        fn: function(aX) {
          return aX;
        }
      };
    } else {
      return {
        css: 'cubic-bezier(' + mX1 + ',' + mY1 + ',' + mX2 + ',' + mY2 + ')',
        fn: function(aX) {
          return calcBezier(getTForX(aX), mY1, mY2);
        }
      }
    }
  };

  var asScroll = function(element, options) {
    var self = this;

    this.element = element;
    this.$element = $(element);
    this.options = $.extend(true, {}, asScroll.defaults, options);
    
  
    if(this.options.containerSelector){
      this.$container = $(this.options.containerSelector);
    }else{
      this.$container = this.$element.is(document.body) ? $(window) : this.$element.parent();  
    }
    if(this.$container.length !== 1) return;
    
    this.namespace = this.options.namespace;
    this.attributes = {
      vertical: {
        axis: 'Y',
        overflow: 'overflow-y',

        scroll: 'scrollTop',
        scrollLength: 'scrollHeight',
        pageOffset: 'pageYOffset',

        ffPadding: 'padding-right',

        length: 'height',
        clientLength: 'clientHeight',
        offset: 'offsetHeight',

        crossLength: 'width',
        crossClientLength: 'clientWidth',
        crossOffset: 'offsetWidth'
      },
      horizontal: {
        axis: 'X',
        overflow: 'overflow-x',

        scroll: 'scrollLeft',
        scrollLength: 'scrollWidth',
        pageOffset: 'pageXOffset',

        ffPadding: 'padding-bottom',

        length: 'width',
        clientLength: 'clientWidth',
        offset: 'offsetWidth',

        crossLength: 'height',
        crossClientLength: 'clientHeight',
        crossOffset: 'offsetHeight'
      }
    };


    this.classes = {
    };
    this.easing = asScroll.easing[this.options.easing] || asScroll.easing.ease;
    this._frameId = null;
    this._states = {};
  };
  
  $.extend(asScroll.easing = {}, {
    'ease': easingBezier(0.25, 0.1, 0.25, 1.0),
    'linear': easingBezier(0.00, 0.0, 1.00, 1.0),
    'ease-in': easingBezier(0.42, 0.0, 1.00, 1.0),
    'ease-out': easingBezier(0.00, 0.0, 0.58, 1.0),
    'ease-in-out': easingBezier(0.42, 0.0, 0.58, 1.0)
  });
  
  asScroll.prototype = {
    constructor : asScroll,

    init : function(){
      this.$targets = this.$element.find('[data-asScroll-target]');
      this.lists = {};
      

      this.vertical = true;

      this.$targets.each(function(){
        var $target = $(this);

        self.lists[$target.data('data-asScroll-target')] = {
          $el : $target
        }
      });
    },
    trigger: function(eventType) {
      var method_arguments = Array.prototype.slice.call(arguments, 1),
      data = [this].concat(method_arguments);

      // event
      this.$element.trigger('asScroll::' + eventType, data);

      // callback
      eventType = eventType.replace(/\b\w+\b/g, function(word) {
        return word.substring(0, 1).toUpperCase() + word.substring(1);
      });
      var onFunction = 'on' + eventType;

      if (typeof this.options[onFunction] === 'function') {
        this.options[onFunction].apply(this, method_arguments);
      }
    },

    /**
     * Checks whether the carousel is in a specific state or not.
     */
    is: function(state) {
        return this._states[state] && this._states[state] > 0;
    },
    /**
     * Enters a state.
     */
    enter: function(state) {
        if (this._states[state] === undefined) {
            this._states[state] = 0;
        }

        this._states[state] ++;
    },

    /**
     * Leaves a state.
     */
    leave: function(state) {
        this._states[state] --;
    },
    
    getOffset: function(direction) {
      var attributes = this.attributes[direction],
      container = this.$container[0];

      return (container[attributes.pageOffset] || container[attributes.scroll]);
    },

    getPercentOffset: function(direction) {
      return this.getOffset(direction) / this.getScrollLength(direction);
    },

    getContainerLength: function(direction) {
      return this.$container[0][this.attributes[direction].clientLength];
    },

    getScrollLength: function(direction) {
      var scrollLength = this.$element[0][this.attributes[direction].scrollLength];
      return scrollLength - this.getContainerLength(direction);
    },

    scrollTo: function(direction, value, trigger, sync) {
      var type = typeof value;

      if (type === "string") {
        if (isPercentage(value)) {
          value = convertPercentageToFloat(value) * this.getScrollLength(direction);
        }

        value = parseFloat(value);
        type = "number";
      }

      if (type !== "number") {
        return;
      }
      this.move(direction, value, trigger, sync);
    },

    scrollBy: function(direction, value, trigger, sync) {
      var type = typeof value;

      if (type === "string") {
        if (isPercentage(value)) {
          value = convertPercentageToFloat(value) * this.getScrollLength(direction);
        }

        value = parseFloat(value);
        type = "number";
      }

      if (type !== "number") {
        return;
      }

      this.move(direction, this.getOffset(direction) + value, trigger, sync);
    },

    move: function(direction, value, trigger, sync) {
      if ( typeof value !== "number") {
        return;
      }

      var self = this;

      this.enter('moving');

      if (value < 0) {
        value = 0;
      } else if (value > this.getScrollLength(direction)) {
        value = this.getScrollLength(direction);
      }

      var attributes = this.attributes[direction];

      var callback = function() {
        self.leave('moving');
      }
      
      if (sync) {
        this.$element[0][attributes.scroll] = value;

        if (trigger !== false) {
          this.trigger('change', value / this.getScrollLength(direction));
        }
        callback();
      } else {
        self.enter('animating');
        var startTime = getTime();
        var start = self.getOffset(direction);
        var end = value;

        var run = function(time) {
          var percent = (time - startTime) / self.options.duration;

          if (percent > 1) {
            percent = 1;
          }

          percent = self.easing.fn(percent);

          var current = parseFloat(start + percent * (end - start), 10);
          self.$element[0][attributes.scroll] = current;

          if (trigger !== false) {
            self.trigger('change', value / self.getScrollLength(direction));
          }

          if (percent === 1) {
            window.cancelAnimationFrame(self._frameId);
            self._frameId = null;

            self.leave('animating');
            callback();
          } else {
            self._frameId = window.requestAnimationFrame(run);
          }
        };

        self._frameId = window.requestAnimationFrame(run);
      }
    },
    scrollXto: function(value, trigger, sync) {
      return this.scrollTo('horizontal', value, trigger, sync);
    },

    scrollYto: function(value, trigger, sync) {
      return this.scrollTo('vertical', value, trigger, sync);
    },

    scrollXby: function(value, trigger, sync) {
      return this.scrollBy('horizontal', value, trigger, sync);
    },

    scrollYby: function(value, trigger, sync) {
      return this.scrollBy('vertical', value, trigger, sync);
    }
  };

  asScroll.defaults = {
    speed: '1000',
    easing: 'ease',
    namespace: 'asScroll',
    offsetTop: 50,
    mobile: {
      width: 768,
      speed: '500',
      easing: 'ease',
    }
  };


  $.fn.asScroll = function(options) {
    if (typeof options === 'string') {
      var method = options;
      var method_arguments = Array.prototype.slice.call(arguments, 1);

      return this.each(function() {
        var api = $.data(this, 'asScroll');

        if (api && typeof api[method] === 'function') {
          api[method].apply(api, method_arguments);
        }
      });
    } else {
      return this.each(function() {
        var api = $.data(this, 'asScroll');
        if (!api) {
          api = new asScroll(this, options);
          $.data(this, 'asScroll', api);
        }
      });
    }
  };
}(window, document, jQuery));
