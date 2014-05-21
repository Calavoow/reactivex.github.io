///<reference path="../rx/rx.d.ts"/>
///<reference path="../rx/rx.testing.d.ts"/>
///<reference path="../rx/rx.async.d.ts"/>
///<reference path="../rx/rx.binding.d.ts"/>
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
    Stream.prototype.addEvent = function (x) {
        if (this.removeNotif(x)) {
        } else if (this.validNotification(new Notification(x))) {
            this.notifications.push(new Evt(x, this.shape));
        }
        return this;
    };

    Stream.prototype.setError = function (x) {
        return this.setUnique(x, new Err(x));
    };

    Stream.prototype.setComplete = function (x) {
        return this.setUnique(x, new Complete(x));
    };

    Stream.prototype.setUnique = function (x, uniqueNotif) {
        if (this.removeNotif(x)) {
        } else if (x - eventRadius > this.start && x + eventRadius < this.maxEnd) {
            this.notifications.push(uniqueNotif);

            // Maintain the stream invariant property
            this.notifications = this.notifications.filter(this.validNotification, this);
        }
        return this;
    };

    Stream.prototype.removeNotif = function (x) {
        var notifIdx = this.onNotification(x);
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
        var stream = new Stream(y, json.start, json.maxEnd, false, json.shape);
        stream.notifications = json.notifications.map(function (notif) {
            switch (notif.type) {
                case "Event":
                    return new Evt(notif.x, notif.shape, notif.color);
                    break;
                case "Error":
                    return new Err(notif.x, notif.color);
                    break;
                case "Complete":
                    return new Complete(notif.x, notif.color);
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
                this.draw_event(stream, notif);
            else if (notif instanceof Err)
                this.draw_error(stream, notif);
            else if (notif instanceof Complete) {
                this.draw_complete(stream, notif);
                maxEnd = notif.x + 2 * eventRadius;
            } else {
            }
        }, this);
        this.draw_arrow(stream.start, maxEnd, stream.y);
    };

    Graphics.prototype.draw_event = function (stream, event, op_y, isOutput) {
        switch (event.shape) {
            case "circle":
                this.fill_circle(event.x, stream.y, event.color, false);
                break;
            case "square":
                this.fill_square(event.x, stream.y, event.color, false);
        }
        return this.draw_arrow_to_op(stream, event, op_y);
    };

    Graphics.prototype.draw_error = function (stream, error, op_y, isOutput) {
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
    return Util;
})();

(function () {
    window.onload = function () {
        var canvas = document.getElementById("rxCanvas");
        var streamJson = Util.getJson("merge.json");
        var y = 0;
        var streams = streamJson["streams"].map(function (json) {
            y += 4 * eventRadius;
            return Stream.fromJson(json, y);
        });

        var mousePosObs = Rx.Observable.fromEvent(canvas, 'mousemove').map(function (evt) {
            var rect = canvas.getBoundingClientRect();
            return evt != null ? {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            } : {
                x: 0,
                y: 0
            };
        });

        var mousePos = new Rx.BehaviorSubject({ x: 0, y: 0 });
        mousePosObs.subscribe(function (mouseEvt) {
            mousePos.onNext(mouseEvt);
        });

        var mouseDownObs = Rx.Observable.fromEvent(canvas, 'mousedown');
        mouseDownObs.subscribe(function () {
            mousePos.take(1).subscribe(function (mouseEvt) {
                var currStream = Util.getCurrentStream(mouseEvt, streams);
                if (Util.diff(mouseEvt.y, currStream.y) < 2 * eventRadius) {
                    currStream.addEvent(mouseEvt.x);
                }
            });
        });

        var mouseOutObs = Rx.Observable.fromEvent(canvas, 'mouseout');
        mouseOutObs.subscribe(function (evt) {
            mousePos.onNext({
                x: -1337,
                y: -1337
            });
        });

        var keypressObs = Rx.Observable.fromEvent(canvas, 'keypress');
        keypressObs.subscribe(function (evt) {
            mousePos.take(1).subscribe(function (mouseEvt) {
                var currStream = Util.getCurrentStream(mouseEvt, streams);
                if (Util.diff(mouseEvt.y, currStream.y) < 2 * eventRadius) {
                    switch (evt.which) {
                        case 101:
                            currStream.setError(mouseEvt.x);
                            break;
                        case 99:
                            currStream.setComplete(mouseEvt.x);
                    }
                }
            });
        });

        // On any user event, update the canvas.
        mouseDownObs.merge(keypressObs).merge(mousePos).subscribe(function () {
            mousePos.take(1).subscribe(function (mouseEvt) {
                render(canvas, mouseEvt, streams);
            });
        });
    };

    /**
    * LOGIC
    **/
    function create_output_stream(streams, op_y) {
        var scheduler = new Rx.TestScheduler();

        var inputStreams = streams.map(function (stream) {
            return stream.toObservable(scheduler);
        });
        var output_stream = new Stream(op_y + 100, 10, 500, true);

        // Combine the streams
        var merged = inputStreams.reduce(function (accum, obs) {
            return accum.merge(obs);
        });
        merged.subscribe(function (evt) {
            output_stream.addEvent(evt.x);
        }, function (err) {
            var now = scheduler.now();
            output_stream.setError(now);
            output_stream.maxEnd = now + 3 * eventRadius;
        }, function () {
            var now = scheduler.now();
            output_stream.setComplete(now);
            output_stream.maxEnd = now + 2 * eventRadius;
        });
        scheduler.start();
        return output_stream;
    }

    function render(canvas, mousePos, streams) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var gfx = new Graphics(canvas, ctx);
        streams.concat(create_output_stream(streams, 400)).forEach(gfx.draw_stream, gfx);
        gfx.draw_cursor(mousePos, Util.getCurrentStream(mousePos, streams));
        gfx.draw_operator(200);
    }
    ;
}).call(this);
