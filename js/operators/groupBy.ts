/// <reference path="../marble/marble.ts"/>

module GroupBy {
	window.addEventListener("load", () => {
		var canvas = <HTMLCanvasElement> document.getElementById("groupBy")
		var streamJson = Util.getJson("premade/groupBy.json")
		var marbleDrawer = new MarbleDrawer(canvas, streamJson, create_output_stream)
	})

	class OutputStream extends Stream<Stream<Notification>> {
		addObservable(obs: Rx.GroupedObservable<string, Evt>, scheduler: Rx.Scheduler) : OutputStream {
			var stream = new BasicStream({x: scheduler.now(), y: this.start.y}, {x: 1337, y:1337}, true)

			var calcEnd = (start: Point, endx : number) => {
				// 45 degree angle
				var norm = Util.normalizeVector({x: 1, y: 1})
				var len = endx - stream.start.x
				return {x: start.x + len * norm.x , y: start.y + len * norm.y}
			}
			obs.subscribe((evt) => {
				stream.addEvt(evt)
			}, (err) => {
				var now = scheduler.now()
				var endx = now + 3 * eventRadius
				stream.end = calcEnd(stream.start, endx)

				stream.setErr(err)
			}, () => {
				var now = scheduler.now()
				var endx = now + 3 * eventRadius
				stream.end = calcEnd(stream.start, endx)

				stream.setCompleteTime(now)
			})

			this.notifications.push(stream)
			return this
		}

		draw(gfx: Graphics, op_y: number) : void {
			this.notifications.forEach((stream) => {
				stream.draw(gfx, op_y)
			})
			gfx.draw_arrow(this.start, this.end)
		}

	}

	class StreamError extends Err implements Stream<any> {
		color: string
		shape : string
		notifications: any[] = []
		start : Point
		end: Point
		isOutput: boolean = true
		constructor(err: Err, y: number) {
			super(err.x, err.color)
			this.end = this.start = {x: err.x, y: y}
		}

		draw(gfx: Graphics, op_y:number) : void {
			super.draw(gfx, this.start.y, op_y, this.isOutput)  
		}
	}

	class StreamComplete extends Complete implements Stream<any> {
		color: string
		shape : string
		notifications: any[] = []
		start : Point
		end: Point
		isOutput: boolean = true
		constructor(x: number, y: number) {
			super(x)
			this.end = this.start = {x: x, y: y}
		}

		draw(gfx: Graphics, op_y:number) : void {
			super.draw(gfx, this.start.y, op_y, this.isOutput)  
		}
	}

	function create_output_stream(streams: BasicStream[], op_y: number) : OutputStream {
		var scheduler = new Rx.TestScheduler()

		// Only one stream is allowed
		var inputStream = streams[0].toObservable(scheduler)
		var y = op_y + 6*eventRadius
		var output_stream : OutputStream = new OutputStream({x: 10, y: y}, {x: 500, y: y}, true)

		inputStream.groupBy((notif) => notif.shape)
			.subscribe((evt) => {
				var now = scheduler.now() 
				output_stream.addObservable(evt, scheduler)
			}, (err) => {
				var now = scheduler.now()
				output_stream.end.x= now + 3 * eventRadius

				output_stream.notifications.push(new StreamError(err, output_stream.start.y))
			}, () => {
				var now = scheduler.now()
				output_stream.end.x = now + 3 * eventRadius

				output_stream.notifications.push(new StreamComplete(now, output_stream.start.y))
			})
		scheduler.start()
		return output_stream
	}
}
