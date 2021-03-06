/*
A simple drawing application for touch devices.
Loïc Fontaine - http://github.com/lfont - MIT Licensed
*/

define([
    'jquery',
    'lib/jquery.mobile',
    'backbone',
    'underscore',
    'collections/colors',
    'views/color-picker',
    'text!/templates/tools.html',
    'i18n!nls/tools-view'
], function ($, mobile, Backbone, _, colorsCollection, ColorPickerView,
             toolsTemplate, toolsResources) {
    'use strict';

    return Backbone.View.extend({
        events: {
            'pagebeforeshow': 'pagebeforeshow',
            'pagehide': 'pagehide',
            'popupbeforeposition': 'popupbeforeposition',
            'popupafterclose': 'popupafterclose'
        },

        template: _.template(toolsTemplate),

        initialize: function () {
            var notDefined;
            this.isPopup = this.options.positionTo !== notDefined &&
                           this.options.positionTo !== null;
        },

        render: function () {
            var _this = this;

            this.$el.html(this.template({
                        r: toolsResources
                    }))
                    .addClass('tools-view');

            if (this.isPopup) {
                this.$el.trigger('create')
                        .popup();
            } else {
                this.$el.attr('data-url', 'tools')
                        .attr('data-role', 'dialog')
                        .page();
            }

            this.shapeColorPicker = new ColorPickerView({
                el: this.$el.find('.color-picker'),
                colors: colorsCollection.withoutTransparent()
            }).render();

            this.shapeColorPicker.on('color', function (hex) {
                _this.options.drawer.color(hex);
            });

            return this;
        },

        show: function () {
            if (this.isPopup) {
                this.$el.popup('open', {
                    positionTo: this.options.positionTo
                });
            } else {
                mobile.changePage(this.$el);
            }
        },

        pagebeforeshow: function () {
            var $shapes = this.$el.find('.shape'),
                $width = this.$el.find('.width');

            $shapes.filter('[value="' + this.options.drawer.shape() + '"]')
                   .attr('checked', true)
                   .checkboxradio('refresh');

            $width.val(this.options.drawer.lineWidth())
                  .slider('refresh');

            this.shapeColorPicker.value(this.options.drawer.color());
            this.trigger('open');
        },

        pagehide: function () {
            var $shape = this.$el.find('.shape:checked'),
                $width = this.$el.find('.width');

            this.options.drawer.shape($shape.val());
            this.options.drawer.lineWidth(parseInt($width.val(), 10));
            this.trigger('close');
        },

        popupbeforeposition: function () {
            this.pagebeforeshow();
        },

        popupafterclose: function () {
            this.pagehide();
        }
    });
});
