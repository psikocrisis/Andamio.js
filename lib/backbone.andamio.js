/*!
 * backbone.andamio v1.0.0 - 2013-05-05
 * http://andamiojs.com
 * Copyright (c) 2013 Denis Ciccale (@tdecs)
 * Released under the MIT license
 * https://github.com/dciccale/Andamio.js/blob/master/LICENSE.txt
 */
(function (global, Backbone, _) {
  'use strict';

  var Andamio = {
    // use default DOM library
    $: Backbone.$
  };

  Andamio.View = Backbone.View.extend({
  constructor: function () {
    _.bindAll(this);
    this._bindSubviews();
    Backbone.View.apply(this, arguments);
  },

  render: function () {
    this.isClosed = false;

    var data = this._serializeData(data);
    this.$el.html(this.template(data));

    this._bindRegions();
    this._bindUIElements();

    if (_.isFunction(this.afterRender)) {
      this.afterRender();
    }

    return this;
  },

  _serializeData: function (data) {
    data = this.model ? this.model.toJSON() : this.collection ? this.collection.toJSON() : data
    return this._mixinTemplateHelpers(data);
  },

  _bindRegions: function () {
    var that = this;
    var $regions = that.$('[data-region]');
    var show = function ($el) {
      return function (view) {
        view.$el = $el;
        view.render();
      }
    };

    if (!$regions.length) {
      return;
    }

    // regions hash
    that.regions = {};

    // populate regions hash
    $regions.each(function (i, el) {
      var $el = $(el);
      var key = $el.attr('data-region');
      that.regions[key] = {$el: $el, show: show($el)};
      // if a region matches with a subview, set that el for the view
      if (that.subviews[key]) {
        that.subviews[key].$el = $el;
      }
    });
  },

  _unbindRegions: function () {
    if (!this.regions) {
      return;
    }

    // delete all of the existing ui bindings
    this._deleteProp(this.regions);
    this.regions = {};
  },

  _bindUIElements: function () {
    this._bindProp('ui', function (bindings, prop, key) {
      this[prop][key] = this.$(bindings[key]);
    });
  },

  // this method unbinds the elements specified in the "ui" hash
  _unbindUIElements: function () {
    this._unbindProp('ui');
  },

  _bindSubviews: function () {
    // create hash of subviews (name: view)
    this._bindProp('subviews', function (bindings, prop, key) {
      this[prop][key] = new bindings[key];
    });
  },

  _unbindSubviews: function () {
    this._unbindProp('subviews');
  },

  _unbindProp: function (prop) {
    var _prop = '_' + prop;
    if (!this[prop]) {
      return;
    }

    this._deleteProp(this[prop]);
    this[prop] = this[_prop];
    delete this[_prop];
  },

  // bind property hash saving default config
  _bindProp: function (prop, callback) {
    var _prop = '_' + prop;

    if (!this[prop]) {
      return;
    }

    if (!this[_prop]) {
      this[_prop] = this[prop];
    }

    var bindings = _.result(this, _prop);

    this[prop] = {};

    _.each(_.keys(bindings), function (key) {
      callback.call(this, bindings, prop, key);
    }, this);
  },

  _removeSubviews: function () {
    this._deleteProp(this.subviews, function (view) {
      view.remove();
    });
  },

  _deleteProp: function (obj, callback) {
    _.each(obj, function (item, name) {
      if (callback) {
        callback.call(this, item, name);
      }
      delete obj[name];
    }, this);
    delete obj;
  },

  remove: function () {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;

    // remove sub views
    this._removeSubviews();

    // unbind region and ui elements
    this._unbindRegions();
    this._unbindUIElements();

    // remove the view from the dom
    this.remove();
  },

  _mixinTemplateHelpers: function (target) {
    target = target || {};
    var templateHelpers = this.templateHelpers;
    if (_.isFunction(templateHelpers)) {
      templateHelpers = templateHelpers.call(this);
    }
    return _.extend(target, templateHelpers);
  }
});

  Andamio.Router = Backbone.Router.extend({
  constructor: function (options) {
    this._initRoutes();
  },

  viewsPath: 'views/',

  _initRoutes: function () {
    _.each(this.routes, function (route) {
      var view = route.view;
      var callback = this._routeCallback(view);
      this.route(route.url, view, callback);
    }, this);
  },

  _routeCallback: function (view) {
    var router = this;
    var callback = function () {
      var urlParams = arguments;
      require([router.viewsPath + view], function (View) {
        var _view = new View;
        if (_.isFunction(_view.loadModel)) {
          _view.loadModel.apply(_view, urlParams);
        }
        router.trigger('navigate', _view, name, urlParams);
      });
    };
    return callback;
  }
});

  Andamio.Application = function (options) {
  _.extend(this, options);
  this.listenTo(this.router, 'navigate', this.show);
  this.initialize.apply(this, arguments);
};

_.extend(Andamio.Application.prototype, Backbone.Events, {
  el: 'body',

  // starts the app
  start: function () {
    this.initialize.apply(this, arguments);
  },

  initialize: function () {},

  show: function (view, name, urlParams) {
    this._ensureEl();
    if (view !== this.currentView) {
      this._close();
      view.render();
    } else {
      view.render();
    }
    return this.currentView = view;
  },

  _ensureEl: function () {
    if (!this.$el || this.$el.length === 0) {
      this.$el = $(this.el);
    }
  },

  _open: function (view) {
    this.$el.empty().append(view.el);
  },

  _close: function () {
    if (this.currentView) {
      this.currentView.remove();
    }
  }
});

Andamio.Application.extend = Andamio.extend;


  // expose Andamio
  global.Andamio = Backbone.Andamio = Andamio;

  // exports
  (function (root, factory) {
    if (typeof exports === 'object') {
      var underscore = require('underscore');
      var backbone = require('backbone');
      module.exports = factory(underscore, backbone);

    } else if (typeof define === 'function' && define.amd) {
      define(['underscore', 'backbone'], factory);
    }
  }(this, function (_, Backbone) {
    return Andamio;
  }));

}(this, Backbone, _));