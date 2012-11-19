/*
A simple drawing application for touch devices.
Loïc Fontaine - http://github.com/lfont - MIT Licensed
*/

define([
    "jquery",
    "backbone",
    "underscore",
    "drawing",
    "models/settings",
    "i18n!nls/drawer-manager",
    "lib/drawing.event",
    "lib/jquery.mobile.toast"
], function ($, Backbone, _, drawing, settingsModel, drawerManagerResources) {
    "use strict";

    return function (canvas, socket) {
        var drawer = drawing.canvasDrawer(canvas),
            shapeDrawer = drawer.eventShapeDrawer({
                events: {
                    down: "vmousedown",
                    up: "vmouseup",
                    move: "vmousemove"
                }
            }),

            initialize = function () {
                var histories = settingsModel.get("histories");

                drawer.newDrawing(settingsModel.get("background"));
                drawer.properties({
                    lineWidth: settingsModel.get("lineWidth"),
                    strokeStyle: settingsModel.get("strokeStyle"),
                    fillStyle: settingsModel.get("fillStyle"),
                    lineCap: settingsModel.get("lineCap")
                });

                if (histories.length > 0) {
                    drawer.histories(histories);
                    drawer.history(settingsModel.get("history"));
                }

                // drawer socket messages
                socket.on("invite-response", function (response) {
                    if (!response.accepted) {
                        return;
                    }
                    
                    shapeDrawer.addDrawnHandler(function (shape) {
                        socket.draw({
                            to: response.sender,
                            shape: shape
                        });
                    });
                });

                socket.on("invite-accepted", function (fromUser) {
                    shapeDrawer.addDrawnHandler(function (shape) {
                        socket.draw({
                            to: fromUser,
                            shape: shape
                        });
                    });
                });

                socket.on("draw", function (data) {
                    drawer.draw(data.shape);
                });
            };

        initialize();

        this.undo = function () {
            if (!drawer.undo()) {
                $.mobile.showToast(drawerManagerResources.lastUndo);
            }

            return this;
        };

        this.redo = function () {
            if (!drawer.redo()) {
                $.mobile.showToast(drawerManagerResources.lastRedo);
            }

            return this;
        };

        this.on = function () {
            window.setTimeout(function () {
                shapeDrawer.on(settingsModel.get("shape"));
            }, 250);

            return this;
        };

        this.off = function () {
            settingsModel.set({
                histories: drawer.histories(),
                history: drawer.history()
            });

            shapeDrawer.off();

            return this;
        };

        this.shape = function (name) {
            if (_.isString(name)) {
                settingsModel.set({
                    shape: name
                });
            }

            return settingsModel.get("shape");
        };

        this.color = function (hex) {
            var properties;

            if (_.isString(hex)) {
                properties = {
                    strokeStyle: hex,
                    fillStyle: hex
                };
                settingsModel.set(properties);
                drawer.properties(properties);
            }

            return settingsModel.get("strokeStyle");
        };

        this.lineWidth = function (value) {
            var properties;

            if (_.isNumber(value)) {
                properties = {
                    lineWidth: value
                };
                settingsModel.set(properties);
                drawer.properties(properties);
            }

            return settingsModel.get("lineWidth");
        };

        this.history = function (value) {
            if (_.isNumber(value)) {
                drawer.history(value);
            }

            return drawer.history();
        };

        this.newDrawing = function (hex) {
            settingsModel.set({
                histories: null,
                history: null
            }, { silent: true });

            drawer.newDrawing(hex);

            settingsModel.set({
                background: hex,
                shape: "pencil",
                histories: drawer.histories(),
                history: drawer.history()
            });
        };

        this.clear = function () {
            drawer.clear().store();
        };

        this.getDataURL = function () {
            return drawer.histories()[drawer.history()];
        };

        this.unload = function () {
            var histories = drawer.histories(),
                history = drawer.history();

            settingsModel.set({
                histories: (histories.length > 10) ?
                    histories.slice(histories.length - 10) :
                    histories,
                history: (history >= histories.length) ?
                    histories.length - 1 :
                    history
            });

            return this;
        };
    };
});
