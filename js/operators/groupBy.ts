/// <reference path="../marble/marble.ts"/>

module GroupBy {
	window.addEventListener("load", () => {
		var canvas = <HTMLCanvasElement> document.getElementById("groupBy")
		var streamJson = Util.getJson("premade/groupBy.json")
		var groupByDrawer = new GroupByDrawer(canvas, streamJson, create_output_stream)
	})

	class GroupByDrawer extends MarbleDrawer {
		mouseDownHandler(streams: BasicStream[])
			: (MousePos) => void {
			return (mousePos: MousePos) => {
				var currStream = Util.getCurrentStream(mousePos, streams);
				if(currStream) currStream.addEvent(mousePos.x, Util.randomShape())
			}
		}
	}

	class GroupByStream extends OutputStream<OutputStream<Notification>> {
		addObservable(obs: Rx.GroupedObservable<string, Evt>, scheduler: Rx.Scheduler) : GroupByStream {
			var calcEnd = (start: Point, endx : number) => {
				// -45 degree angle
				var norm = Util.normalizeVector({x: 1, y: 1})
				var len = endx - start.x
				return {x: endx, y: start.y + len * norm.y}
			}

			var start = {x: scheduler.now(), y: this.start.y}
			var stream = new BasicStream(start, calcEnd(start, 500), true)

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

		height() : number {
			return Math.max.apply(null, this.notifications.map((notif) => { return notif.height() }))
		}
	}

	class StreamError extends Err implements OutputStream<any> {
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

		height() {
			return this.start.y
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

		height() {
			return this.start.y
		}
	}

	function create_output_stream(streams: BasicStream[], op_y: number) : GroupByStream {
		var scheduler = new Rx.TestScheduler()

		// Only one stream is allowed
		var inputStream = streams[0].toObservable(scheduler)
		var y = op_y + 6*eventRadius
		var output_stream = new GroupByStream({x: 10, y: y}, {x: 500, y: y}, true)

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
