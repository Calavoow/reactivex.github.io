/// <reference path="../marble/marble.ts"/>

(function() {
	window.addEventListener("load", () => {
		console.log("amb loaded")
		var canvas = <HTMLCanvasElement> document.getElementById("amb")
		var streamJson = Util.getJson("premade/amb.json")
		var marbleDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream)
	})

	function create_output_stream(streams: Stream[], op_y: number) : Stream {
		var scheduler = new Rx.TestScheduler()

		var inputStreams = streams.map(function(stream) {
			return stream.toObservable(scheduler)
		})
		var output_stream = new Stream(op_y + 6*eventRadius, 10, 500, true)

		// Combine the streams
		var merged : Rx.Observable<Evt> = inputStreams.reduce(function(accum, obs) {
			return accum.amb(obs)
		})
		merged.subscribe(function(evt) {
			output_stream.addEvt(evt)
		}, function(err) {
			var now = scheduler.now()
			output_stream.maxEnd = now + 3 * eventRadius

			output_stream.setErr(err)
		}, function() {
			var now = scheduler.now()
			output_stream.maxEnd = now + 3 * eventRadius

			output_stream.setCompleteTime(now)
		})
		scheduler.start()
		return output_stream
	}
}).call(this)
