///<reference path="../rx/rx.lite.d.ts"/>
///<reference path="../rx/rx.testing.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var eventRadius = 20;

var Notification = (function () {
    function Notification(x, color) {
        this.color = Util.random_color();
        this.x = x;
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
        if (!this.isOutput && this.shape == null) {
            throw Error("Expected shape");
        }
        this.notifications = [];
    }
    Stream.prototype.addEvent = function (mousePos) {
        if (this.removeNotif(mousePos)) {
        } else if (this.validNotification(new Notification(mousePos.x))) {
            this.notifications.push({
                x: mousePos.x,
                color: Util.random_color(),
                shape: this.shape,
                type: "Event"
            });
        }
        return this;
    };

    Stream.prototype.setError = function (mousePos) {
        return this.setUnique(mousePos, {
            x: mousePos.x,
            color: Util.random_color(),
            type: "Error"
        });
    };

    Stream.prototype.setComplete = function (mousePos) {
        return this.setUnique(mousePos, {
            x: mousePos.x,
            type: "Complete"
        });
    };

    Stream.prototype.removeNotif = function (mousePos) {
        var notifIdx;
        notifIdx = this.onNotification(mousePos);
        if (notifIdx != null) {
            this.notifications.splice(notifIdx, 1);
            return true;
        } else {
            return false;
        }
    };

    Stream.prototype.setUnique = function (mousePos, uniqueNotif) {
        if (this.removeNotif(mousePos)) {
        } else if (mousePos.x - eventRadius > this.start && mousePos.x + eventRadius < this.maxEnd) {
            this.notifications.push(uniqueNotif);
        }
        this.notifications = this.notifications.filter(this.validNotification, this);
        return this;
    };

    /*
    * Invariant property of Notifications
    *
    * Requires a .x property on given events and errors.
    */
    Stream.prototype.validNotification = function (notif) {
        var notifBeforeEnd, uniqueNotifs;
        uniqueNotifs = this.notifications.filter(function (curNotif) {
            return typeof notif === "Error" || typeof notif === "Complete";
        });
        if (typeof notif === "Error" || typeof notif === "Complete") {
            return notif.x === uniqueNotifs[uniqueNotifs.length - 1].x;
        } else {
            notifBeforeEnd = !uniqueNotifs.some(function (uniqueNotif) {
                return notif.x + eventRadius >= uniqueNotif.x;
            });
            return notifBeforeEnd && notif.x - eventRadius > this.start;
        }
    };

    /*
    * Find if the mouse is on a notification in this stream.
    */
    Stream.prototype.onNotification = function (mousePos) {
        var i, notif, _i, _len, _ref;
        _ref = this.notifications;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            notif = _ref[i];
            if (Util.diff(notif.x, mousePos.x) < 2 * eventRadius) {
                return i;
            }
        }
        return null;
    };

    Stream.prototype.toObservable = function (scheduler) {
        var notifs;
        notifs = this.notifications.map(function (notif) {
            var notifType = (function () {
                console.log(typeof notif);
                switch (typeof notif) {
                    case "Event":
                        return Rx.ReactiveTest.onNext;
                    case "Error":
                        return Rx.ReactiveTest.onError;
                    case "Complete":
                        return Rx.ReactiveTest.onCompleted;
                    default:
                        throw Error("Something wrong with notification type");
                }
            })();
            return notifType(notif.x, notif);
        });
        return scheduler.createColdObservable(notifs);
    };

    Stream.fromJson = function (json, y) {
        var stream;
        stream = new Stream(y, json.start, json.maxEnd, false, json.shape);
        json.notifications.forEach(function (notif) {
            if (notif["color"] == null) {
                return notif.color = Util.random_color();
            }
        });
        stream.notifications = json.notifications;
        return stream;
    };
    return Stream;
})();


/**
* GRAPHICS
**/
var Graphics = (function () {
    function Graphics(ctx) {
        this.ctx = ctx;
    }
    Graphics.prototype.draw_stream = function (stream, op_y) {
        var maxEnd = 500;
        stream.notifications.forEach(function (notif) {
            switch (typeof notif) {
                case "Event":
                    this.draw_event(stream, notif);
                    break;
                case "Error":
                    this.draw_error(stream, notif);
                    break;
                case "Complete":
                    this.draw_complete(stream, notif);
                    maxEnd = notif.x + 2 * eventRadius;
            }
        });
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
            var isMarked = currStream.onNotification(mousePos);
            switch (currStream.shape) {
                case "circle":
                    return this.draw_circle(mousePos.x, currStream.y, "red", isMarked != null);
                case "square":
                    return this.draw_square(mousePos.x, currStream.y, "red", isMarked != null);
            }
        }
    };

    Graphics.prototype.draw_operator = function (op_y) {
        this.ctx.beginPath();
        this.ctx.rect(10, op_y, this.ctx.width - 20, 2.5 * eventRadius);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "#000000";
        this.ctx.stroke();
    };

    /**
    * GRAPHICAL PRIMITIVES
    **/
    Graphics.prototype.draw_line = function (fromx, fromy, tox, toy, color) {
        this.ctx.beginPath();
        this.ctx.lineWith = 3;
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
        var i, stream, ypos;
        ypos = 0;
        for (i in streams) {
            stream = streams[i];
            if (stream.y > ypos) {
                ypos = stream.y;
            }
        }
        return ypos + eventRadius * 9;
    };

    Util.random_color = function () {
        var color, i, letters;
        letters = "0123456789ABCDEF".split("");
        color = "#";
        i = 0;
        while (i < 6) {
            color += letters[Math.round(Math.random() * 15)];
            i++;
        }
        return color;
    };

    Util.httpGet = function (theUrl) {
        var xmlHttp;
        xmlHttp = null;
        xmlHttp = new XMLHttpRequest();
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
    /*
    * MAIN
    */
    var currStream;

    window.onload = function () {
        var canvas = document.getElementById("rxCanvas");
        var streamJson = Util.getJson("merge.json");
        var streams = streamJson["streams"].map(Stream.fromJson, Stream);
        var currStream = streams[0];

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
        mousePosObs.subscribe(m);

        mousePosObs.subscribe(function (evt) {
            // Keep mousePos updated
            mousePos = evt;

            // Keep the current stream updated
            currStream = Util.getCurrentStream(mousePos, streams);
        });

        var mouseDownObs = Rx.Observable.fromEvent(canvas, 'mousedown');
        mouseDownObs.subscribe(function (evt) {
            if (Util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
                currStream.addEvent(mousePos);
            }
        });

        var mouseOutObs = Rx.Observable.fromEvent(canvas, 'mouseout');
        mouseOutObs.subscribe(function (evt) {
            mousePos = {
                x: -1337,
                y: -1337
            };
        });

        var keypressObs = Rx.Observable.fromEvent(canvas, 'keypress');
        keypressObs.subscribe(function (evt) {
            if (Util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
                switch (evt.which) {
                    case 101:
                        currStream.setError(mousePos);
                        break;
                    case 99:
                        currStream.setComplete(mousePos);
                }
            }
        });

        render(canvas, mousePos, streams);
    };

    /**
    * LOGIC
    **/
    function create_output_stream(streams, op_y) {
        var inputStreams, output_stream, scheduler;
        scheduler = new Rx.TestScheduler();

        inputStreams = streams.map(function (stream) {
            return stream.toObservable(scheduler);
        });
        output_stream = new Stream(op_y, 10, 0, true);

        // Combine the streams
        inputStreams.reduce(function (accum, obs) {
            return accum.merge(obs);
        }).subscribe((function (evt) {
            output_stream.notifications.push(evt);
        }), (function (err) {
            output_stream.notifications.push(err);
            output_stream.maxEnd = err.x + 3 * eventRadius;
        }), function () {
            output_stream.notifications.push({
                x: scheduler.now(),
                type: "Complete"
            });
            output_stream.maxEnd = output_stream.end + 2 * eventRadius;
        });
        scheduler.start();
        return output_stream;
    }
    ;

    function render(canvas, mousePos, streams) {
        var ctx, gfx;
        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gfx = new Graphics(ctx);
        streams.concat(create_output_stream(streams, 400)).forEach(gfx.draw_stream, gfx);
        gfx.draw_cursor(mousePos);
        gfx.draw_operator(canvas);
    }
    ;
}).call(this);
