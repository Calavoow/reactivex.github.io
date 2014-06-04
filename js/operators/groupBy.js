/// <reference path="../marble/marble.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var GroupBy;
(function (GroupBy) {
    window.addEventListener("load", function () {
        var canvas = document.getElementById("groupBy");
        var streamJson = Util.getJson("premade/groupBy.json");
        var marbleDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream);
    });

    var OutputStream = (function (_super) {
        __extends(OutputStream, _super);
        function OutputStream() {
            _super.apply(this, arguments);
        }
        OutputStream.prototype.addObservable = function (obs, scheduler) {
            var stream = new BasicStream({ x: scheduler.now(), y: this.start.y }, { x: 1337, y: 1337 }, true);

            var calcEnd = function (start, endx) {
                // 45 degree angle
                var norm = Util.normalizeVector({ x: 1, y: 1 });
                var len = endx - stream.start.x;
                return { x: start.x + len * norm.x, y: start.y + len * norm.y };
            };
            obs.subscribe(function (evt) {
                stream.addEvt(evt);
            }, function (err) {
                var now = scheduler.now();
                var endx = now + 3 * eventRadius;
                stream.end = calcEnd(stream.start, endx);

                stream.setErr(err);
            }, function () {
                var now = scheduler.now();
                var endx = now + 3 * eventRadius;
                stream.end = calcEnd(stream.start, endx);

                stream.setCompleteTime(now);
            });

            this.notifications.push(stream);
            return this;
        };

        OutputStream.prototype.draw = function (gfx, op_y) {
            this.notifications.forEach(function (stream) {
                stream.draw(gfx, op_y);
            });
            gfx.draw_arrow(this.start, this.end);
        };
        return OutputStream;
    })(Stream);

    var StreamError = (function (_super) {
        __extends(StreamError, _super);
        function StreamError(err, y) {
            _super.call(this, err.x, err.color);
            this.notifications = [];
            this.isOutput = true;
            this.end = this.start = { x: err.x, y: y };
        }
        StreamError.prototype.draw = function (gfx, op_y) {
            _super.prototype.draw.call(this, gfx, this.start.y, op_y, this.isOutput);
        };
        return StreamError;
    })(Err);

    var StreamComplete = (function (_super) {
        __extends(StreamComplete, _super);
        function StreamComplete(x, y) {
            _super.call(this, x);
            this.notifications = [];
            this.isOutput = true;
            this.end = this.start = { x: x, y: y };
        }
        StreamComplete.prototype.draw = function (gfx, op_y) {
            _super.prototype.draw.call(this, gfx, this.start.y, op_y, this.isOutput);
        };
        return StreamComplete;
    })(Complete);

    function create_output_stream(streams, op_y) {
        var scheduler = new Rx.TestScheduler();

        // Only one stream is allowed
        var inputStream = streams[0].toObservable(scheduler);
        var y = op_y + 6 * eventRadius;
        var output_stream = new OutputStream({ x: 10, y: y }, { x: 500, y: y }, true);

        inputStream.groupBy(function (notif) {
            return notif.shape;
        }).subscribe(function (evt) {
            var now = scheduler.now();
            output_stream.addObservable(evt, scheduler);
        }, function (err) {
            var now = scheduler.now();
            output_stream.end.x = now + 3 * eventRadius;

            output_stream.notifications.push(new StreamError(err, output_stream.start.y));
        }, function () {
            var now = scheduler.now();
            output_stream.end.x = now + 3 * eventRadius;

            output_stream.notifications.push(new StreamComplete(now, output_stream.start.y));
        });
        scheduler.start();
        return output_stream;
    }
})(GroupBy || (GroupBy = {}));
