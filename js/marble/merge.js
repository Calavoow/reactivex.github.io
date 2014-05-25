/// <reference path="marble.ts"/>
(function () {
    window.onload = function () {
        var canvas = document.getElementById("rxCanvas");
        var streamJson = Util.getJson("merge.json");
        var marbleDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream);
    };

    function create_output_stream(streams, op_y) {
        var scheduler = new Rx.TestScheduler();

        var inputStreams = streams.map(function (stream) {
            return stream.toObservable(scheduler);
        });
        var output_stream = new Stream(op_y + 2 * eventRadius, 10, 500, true);

        // Combine the streams
        var merged = inputStreams.reduce(function (accum, obs) {
            return accum.merge(obs);
        });
        merged.subscribe(function (evt) {
            output_stream.addEvt(evt);
        }, function (err) {
            var now = scheduler.now();
            output_stream.maxEnd = now + 3 * eventRadius;

            output_stream.setErr(err);
        }, function () {
            var now = scheduler.now();
            output_stream.maxEnd = now + 3 * eventRadius;

            output_stream.setCompleteTime(now);
        });
        scheduler.start();
        return output_stream;
    }
}).call(this);
