/// <reference path="../marble/marble.ts"/>
/// <reference path="menu.ts"/>
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

        // Menu
        var menu = document.getElementById("groupByMenu");
        var selection = Menu.selectedElement(menu);

        // Json output
        var preformat = document.getElementById("groupByJson");
        var button = document.getElementById("groupByJsonButton");
        var jsonCreate = Rx.Observable.fromEvent(button, 'click');
        var jsonOutput = function (outputStream) {
            preformat.style.display = "";
            preformat.innerHTML = JSON.stringify({ streams: [outputStream.toJson()] }, undefined, 2);
        };

        var groupByDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream, jsonCreate, jsonOutput, selection);
    });

    var GroupByStream = (function (_super) {
        __extends(GroupByStream, _super);
        function GroupByStream() {
            _super.apply(this, arguments);
        }
        GroupByStream.prototype.addObservable = function (obs, scheduler) {
            var calcEnd = function (start, endx) {
                // -45 degree angle
                var norm = Util.normalizeVector({ x: 1, y: 1 });
                var len = endx - start.x;
                return { x: endx, y: start.y + len * norm.y };
            };

            var start = { x: scheduler.now(), y: this.start.y };
            var stream = new BasicStream(start, calcEnd(start, 500), true);

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

        GroupByStream.prototype.draw = function (gfx, op_y) {
            this.notifications.forEach(function (stream) {
                stream.draw(gfx, op_y);
            });
            gfx.arrow(this.start, this.end, false);
        };

        GroupByStream.prototype.height = function () {
            return Math.max.apply(null, this.notifications.map(function (notif) {
                return notif.height();
            }).concat(this.end.y + 2 * eventRadius));
        };

        GroupByStream.prototype.toJson = function () {
            return {
                start: this.start.x,
                end: this.end.x,
                streams: this.notifications.map(function (stream) {
                    return stream.toJson();
                })
            };
        };
        return GroupByStream;
    })(OutputStream);

    var StreamError = (function (_super) {
        __extends(StreamError, _super);
        function StreamError(err, y) {
            _super.call(this, err.x, err.color);
            this.notifications = [];
            this.isOutput = true;
            this.end = this.start = { x: err.x, y: y };
        }
        StreamError.prototype.draw = function (gfx, op_y) {
            _super.prototype.draw.call(this, gfx, this.start.y, this.isOutput, true, op_y);
        };

        StreamError.prototype.height = function () {
            return this.start.y;
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
            _super.prototype.draw.call(this, gfx, this.start.y, this.isOutput, true, op_y);
        };

        StreamComplete.prototype.height = function () {
            return this.start.y;
        };
        return StreamComplete;
    })(Complete);

    function create_output_stream(streams, op_y) {
        var scheduler = new Rx.TestScheduler();

        // Only one stream is allowed
        var inputStream = streams[0].toObservable(scheduler);
        var y = op_y + 6 * eventRadius;
        var output_stream = new GroupByStream({ x: 10, y: y }, { x: 500, y: y }, true);

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
