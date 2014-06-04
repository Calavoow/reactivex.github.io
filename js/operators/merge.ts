/// <reference path="../marble/marble.ts"/>

(function() {
	window.addEventListener("load", () => {
		var canvas = <HTMLCanvasElement> document.getElementById("merge")
		var streamJson = Util.getJson("premade/merge.json")
		var marbleDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream)
	})

	function create_output_stream(streams: Stream[], op_y: number) : Stream {
		var scheduler = new Rx.TestScheduler()

		var inputStreams = streams.map(function(stream) {
			return stream.toObservable(scheduler)
		})
		var y = op_y + 6*eventRadius
		var output_stream = new Stream({x: 10, y: y}, {x: 500, y: y}, true)

		// Combine the streams
		var merged : Rx.Observable<Evt> = inputStreams.reduce(function(accum, obs) {
			return accum.merge(obs)
		})
		merged.subscribe(function(evt) {
			output_stream.addEvt(evt)
		}, function(err) {
			var now = scheduler.now()
			output_stream.end.x = now + 3 * eventRadius

			output_stream.setErr(err)
		}, function() {
			var now = scheduler.now()
			output_stream.end.x = now + 3 * eventRadius

			output_stream.setCompleteTime(now)
		})
		scheduler.start()
		return output_stream
	}
}).call(this)
