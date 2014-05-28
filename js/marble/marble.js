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
        this.color = Util.random_color();
        if (color)
            this.color = color;
    }
    return Notification;
})();

var Evt = (function (_super) {
    __extends(Evt, _super);
    function Evt(x, shape, color) {
        _super.call(this, x, color);
        this.shape = shape;
        this.shape = shape;
    }
    return Evt;
})(Notification);

var Err = (function (_super) {
    __extends(Err, _super);
    function Err(x, color) {
        _super.call(this, x, color);
    }
    return Err;
})(Notification);

var Complete = (function (_super) {
    __extends(Complete, _super);
    function Complete(x, color) {
        _super.call(this, x, color);
    }
    return Complete;
})(Notification);

var Stream = (function () {
    function Stream(y, start, maxEnd, isOutput, shape) {
        this.y = y;
        this.start = start;
        this.maxEnd = maxEnd;
        this.isOutput = isOutput;
        if (shape)
            this.shape = shape;
        if (!isOutput && shape == null) {
            throw Error("Expected shape");
        }
        this.notifications = [];
    }
    Stream.prototype.addEvent = function (x, shape, color) {
        if (shape)
            this.addEvt(new Evt(x, shape, color));
        else
            this.addEvt(new Evt(x, this.shape, color));

        return this;
    };

    Stream.prototype.addEvt = function (evt) {
        if (this.isOutput) {
            this.notifications.push(evt);
        } else if (this.removeNotif(evt)) {
            // If the event overlaps with another event, remove it.
        } else if (this.validNotification(evt)) {
            this.notifications.push(evt);
        }
        return this;
    };

    Stream.prototype.setError = function (x, color) {
        return this.setErr(new Err(x, color));
    };

    Stream.prototype.setErr = function (err) {
        return this.setUnique(err);
    };

    Stream.prototype.setCompleteTime = function (x) {
        return this.setComplete(new Complete(x));
    };

    Stream.prototype.setComplete = function (compl) {
        return this.setUnique(compl);
    };

    Stream.prototype.setUnique = function (notif) {
        if (this.isOutput) {
            this.notifications.push(notif);
        } else if (this.removeNotif(notif)) {
        } else if (notif.x - eventRadius > this.start && notif.x + eventRadius < this.maxEnd) {
            this.notifications.push(notif);

            // Maintain the stream invariant property
            this.notifications = this.notifications.filter(this.validNotification, this);
        }
        return this;
    };

    /**
    * If the location of where the Event is to be added already contains a notification, remove that instead.
    **/
    Stream.prototype.removeNotif = function (notif) {
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
    Stream.prototype.validNotification = function (notif) {
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
            return notifBeforeEnd && notif.x - eventRadius > this.start;
        }
    };

    /**
    * Find if the mouse is on a notification in this stream.
    * @return The index of the notification it is on otherwise null.
    **/
    Stream.prototype.onNotification = function (x) {
        for (var i in this.notifications) {
            var notif = this.notifications[i];
            if (Util.diff(notif.x, x) < 2 * eventRadius) {
                return i;
            }
        }
        return null;
    };

    Stream.prototype.toObservable = function (scheduler) {
        var notifs = this.notifications.map(function (notif) {
            if (notif instanceof Evt)
                return Rx.ReactiveTest.onNext(notif.x, notif);
            else if (notif instanceof Err)
                return Rx.ReactiveTest.onError(notif.x, notif);
            else if (notif instanceof Complete)
                return Rx.ReactiveTest.onCompleted(notif.x);
            else
                throw Error("Something wrong with notification type");
        });

        return scheduler.createColdObservable.apply(scheduler, notifs);
    };

    Stream.fromJson = function (json, y) {
        var stream = new Stream(y, json["start"], json["maxEnd"], false, json["shape"]);
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
    return Stream;
})();


/**
* GRAPHICS
**/
var Graphics = (function () {
    function Graphics(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }
    Graphics.prototype.draw_stream = function (stream, op_y) {
        var maxEnd = 500;
        stream.notifications.forEach(function (notif) {
            if (notif instanceof Evt)
                this.draw_event(stream, notif, op_y);
            else if (notif instanceof Err)
                this.draw_error(stream, notif, op_y);
            else if (notif instanceof Complete) {
                this.draw_complete(stream, notif);
                maxEnd = notif.x + 3 * eventRadius;
            } else {
            }
        }, this);
        this.draw_arrow(stream.start, maxEnd, stream.y);
    };

    Graphics.prototype.draw_event = function (stream, event, op_y) {
        switch (event.shape) {
            case "circle":
                this.fill_circle(event.x, stream.y, event.color, false);
                break;
            case "square":
                this.fill_square(event.x, stream.y, event.color, false);
        }
        return this.draw_arrow_to_op(stream, event, op_y);
    };

    Graphics.prototype.draw_error = function (stream, error, op_y) {
        this.draw_cross(error.x, stream.y, error.color);
        return this.draw_arrow_to_op(stream, error, op_y);
    };

    Graphics.prototype.draw_complete = function (stream, complete) {
        return this.draw_line(complete.x, stream.y - eventRadius, complete.x, stream.y + eventRadius, "#000000");
    };

    Graphics.prototype.draw_arrow_to_op = function (stream, notif, op_y) {
        if (stream.isOutput) {
            this.draw_dashed_arrow(notif.x, op_y + 2.5 * eventRadius, stream.y - eventRadius);
        } else {
            this.draw_dashed_arrow(notif.x, stream.y + eventRadius, op_y);
        }
    };

    Graphics.prototype.draw_cursor = function (mousePos, currStream) {
        if (Util.is_on_stream(mousePos, currStream)) {
            var isMarked = (currStream.onNotification(mousePos.x) != null) || !currStream.validNotification(new Notification(mousePos.x));
            switch (currStream.shape) {
                case "circle":
                    return this.draw_circle(mousePos.x, currStream.y, "red", isMarked);
                case "square":
                    return this.draw_square(mousePos.x, currStream.y, "red", isMarked);
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

    Graphics.prototype.draw_arrow = function (fromx, tox, y) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "#000000";
        this.ctx.moveTo(fromx, y);
        this.ctx.lineTo(tox - eventRadius, y);
        this.ctx.moveTo(tox - eventRadius, y - 0.5 * eventRadius);
        this.ctx.lineTo(tox, y);
        this.ctx.lineTo(tox - eventRadius, y + 0.5 * eventRadius);
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

var Util = (function () {
    function Util() {
    }
    Util.getCurrentStream = function (mousePos, streams) {
        var selectedStream;
        var minDistance = Number.POSITIVE_INFINITY;
        for (var i in streams) {
            var stream = streams[i];
            var distance = this.diff(stream.y, mousePos.y);
            if (distance < minDistance) {
                minDistance = distance;
                selectedStream = stream;
            }
        }
        return selectedStream;
    };

    Util.test = function () {
        var numbers = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            numbers[_i] = arguments[_i + 0];
        }
        return numbers;
    };

    Util.is_on_stream = function (mousePos, stream) {
        return this.diff(mousePos.y, stream.y) < 2 * eventRadius;
    };

    Util.diff = function (a, b) {
        return Math.abs(a - b);
    };

    Util.operator_y = function (streams) {
        return streams.reduce(function (accum, stream) {
            if (stream.y > accum) {
                return stream.y;
            } else {
                return accum;
            }
        }, 0) + eventRadius * 3;
    };

    Util.output_stream_y = function (streams) {
        var ypos = 0;
        for (var i in streams) {
            var stream = streams[i];
            if (stream.y > ypos) {
                ypos = stream.y;
            }
        }
        return ypos + eventRadius * 9;
    };

    Util.random_color = function () {
        var letters = "0123456789ABCDEF".split("");
        var color = "#";
        var i = 0;
        while (i < 6) {
            color += letters[Math.round(Math.random() * 15)];
            i++;
        }
        return color;
    };

    Util.httpGet = function (theUrl) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", theUrl, false);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    };

    Util.getJson = function (url) {
        return JSON.parse(Util.httpGet(url));
    };

    Util.triggeredObservable = function (source, trigger) {
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
    };
    return Util;
})();

var MarbleDrawer = (function () {
    function MarbleDrawer(canvas, streamJson, createOutputStream) {
        var streams = MarbleDrawer.initialiseStreamsJson(streamJson);
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
        Util.triggeredObservable(mousePos, mouseDown).subscribe(MarbleDrawer.mouseDownHandler(streams));

        // When a key is pressed, add the appriopriate notification to the stream.
        var keypress = Rx.Observable.fromEvent(canvas, 'keypress');
        var combined = keypress.combineLatest(mousePos, function (s1, s2) {
            return { 1: s1, 2: s2 };
        });

        // Every keypress, trigger the output.
        Util.triggeredObservable(combined, keypress).subscribe(MarbleDrawer.keyboardHandler(streams));

        // On any user event, update the canvas.
        mousePos.combineLatest(keypress.merge(mouseDown).startWith(''), // Only return the mouse pos
        function (s1, s2) {
            return s1;
        }).throttle(1).subscribe(function (mouseEvt) {
            // Update the output stream
            var allStreams = streams.concat(createOutputStream(streams, op_y));
            MarbleDrawer.render(canvas, mouseEvt, allStreams, op_y);
        });
    }
    MarbleDrawer.initialiseStreamsJson = function (streamJson) {
        var y = 2 * eventRadius;
        return streamJson["streams"].map(function (json) {
            var r = Stream.fromJson(json, y);
            y += 4 * eventRadius;
            return r;
        });
    };

    MarbleDrawer.mouseDownHandler = function (streams) {
        return function (mousePos) {
            var currStream = Util.getCurrentStream(mousePos, streams);
            if (Util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
                currStream.addEvent(mousePos.x);
            }
        };
    };

    MarbleDrawer.keyboardHandler = function (streams) {
        return function (evts) {
            var mousePos = evts[2];
            var currStream = Util.getCurrentStream(mousePos, streams);
            if (Util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
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

    MarbleDrawer.render = function (canvas, mousePos, allStreams, op_y) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var gfx = new Graphics(canvas, ctx);
        allStreams.forEach(function (stream) {
            gfx.draw_stream(stream, op_y);
        }, gfx);
        gfx.draw_cursor(mousePos, Util.getCurrentStream(mousePos, allStreams));
        gfx.draw_operator(op_y);
    };
    return MarbleDrawer;
})();
