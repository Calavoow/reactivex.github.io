///<reference path="../RxJS/ts/rx.d.ts"/>
///<reference path="../RxJS/ts/rx.testing.d.ts"/>
///<reference path="../RxJS/ts/rx.async.d.ts"/>
///<reference path="../RxJS/ts/rx.binding.d.ts"/>
///<reference path="../RxJS/ts/rx.time.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// A constant defining the size of the notification drawings.
var eventRadius = 20;

var Notification = (function () {
    function Notification(x, color) {
        this.x = x;
        this.color = Util.randomColor();
        if (color)
            this.color = color;
    }
    Notification.prototype.toRecorded = function () {
        throw new Error("toRecorded not implemented");
    };

    Notification.prototype.draw = function (gfx, y, op_y, isOutput) {
        throw new Error("draw not implemented");
    };
    return Notification;
})();

var Evt = (function (_super) {
    __extends(Evt, _super);
    function Evt(x, shape, color) {
        _super.call(this, x, color);
        this.shape = shape;
        this.shape = shape;
    }
    Evt.prototype.toRecorded = function () {
        return Rx.ReactiveTest.onNext(this.x, this);
    };

    Evt.prototype.draw = function (gfx, y, op_y, isOutput) {
        switch (this.shape) {
            case "circle":
                gfx.fill_circle(this.x, y, this.color, false);
                break;
            case "square":
                gfx.fill_square(this.x, y, this.color, false);
        }
        gfx.draw_arrow_to_op(this, y, op_y, isOutput);
    };
    return Evt;
})(Notification);

var Err = (function (_super) {
    __extends(Err, _super);
    function Err(x, color) {
        _super.call(this, x, color);
    }
    Err.prototype.toRecorded = function () {
        return Rx.ReactiveTest.onError(this.x, this);
    };

    Err.prototype.draw = function (gfx, y, op_y, isOutput) {
        gfx.draw_cross(this.x, y, this.color);
        gfx.draw_arrow_to_op(this, y, op_y, isOutput);
    };
    return Err;
})(Notification);

var Complete = (function (_super) {
    __extends(Complete, _super);
    function Complete(x, color) {
        _super.call(this, x, color);
    }
    Complete.prototype.toRecorded = function () {
        return Rx.ReactiveTest.onCompleted(this.x);
    };

    Complete.prototype.draw = function (gfx, y, op_y, isOutput) {
        gfx.draw_line(this.x, y - eventRadius, this.x, y + eventRadius, "#000000");
    };
    return Complete;
})(Notification);

var Stream = (function () {
    function Stream(start, end, isOutput, shape) {
        this.start = start;
        this.end = end;
        this.isOutput = isOutput;
        if (shape)
            this.shape = shape;
        if (!isOutput && shape == null) {
            throw Error("Expected shape");
        }
        this.notifications = [];
    }
    Stream.prototype.draw = function (gfx, op_y) {
        throw new Error("draw not implemented");
    };
    return Stream;
})();

var BasicStream = (function (_super) {
    __extends(BasicStream, _super);
    function BasicStream() {
        _super.apply(this, arguments);
    }
    BasicStream.prototype.addEvent = function (x, shape, color) {
        if (shape)
            this.addEvt(new Evt(x, shape, color));
        else
            this.addEvt(new Evt(x, this.shape, color));

        return this;
    };

    BasicStream.prototype.addEvt = function (evt) {
        if (this.isOutput) {
            this.notifications.push(evt);
        } else if (this.removeNotif(evt)) {
            // If the event overlaps with another event, remove it.
        } else if (this.validNotification(evt)) {
            this.notifications.push(evt);
        }
        return this;
    };

    BasicStream.prototype.setError = function (x, color) {
        return this.setErr(new Err(x, color));
    };

    BasicStream.prototype.setErr = function (err) {
        return this.setUnique(err);
    };

    BasicStream.prototype.setCompleteTime = function (x) {
        return this.setComplete(new Complete(x));
    };

    BasicStream.prototype.setComplete = function (compl) {
        return this.setUnique(compl);
    };

    BasicStream.prototype.setUnique = function (notif) {
        if (this.isOutput) {
            this.notifications.push(notif);
        } else if (this.removeNotif(notif)) {
        } else if (notif.x - eventRadius > this.start.x && notif.x + eventRadius < this.end.x) {
            this.notifications.push(notif);

            // Maintain the stream invariant property
            this.notifications = this.notifications.filter(this.validNotification, this);
        }
        return this;
    };

    /**
    * If the location of where the Event is to be added already contains a notification, remove that instead.
    **/
    BasicStream.prototype.removeNotif = function (notif) {
        var notifIdx = this.onNotification(notif.x);
        if (notifIdx != null) {
            this.notifications.splice(notifIdx, 1);
            return true;
        } else {
            return false;
        }
    };

    /**
    * Invariant property of Notifications
    **/
    BasicStream.prototype.validNotification = function (notif) {
        // Contains all notifications that should be unique
        var uniqueNotifs = this.notifications.filter(function (curNotif) {
            return curNotif instanceof Err || curNotif instanceof Complete;
        });

        // Check if there are notifications that should not be in the list.
        if (notif instanceof Err || notif instanceof Complete) {
            // If this notification is the last one added to uniqueNotifs, it is valid.
            return notif.x === uniqueNotifs[uniqueNotifs.length - 1].x;
        } else {
            // If this Notification occurs before the latest unique notification, then that is part 1.
            var notifBeforeEnd = !uniqueNotifs.some(function (uniqueNotif) {
                return notif.x + eventRadius >= uniqueNotif.x;
            });

            // And if it is after the start of the Stream then it is valid.
            return notifBeforeEnd && notif.x - eventRadius > this.start.x;
        }
    };

    /**
    * Find if the mouse is on a notification in this stream.
    * @return The index of the notification it is on otherwise null.
    **/
    BasicStream.prototype.onNotification = function (x) {
        for (var i in this.notifications) {
            var notif = this.notifications[i];
            if (Util.diff(notif.x, x) < 2 * eventRadius) {
                return i;
            }
        }
        return null;
    };

    BasicStream.prototype.toObservable = function (scheduler) {
        var notifs = this.notifications.map(function (notif) {
            return notif.toRecorded();
        });

        return scheduler.createColdObservable.apply(scheduler, notifs);
    };

    BasicStream.prototype.draw = function (gfx, op_y) {
        var _this = this;
        this.notifications.forEach(function (notif) {
            var y = Util.intersection(_this, notif.x);
            notif.draw(gfx, y, op_y, _this.isOutput);
        });
        gfx.draw_arrow(this.start, this.end);
    };

    BasicStream.fromJson = function (json, y) {
        var start = { x: json["start"], y: y };
        var end = { x: json["maxEnd"], y: y };
        var stream = new BasicStream(start, end, false, json["shape"]);
        json["notifications"].forEach(function (notif) {
            switch (notif.type) {
                case "Event":
                    stream.addEvent(notif.x, notif.shape, notif.color);
                    break;
                case "Error":
                    stream.setError(notif.x, notif.color);
                    break;
                case "Complete":
                    stream.setCompleteTime(notif.x);
                    break;
                default:
                    throw Error("Unkown notification type.");
                    console.log(notif);
            }
        });
        return stream;
    };
    return BasicStream;
})(Stream);

/**
* GRAPHICS
**/
var Graphics = (function () {
    function Graphics(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }
    Graphics.prototype.draw_arrow_to_op = function (notif, y, op_y, isOutput) {
        if (isOutput) {
            this.draw_dashed_arrow(notif.x, op_y + 2.5 * eventRadius, y - eventRadius);
        } else {
            this.draw_dashed_arrow(notif.x, y + eventRadius, op_y);
        }
    };

    Graphics.prototype.draw_cursor = function (mousePos, currStream) {
        // Check if currStream not null
        if (currStream) {
            var isMarked = (currStream.onNotification(mousePos.x) != null) || !currStream.validNotification(new Notification(mousePos.x));
            var y = Util.intersection(currStream, mousePos.x);
            switch (currStream.shape) {
                case "circle":
                    return this.draw_circle(mousePos.x, y, "red", isMarked);
                case "square":
                    return this.draw_square(mousePos.x, y, "red", isMarked);
            }
        }
    };

    Graphics.prototype.draw_operator = function (op_y) {
        this.ctx.beginPath();
        this.ctx.rect(10, op_y, this.canvas.width - 20, 2.5 * eventRadius);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "#000000";
        this.ctx.stroke();
    };

    /**
    * GRAPHICAL PRIMITIVES
    **/
    Graphics.prototype.draw_line = function (fromx, fromy, tox, toy, color) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = color;
        this.ctx.moveTo(fromx, fromy);
        this.ctx.lineTo(tox, toy);
        this.ctx.stroke();
    };

    Graphics.prototype.draw_cross = function (centerx, centery, color) {
        this.draw_line(centerx - eventRadius, centery + eventRadius, centerx + eventRadius, centery - eventRadius, color);
        this.draw_line(centerx - eventRadius, centery - eventRadius, centerx + eventRadius, centery + eventRadius, color);
    };

    Graphics.prototype.draw_arrow = function (from, to) {
        this.ctx.beginPath();

        // Draw the line
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "#000000";
        this.ctx.moveTo(from.x, from.y);

        var norm = Util.normalizeVector(Util.makeVector(from, to));
        var arrowBase = { x: to.x - norm.x * eventRadius, y: to.y - norm.y * eventRadius };
        this.ctx.lineTo(arrowBase.x, arrowBase.y);

        // Draw the arrow
        var perp = Util.perpendicularVector(norm);
        this.ctx.moveTo(arrowBase.x - perp.x * eventRadius, arrowBase.y - 0.5 * perp.y * eventRadius);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.lineTo(arrowBase.x + perp.x * eventRadius, arrowBase.y + 0.5 * perp.y * eventRadius);
        this.ctx.closePath();
        this.ctx.stroke();
    };

    Graphics.prototype.draw_dashed_arrow = function (x, fromy, toy) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "#000000";
        this.ctx.setLineDash([4, 7]);
        this.ctx.moveTo(x, fromy);
        this.ctx.lineTo(x, toy - eventRadius);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.setLineDash([]);
        this.ctx.moveTo(x - 0.5 * eventRadius, toy - eventRadius);
        this.ctx.lineTo(x, toy);
        this.ctx.lineTo(x + 0.5 * eventRadius, toy - eventRadius);
        this.ctx.closePath();
        this.ctx.stroke();
    };

    Graphics.prototype.draw_circle = function (centerx, centery, color, isMarked) {
        this.circle(centerx, centery, color, isMarked, function (ctx) {
            ctx.stroke();
        });
    };

    Graphics.prototype.fill_circle = function (centerx, centery, color, isMarked) {
        this.circle(centerx, centery, color, isMarked, function (ctx) {
            ctx.fill();
        });
    };

    Graphics.prototype.circle = function (centerx, centery, color, isMarked, drawFunc) {
        this.ctx.beginPath();
        this.ctx.arc(centerx, centery, eventRadius, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = color;
        drawFunc(this.ctx);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
        this.ctx.stroke();
    };

    Graphics.prototype.draw_square = function (centerx, centery, color, isMarked) {
        this.square(centerx, centery, color, isMarked, false);
    };

    Graphics.prototype.fill_square = function (centerx, centery, color, isMarked) {
        this.square(centerx, centery, color, isMarked, true);
    };

    Graphics.prototype.square = function (centerx, centery, color, isMarked, doFill) {
        this.ctx.beginPath();
        this.ctx.rect(centerx - eventRadius, centery - eventRadius, 2 * eventRadius, 2 * eventRadius);
        if (doFill) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
        this.ctx.stroke();
    };
    return Graphics;
})();

var Util;
(function (Util) {
    /**
    * Get the current input stream that is being moused over.
    * @return The currently mouse over stream or null
    **/
    function getCurrentStream(mousePos, inputStreams) {
        var selectedStream = null;
        var minDistance = Number.POSITIVE_INFINITY;
        for (var i in inputStreams) {
            var stream = inputStreams[i];
            var y = Util.intersection(stream, mousePos.x);
            var distance = this.diff(y, mousePos.y);
            if (distance < minDistance && distance < 2 * eventRadius) {
                minDistance = distance;
                selectedStream = stream;
            }
        }
        return selectedStream;
    }
    Util.getCurrentStream = getCurrentStream;

    function diff(a, b) {
        return Math.abs(a - b);
    }
    Util.diff = diff;

    /**
    * Get the largest y value from the streams and add 3 * eventRadius
    **/
    function operator_y(streams) {
        return streams.reduce(function (accum, stream) {
            if (stream.start.y > accum) {
                return stream.start.y;
            } else if (stream.end.y > accum) {
                return stream.end.y;
            } else {
                return accum;
            }
        }, 0) + eventRadius * 3;
    }
    Util.operator_y = operator_y;

    function randomColor() {
        var letters = "0123456789ABCDEF".split("");
        var color = "#";
        var i = 0;
        while (i < 6) {
            color += letters[Math.round(Math.random() * 15)];
            i++;
        }
        return color;
    }
    Util.randomColor = randomColor;

    function randomShape() {
        var shapes = ["circle", "square"];
        return shapes[Util.randomInt(0, 1)];
    }
    Util.randomShape = randomShape;

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    Util.randomInt = randomInt;

    function httpGet(theUrl) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", theUrl, false);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    }
    Util.httpGet = httpGet;

    function getJson(url) {
        return JSON.parse(Util.httpGet(url));
    }
    Util.getJson = getJson;

    function triggeredObservable(source, trigger) {
        return Rx.Observable.create(function (observer) {
            var atEnd;
            var hasValue;
            var value;

            function triggerSubscribe() {
                if (hasValue) {
                    observer.onNext(value);
                }
                if (atEnd) {
                    observer.onCompleted();
                }
            }

            return new Rx.CompositeDisposable(source.subscribe(function (newValue) {
                hasValue = true;
                value = newValue;
            }, observer.onError.bind(observer), function () {
                atEnd = true;
            }), trigger.subscribe(triggerSubscribe, observer.onError.bind(observer), triggerSubscribe));
        });
    }
    Util.triggeredObservable = triggeredObservable;

    /**
    * Calculates the y intersection on the line from start to end at x.
    **/
    function intersectionPoints(start, end, x) {
        var coeff = (end.y - start.y) / (end.x - start.x);
        return (x - start.x) * coeff + start.y;
    }
    Util.intersectionPoints = intersectionPoints;

    function intersection(stream, x) {
        return Util.intersectionPoints(stream.start, stream.end, x);
    }
    Util.intersection = intersection;

    function normalizeVector(vector) {
        var x = vector.x;
        var y = vector.y;
        var len = x * x + y * y;
        if (len > 0) {
            var ilen = 1 / Math.sqrt(len);
            return { x: x * ilen, y: y * ilen };
        }
        return undefined;
    }
    Util.normalizeVector = normalizeVector;

    function perpendicularVector(vector) {
        return { x: -vector.y, y: vector.x };
    }
    Util.perpendicularVector = perpendicularVector;

    function makeVector(start, end) {
        return { x: end.x - start.x, y: end.y - start.y };
    }
    Util.makeVector = makeVector;
})(Util || (Util = {}));

var MarbleDrawer = (function () {
    function MarbleDrawer(canvas, streamJson, createOutputStream) {
        var _this = this;
        var streams = this.initialiseStreamsJson(streamJson);
        var op_y = streams.reduce(function (accum, stream) {
            return accum + 4 * eventRadius;
        }, 0) + 2 * eventRadius;
        var mousePos = Rx.Observable.fromEvent(canvas, 'mousemove').map(function (evt) {
            var rect = canvas.getBoundingClientRect();
            return evt != null ? {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            } : {
                x: 0,
                y: 0
            };
        }).startWith({ x: -1337, y: -1337 });

        // On mouse out of the canvas set the mouse position to somewhere 'invisible'.
        var mouseOut = Rx.Observable.fromEvent(canvas, 'mouseout');
        mousePos = mousePos.merge(mouseOut.map(function (evt) {
            return { x: -1337, y: -1337 };
        }));

        // On mouse down add an event to the current stream.
        var mouseDown = Rx.Observable.fromEvent(canvas, 'mousedown');
        Util.triggeredObservable(mousePos, mouseDown).subscribe(this.mouseDownHandler(streams));

        // When a key is pressed, add the appriopriate notification to the stream.
        var keypress = Rx.Observable.fromEvent(canvas, 'keypress');
        var combined = keypress.combineLatest(mousePos, function (s1, s2) {
            return { 1: s1, 2: s2 };
        });

        // Every keypress, trigger the output.
        Util.triggeredObservable(combined, keypress).subscribe(this.keyboardHandler(streams));

        // On any user event, update the canvas.
        mousePos.combineLatest(keypress.merge(mouseDown).startWith(''), // Only return the mouse pos
        function (s1, s2) {
            return s1;
        }).throttle(1).subscribe(function (mouseEvt) {
            // Update the output stream
            var outputStream = createOutputStream(streams, op_y);
            _this.render(canvas, mouseEvt, streams, outputStream, op_y);
        });
    }
    MarbleDrawer.prototype.initialiseStreamsJson = function (streamJson) {
        var y = 2 * eventRadius;
        return streamJson["streams"].map(function (json) {
            var r = BasicStream.fromJson(json, y);
            y += 4 * eventRadius;
            return r;
        });
    };

    MarbleDrawer.prototype.mouseDownHandler = function (streams) {
        return function (mousePos) {
            var currStream = Util.getCurrentStream(mousePos, streams);
            if (currStream)
                currStream.addEvent(mousePos.x);
        };
    };

    MarbleDrawer.prototype.keyboardHandler = function (streams) {
        return function (evts) {
            var mousePos = evts[2];
            var currStream = Util.getCurrentStream(mousePos, streams);
            if (currStream) {
                switch (evts[1].which) {
                    case 101:
                        currStream.setError(mousePos.x);
                        break;
                    case 99:
                        currStream.setCompleteTime(mousePos.x);
                }
            }
        };
    };

    MarbleDrawer.prototype.render = function (canvas, mousePos, inputStreams, outputStream, op_y) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var gfx = new Graphics(canvas, ctx);
        var allStreams = inputStreams.concat(outputStream);
        allStreams.forEach(function (stream) {
            stream.draw(gfx, op_y);
        });
        gfx.draw_cursor(mousePos, Util.getCurrentStream(mousePos, inputStreams));
        gfx.draw_operator(op_y);
    };
    return MarbleDrawer;
})();
