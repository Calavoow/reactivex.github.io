/// <reference path="../marble/marble.ts"/>
/// <reference path="menu.ts"/>
var Amb;
(function (Amb) {
    window.addEventListener("load", function () {
        var canvas = document.getElementById("amb");
        var streamJson = Util.getJson("premade/amb.json");

        // Menu
        var menu = document.getElementById("ambMenu");
        var selection = Menu.selectedElement(menu);

        // Json output
        var preformat = document.getElementById("ambJson");
        var button = document.getElementById("ambJsonButton");
        var jsonCreate = Rx.Observable.fromEvent(button, 'click');
        var jsonOutput = function (outputStream) {
            preformat.style.display = "";
            preformat.innerHTML = JSON.stringify({ streams: [outputStream.toJson()] }, undefined, 2);
        };

        var marbleDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream, jsonCreate, jsonOutput, selection);
    });

    function create_output_stream(streams, op_y) {
        var scheduler = new Rx.TestScheduler();

        var inputStreams = streams.map(function (stream) {
            return stream.toObservable(scheduler);
        });
        var y = op_y + 6 * eventRadius;
        var output_stream = new BasicStream({ x: 10, y: y }, { x: 500, y: y }, true);

        // Combine the streams
        var merged = inputStreams.reduce(function (accum, obs) {
            return accum.amb(obs);
        });
        merged.subscribe(function (evt) {
            output_stream.addEvt(evt);
        }, function (err) {
            var now = scheduler.now();
            output_stream.end.x = now + 3 * eventRadius;

            output_stream.setErr(err);
        }, function () {
            var now = scheduler.now();
            output_stream.end.x = now + 3 * eventRadius;

            output_stream.setCompleteTime(now);
        });
        scheduler.start();
        return output_stream;
    }
})(Amb || (Amb = {}));
