///<reference path="../rx/rx.d.ts"/>
///<reference path="../rx/rx.testing.d.ts"/>
///<reference path="../rx/rx.async.d.ts"/>
///<reference path="../rx/rx.binding.d.ts"/>

// A constant defining the size of the notification drawings.
var eventRadius = 20;

class Notification{
	color: string = Util.random_color();

	constructor(public x: number, color?: string){
		if(color) this.color = color;
	}
}

class Evt extends Notification {
	constructor(x: number, public shape: string, color?: string) {
		super(x, color);
		this.shape = shape;
	}
}

class Err extends Notification{
	constructor(x: number, color?: string){
		super(x, color);
	}
}

class Complete extends Notification {
	constructor(x: number, color?: string){
		super(x, color);
	}
}

class Stream {
	shape: string;
	notifications: Notification[];

	constructor(public y : number,
			public start : number,
			public maxEnd : number,
			public isOutput : boolean,
			shape?: string) {
		if(shape) this.shape = shape;
		if (!isOutput && shape == null) {
			throw Error("Expected shape");
		}
		this.notifications = [];
	}

	addEvent(x: number, shape?: string, color?: string) : Stream {
		if(shape) this.addEvt(new Evt(x, shape, color))
		else this.addEvt(new Evt(x, this.shape, color))

		return this
	}

	addEvt(evt: Evt) : Stream {
		if(this.isOutput) { // Ignore conistency rules, this is the output stream
			this.notifications.push(evt)
		} else if (this.removeNotif(evt)) {
			// If the event overlaps with another event, remove it.
		} else if (this.validNotification(evt)) {
			this.notifications.push(evt)
		}
		return this;
	}

	setError(x: number) : Stream {
		return this.setErr(new Err(x))
	}

	setErr(err: Err) : Stream {
		return this.setUnique(err)
	}

	setCompleteTime(x : number) : Stream {
		return this.setComplete(new Complete(x))
	}

	setComplete(compl: Complete) : Stream {
		return this.setUnique(compl)
	}

	private setUnique(notif: Notification) : Stream {
		if(this.isOutput) { // Ignore rules if output
			this.notifications.push(notif)
		} else if (this.removeNotif(notif)) {

		}
		// If x is within the Stream bounds.
		else if (notif.x - eventRadius > this.start && notif.x + eventRadius < this.maxEnd) {
			this.notifications.push(notif);
			// Maintain the stream invariant property
			this.notifications = this.notifications.filter(this.validNotification, this);
		}
		return this;
	}

	/**
	 * If the location of where the Event is to be added already contains a notification, remove that instead.
	 **/
	private removeNotif(notif: Notification) : boolean {
		var notifIdx = this.onNotification(notif.x);
		if (notifIdx != null) {
			this.notifications.splice(notifIdx, 1);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Invariant property of Notifications
	 **/
	validNotification(notif: Notification) : boolean {
		// Contains all notifications that should be unique
		var uniqueNotifs = this.notifications.filter(function(curNotif) {
			return curNotif instanceof Err || curNotif instanceof Complete;
		})

		// Check if there are notifications that should not be in the list.
		if (notif instanceof Err || notif instanceof Complete) {
			// If this notification is the last one added to uniqueNotifs, it is valid.
			return notif.x === uniqueNotifs[uniqueNotifs.length - 1].x
		} else {
			// If this Notification occurs before the latest unique notification, then that is part 1.
			var notifBeforeEnd = !uniqueNotifs.some(function(uniqueNotif) {
				return notif.x + eventRadius >= uniqueNotif.x
			})
			// And if it is after the start of the Stream then it is valid.
			return notifBeforeEnd && notif.x - eventRadius > this.start
		}
	}


	/**
	 * Find if the mouse is on a notification in this stream.
	 * @return The index of the notification it is on otherwise null.
	 **/
	onNotification(x: number) : number {
		for(var i in this.notifications) {
			var notif = this.notifications[i]
			if (Util.diff(notif.x, x) < 2 * eventRadius) {
				return i
			}
		}
		return null
	}

	toObservable(scheduler : Rx.TestScheduler) : Rx.Observable<Evt> {
		var notifs : Rx.Recorded[] = this.notifications.map(function(notif) {
			if(notif instanceof Evt)
				return Rx.ReactiveTest.onNext(notif.x, notif)
			else if(notif instanceof Err)
				return Rx.ReactiveTest.onError(notif.x, notif)
			else if(notif instanceof Complete)
				return Rx.ReactiveTest.onCompleted(notif.x)
			else throw Error("Something wrong with notification type")
		})

		return scheduler.createColdObservable.apply(scheduler, notifs)
	}

	static fromJson(json, y : number) {
		var stream = new Stream(y, json.start, json.maxEnd, false, json.shape);
		stream.notifications = json.notifications.map(function(notif) {
			switch(notif.type) {
				case "Event": return new Evt(notif.x, notif.shape, notif.color); break;
				case "Error": return new Err(notif.x, notif.color); break;
				case "Complete": return new Complete(notif.x, notif.color); break;
				default:
					throw Error("Unkown notification type.");
					console.log(notif);
			}
		});
		return stream;
	}
}


/*
 * UTILITIES
 */
interface MousePos {
	x: number;
	y: number;
}

/**
 * GRAPHICS
 **/
class Graphics {
	constructor(private canvas: HTMLCanvasElement, private ctx : CanvasRenderingContext2D) {
	}

	draw_stream(stream : Stream, op_y : number) : void {
		var maxEnd = 500; // Default value
		stream.notifications.forEach(function(notif){
			if(notif instanceof Evt) this.draw_event(stream, notif, op_y);
			else if(notif instanceof Err) this.draw_error(stream, notif, op_y);
			else if(notif instanceof Complete){
				this.draw_complete(stream, notif);
				maxEnd = notif.x + 3* eventRadius;
			} else {

			}
		}, this);
		this.draw_arrow(stream.start, maxEnd, stream.y);
	}

	draw_event(stream : Stream, event : Evt, op_y: number) : void {
		switch (event.shape) {
			case "circle":
				this.fill_circle(event.x, stream.y, event.color, false);
				break;
			case "square":
				this.fill_square(event.x, stream.y, event.color, false);
		}
		return this.draw_arrow_to_op(stream, event, op_y);
	}

	draw_error(stream : Stream, error : Err, op_y: number) {
		this.draw_cross(error.x, stream.y, error.color);
		return this.draw_arrow_to_op(stream, error, op_y);
	}

	draw_complete(stream : Stream, complete: Complete) {
		return this.draw_line(complete.x, stream.y - eventRadius, complete.x, stream.y + eventRadius, "#000000");
	}

	draw_arrow_to_op(stream: Stream, notif: Notification, op_y: number) :void {
		if (stream.isOutput) {
			this.draw_dashed_arrow(notif.x, op_y + 2.5 * eventRadius, stream.y - eventRadius);
		} else {
			this.draw_dashed_arrow(notif.x, stream.y + eventRadius, op_y);
		}
	}

	draw_cursor(mousePos: MousePos, currStream: Stream): void {
		if (Util.is_on_stream(mousePos, currStream)) {
			var isMarked = (currStream.onNotification(mousePos.x) != null) || !currStream.validNotification(new Notification(mousePos.x))
			switch (currStream.shape) {
				case "circle":
					return this.draw_circle(mousePos.x, currStream.y, "red", isMarked)
				case "square":
					return this.draw_square(mousePos.x, currStream.y, "red", isMarked)
			}
		}
	}

	draw_operator(op_y: number) {
		this.ctx.beginPath();
		this.ctx.rect(10, op_y, this.canvas.width - 20, 2.5 * eventRadius);
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = "#000000";
		this.ctx.stroke();
	}

	/**
	 * GRAPHICAL PRIMITIVES
	 **/

	draw_line(fromx : number, fromy : number, tox : number, toy : number, color : string) : void {
		this.ctx.beginPath();
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = color;
		this.ctx.moveTo(fromx, fromy);
		this.ctx.lineTo(tox, toy);
		this.ctx.stroke();
	}

	draw_cross(centerx : number, centery : number, color : string) : void {
		this.draw_line(centerx - eventRadius, centery + eventRadius, centerx + eventRadius, centery - eventRadius, color);
		this.draw_line(centerx - eventRadius, centery - eventRadius, centerx + eventRadius, centery + eventRadius, color);
	}

	draw_arrow(fromx : number, tox : number, y : number) : void {
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
	}

	draw_dashed_arrow(x : number, fromy : number, toy : number) : void {
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
	}

	draw_circle(centerx : number, centery : number, color : string, isMarked : boolean) : void {
		this.circle(centerx, centery, color, isMarked, function(ctx) {
			ctx.stroke();
		});
	}

	fill_circle(centerx : number, centery : number, color : string, isMarked : boolean) : void {
		this.circle(centerx, centery, color, isMarked, function(ctx) {
			ctx.fill();
		});
	}

	circle(centerx : number, centery : number, color : string, isMarked : boolean, drawFunc : (CanvasRenderingContext2D) => void) : void {
		this.ctx.beginPath();
		this.ctx.arc(centerx, centery, eventRadius, 0, 2 * Math.PI, false);
		this.ctx.fillStyle = color;
		drawFunc(this.ctx);
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
		this.ctx.stroke();
	}

	draw_square(centerx : number, centery : number, color : string, isMarked : boolean) : void {
		this.square(centerx, centery, color, isMarked, false);
	}

	fill_square(centerx : number, centery : number, color : string, isMarked : boolean) : void {
		this.square(centerx, centery, color, isMarked, true);
	}

	square(centerx : number, centery : number, color : string, isMarked : boolean, doFill : boolean) : void {
		this.ctx.beginPath();
		this.ctx.rect(centerx - eventRadius, centery - eventRadius, 2 * eventRadius, 2 * eventRadius);
		if (doFill) {
			this.ctx.fillStyle = color;
			this.ctx.fill();
		}
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
		this.ctx.stroke();
	}
}



class Util {
	static getCurrentStream(mousePos : MousePos, streams: Stream[]) : Stream{
		var selectedStream : Stream;
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
	}

	static test(...numbers : number[]) :number[] {
		return numbers
	}

	static is_on_stream(mousePos : MousePos, stream: Stream) : boolean {
		return this.diff(mousePos.y, stream.y) < 2 * eventRadius;
	}

	static diff(a : number, b : number) : number {
		return Math.abs(a - b);
	}

	static operator_y(streams: Stream[]) {
		return streams.reduce(function(accum : number, stream : Stream) {
			if (stream.y > accum) {
				return stream.y;
			} else {
				return accum;
			}
		}, 0) + eventRadius * 3;
	}

	static output_stream_y(streams : Stream[]) : number {
		var ypos = 0;
		for (var i in streams) {
			var stream = streams[i];
			if (stream.y > ypos) {
				ypos = stream.y;
			}
		}
		return ypos + eventRadius * 9;
	}

	static random_color() : string {
		var letters = "0123456789ABCDEF".split("");
		var color = "#";
		var i = 0;
		while (i < 6) {
			color += letters[Math.round(Math.random() * 15)];
			i++;
		}
		return color;
	}

	static httpGet(theUrl : string) : string {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", theUrl, false);
		xmlHttp.send(null);
		return xmlHttp.responseText;
	}

	static getJson(url : string) : JSON {
		return JSON.parse(Util.httpGet(url));
	}
}

(function() {
	window.onload = function() {
		var canvas = <HTMLCanvasElement> document.getElementById("rxCanvas")
		var streamJson = Util.getJson("merge.json")
		var y = 0
		var streams : Stream[] = streamJson["streams"].map(function(json) {
			y += 4*eventRadius
			return Stream.fromJson(json, y)
		})

		var mousePosObs: Rx.Observable<MousePos> = Rx.Observable.fromEvent(canvas, 'mousemove')
			.map(function(evt: MouseEvent) {
				var rect = canvas.getBoundingClientRect()
				return evt != null ? {
					x: evt.clientX - rect.left,
					y: evt.clientY - rect.top
				} : {
					x: 0,
					y: 0
				}
			})

		// Create a behavioursubject containing the last value of the mouse position.
		var mousePos = new Rx.BehaviorSubject({x:-1337, y:-1337})
		mousePosObs.subscribe(
			function(mouseEvt) {
				mousePos.onNext(mouseEvt)
			}, function(err) {
				mousePos.onError(err)
			}, function() {
				mousePos.onCompleted()
			}
		)

		// On mouse down add an event to the current stream.
		var mouseDownObs = Rx.Observable.fromEvent(canvas, 'mousedown')
		mouseDownObs.subscribe(function(){
			mousePos.take(1).subscribe(function(mouseEvt){
				var currStream = Util.getCurrentStream(mouseEvt, streams);
				if (Util.diff(mouseEvt.y, currStream.y) < 2 * eventRadius) {
					currStream.addEvent(mouseEvt.x)
				}
			})
		})

		// On mouse out of the canvas set the mouse position to somewhere 'invisible'.
		var mouseOutObs = Rx.Observable.fromEvent(canvas, 'mouseout');
		mouseOutObs.subscribe(function(evt){
			mousePos.onNext({
					x: -1337,
					y: -1337
			});
		});

		// When a key is pressed, add the appriopriate notification to the stream.
		var keypressObs = <Rx.Observable<KeyboardEvent>> Rx.Observable.fromEvent(canvas, 'keypress');
		keypressObs.subscribe(function(evt){
			mousePos.take(1).subscribe(function(mouseEvt) {
				var currStream = Util.getCurrentStream(mouseEvt, streams);
				if (Util.diff(mouseEvt.y, currStream.y) < 2 * eventRadius) {
					switch (evt.which) {
						case 101:
							currStream.setError(mouseEvt.x);
							break;
						case 99:
							currStream.setCompleteTime(mouseEvt.x);
					}
				}
			})
		})


		// On any user event, update the canvas.
		mouseDownObs.merge(keypressObs).merge(mousePos).subscribe(function(){
			mousePos.take(1).subscribe(function(mouseEvt) {
				render(canvas, mouseEvt, streams)
			})
		})
	}

	/**
	 * LOGIC
	 **/
	function create_output_stream(streams: Stream[], op_y: number) : Stream {
		var scheduler = new Rx.TestScheduler()

		var inputStreams = streams.map(function(stream) {
			return stream.toObservable(scheduler)
		})
		var output_stream = new Stream(op_y + 2*eventRadius, 10, 500, true)

		// Combine the streams
		var merged : Rx.Observable<Evt> = inputStreams.reduce(function(accum, obs) {
			return accum.merge(obs)
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

	function render(canvas: HTMLCanvasElement, mousePos: MousePos, streams : Stream[]) {
		var op_y = 200
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var gfx = new Graphics(canvas, ctx);
		streams.concat(create_output_stream(streams, op_y + 6*eventRadius)).forEach(stream => {
			gfx.draw_stream(stream, op_y)
		}, gfx);
		gfx.draw_cursor(mousePos, Util.getCurrentStream(mousePos, streams));
		gfx.draw_operator(op_y);
	}
}).call(this)
