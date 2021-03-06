/*
A simple canvas drawing library.
Loïc Fontaine - http://github.com/lfont - MIT Licensed
*/

(function (window, $) {
    "use strict";
    var defaultOptions = {
            backgroundColor: "transparent",
            historicSize: 100
        },
        managedCanvasProperties = [
            "strokeStyle",
            "fillStyle",
            "lineWidth",
            "lineCap"
        ],
        
        restoreContextImage = function (context, imageDataURL) {
            var image = new window.Image();
            
            image.onload = function () {
                context.drawImage(image, 0, 0);
            };
            
            image.src = imageDataURL;
        },
        
        getContextProperties = function (context) {
            var properties = {},
                i, len, property;
            
            for (i = 0, len = managedCanvasProperties.length; i < len; i++) {
                property = managedCanvasProperties[i];
                properties[property] = context[property];
            }
            
            return properties;
        },
        
        setContextProperties = function (context, properties) {
            var notDefined, i, len, property;
            
            for (i = 0, len = managedCanvasProperties.length; i < len; i++) {
                property = managedCanvasProperties[i];
                if (properties[property] !== notDefined) {
                    context[property] = properties[property];
                }
            }
        },
        
        drawCanvasBackground = function (canvas, context, color) {
            var fillStyle = context.fillStyle;

            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = fillStyle;
        },
        
        clearCanvas = function (canvas) {
            canvas.width = canvas.width;
        },
        
        buildLineDrawer = function () {
            var drawLine = function (context, origin, current) {
                    context.beginPath();
                    context.lineTo(origin.x, origin.y);
                    context.lineTo(current.x, current.y);
                    context.stroke();
                };
            
            return function (context) {
                var lineContext,
                    line = {
                        begin: function (shapeContext) {
                            lineContext = shapeContext;
                        },
                        draw: function (position) {
                            lineContext.restore();
                            drawLine(context, lineContext.origin, position);
                            lineContext.commands[0] = {
                                name: "draw",
                                position: position
                            };
                        }
                    };
                
                return line;
            };
        },
        
        buildRectangleDrawer = function () {
            var drawRectangle = function (context, origin, current) {
                    var width = current.x - origin.x,
                        height = current.y - origin.y;
                    
                   context.strokeRect(origin.x, origin.y,
                    width, height);
                };
        
            return function (context) {
                var rectangleContext,
                    rectangle = {
                        begin: function (shapeContext) {
                            rectangleContext = shapeContext;
                        },
                        draw: function (position) {
                            rectangleContext.restore();
                            drawRectangle(context, rectangleContext.origin,
                                position);
                            rectangleContext.commands[0] = {
                                name: "draw",
                                position: position
                            };
                        }
                    };
                
                return rectangle;
            };
        },
        
        buildCircleDrawer = function () {
            var drawCircle = function (context, origin, current) {
                    var px = Math.pow(current.x - origin.x, 2),
                        py = Math.pow(current.y - origin.y, 2),
                        radius = Math.sqrt(px + py);
                    
                    context.beginPath();
                    context.arc(origin.x, origin.y, radius,
                        0, Math.PI * 2, false);
                    context.stroke();
                };
        
            return function (context) {
                var circleContext,
                    circle = {
                        begin: function (shapeContext) {
                            circleContext = shapeContext;
                        },
                        draw: function (position) {
                            circleContext.restore();
                            drawCircle(context, circleContext.origin, position);
                            circleContext.commands[0] = {
                                name: "draw",
                                position: position
                            };
                        }
                    };
                
                return circle;
            };
        },

        buildPencilDrawer = function () {
            var drawPoint = function (context, current) {
                    var radius = Math.round(context.lineWidth / 2);
        
                    context.arc(current.x, current.y,
                        radius > 0 && radius || 1,
                        0, Math.PI * 2, false);
                    context.fill();
                },
                drawLine = function (context, current) {
                    context.lineTo(current.x, current.y);
                    context.stroke();
                };
                            
            return function (context) {
                var pencilContext,
                    hasBegin,
                    hasDrawn,
                    pencil = {
                        begin: function (shapeContext) {
                            pencilContext = shapeContext;
                            hasBegin = true;
                            hasDrawn = false;
                            context.beginPath();
                        },
                        draw: function (position) {
                            hasDrawn = true;
                            drawLine(context, position);
                            pencilContext.commands.push({
                                name: "draw",
                                position: position
                            });
                        },
                        end: function () {
                            if (!hasBegin) return;
                            
                            context.closePath();
                            if (!hasDrawn) {
                                drawPoint(context, pencilContext.origin);
                                pencilContext.commands.push({
                                    name: "end",
                                    position: null
                                });
                            }
                            hasBegin = false;
                        }
                    };
                
                return pencil;
            };
        },

        CanvasDrawer = function (canvas, options) {
            var context = canvas.getContext("2d"),
                opts = $.extend({}, defaultOptions, options),
                histories, historyIndex, background, properties;
                
            this.canvas = function () {
                return canvas;
            };

            this.properties = function (newProperties) {
                if (newProperties) {
                    setContextProperties(context, newProperties);
                    properties = getContextProperties(context);
                }
                
                return getContextProperties(context);
            };
            
            this.histories = function (newHistories) {
                if (newHistories) {
                    histories = newHistories;
                    if (historyIndex > histories.length - 1) {
                        historyIndex = histories.length - 1;
                    }
                }
                
                return histories.slice(0);
            };
                
            this.history = function (index) {
                if (index || index === 0) {
                    historyIndex = index;
                    clearCanvas(canvas);
                    setContextProperties(context, properties);
                    restoreContextImage(context, histories[index]);
                }
                
                return historyIndex;
            };
            
            this.store = function () {
                if (histories.length === opts.historicSize) {
                    histories.shift();
                }
                histories.push(canvas.toDataURL());
                historyIndex = (histories.length - 1);
                return this;
            };
            
            this.clear = function () {
                clearCanvas(canvas);
                setContextProperties(context, properties);
                drawCanvasBackground(canvas, context, background);
                return this;
            };
            
            this.newDrawing = function (backgroundColor) {
                histories = [];
                historyIndex = 0;
                clearCanvas(canvas);
                properties = getContextProperties(context);
                background = backgroundColor || opts.backgroundColor;
                drawCanvasBackground(canvas, context, background);
                return this.store();
            };
            
            this.newDrawing();
        };
    
    CanvasDrawer.prototype = {
        shapeDrawer: function (kind) {
            var that = this,
                canvas = that.canvas(),
                context = canvas.getContext("2d"),
                shapeDrawer = window.drawing.shapes[kind](context),
                shapeContext = {};
            
            if (!shapeDrawer) {
                throw new Error("Unknown shape kind: " + kind);
            }
            
            return {
                begin: function (position) {
                    var image = context.getImageData(
                        0, 0,
                        canvas.width,
                        canvas.height);
                        
                    shapeContext.commands = [];
                    shapeContext.origin = position;
                    shapeContext.restore = function () {
                        that.clear();
                        context.putImageData(image, 0, 0);
                    };
                    
                    shapeDrawer.begin(shapeContext);
                },
                draw: function (position) {
                    shapeDrawer.draw(position);
                },
                end: function () {
                    if (shapeDrawer.hasOwnProperty("end")) {
                        shapeDrawer.end();
                    }
                    
                    that.store();
                    
                    return {
                        kind: kind,
                        properties: that.properties(),
                        origin: shapeContext.origin,
                        commands: shapeContext.commands
                    };
                }
            };
        },
        draw: function (shape) {
            var shapeDrawer = this.shapeDrawer(shape.kind),
                properties = this.properties(),
                i, len, command;
            
            this.properties(shape.properties);
            
            shapeDrawer.begin(shape.origin);
            for (i = 0, len = shape.commands.length; i < len; i++) {
                command = shape.commands[i];
                shapeDrawer[command.name](command.position);
            }
            
            this.properties(properties);
            
            return this;
        },
        undo: function () {
            var history = this.history(),
                isFirst = (history <= 0);
            
            if (!isFirst) {
                this.history(history - 1);
            }
            
            return !isFirst;
        },
        redo: function () {
            var history = this.history(),
                isLast = (history + 1 >= this.histories().length);
            
            if (!isLast) {
                this.history(history + 1);
            }
            
            return !isLast;
        },
        save: function () {
            window.location.href =
                this.canvas()
                    .toDataURL()
                    .replace("image/png", "image/octet-stream");
            return this;
        }
    };
    
    if (typeof(window.drawing) !== "object") {
        window.drawing = {
            canvasDrawer: function (canvas, options) {
                return new CanvasDrawer(canvas, options);
            },
            shapes: {
                line: buildLineDrawer(),
                rectangle: buildRectangleDrawer(),
                circle: buildCircleDrawer(),
                pencil: buildPencilDrawer()
            }
        };
        
        window.drawing.canvasDrawer.fn = CanvasDrawer.prototype;
    }
}(window, window.jQuery));
