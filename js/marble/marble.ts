///<reference path="../RxJS/ts/rx.d.ts"/>
///<reference path="../RxJS/ts/rx.testing.d.ts"/>
///<reference path="../RxJS/ts/rx.async.d.ts"/>
///<reference path="../RxJS/ts/rx.binding.d.ts"/>
///<reference path="../RxJS/ts/rx.time.d.ts"/>

// A constant defining the size of the notification drawings.
var eventRadius = 20;

class Notification {
	color: string = Util.random_color();

	constructor(public x: number, color?: string){
		if(color) this.color = color;
	}

	toRecorded() : Rx.Recorded {
		throw new Error("toRecorded not implemented")
	}

	draw(gfx: Graphics, y : number, op_y: number, isOutput: boolean) : void {
		throw new Error("draw not implemented")
	}
}

class Evt extends Notification {
	constructor(x: number, public shape: string, color?: string) {
		super(x, color);
		this.shape = shape;
	}

	toRecorded() : Rx.Recorded {
		return Rx.ReactiveTest.onNext(this.x, this)
	}

	draw(gfx: Graphics, y : number, op_y: number, isOutput: boolean) : void {
		switch (this.shape) {
			case "circle":
				gfx.fill_circle(this.x, y, this.color, false)
				break;
			case "square":
				gfx.fill_square(this.x, y, this.color, false)
		}
		gfx.draw_arrow_to_op(this, y, op_y, isOutput);
	}
}

class Err extends Notification{
	constructor(x: number, color?: string){
		super(x, color);
	}

	toRecorded() : Rx.Recorded {
		return Rx.ReactiveTest.onError(this.x, this)
	}

	draw(gfx: Graphics, y : number, op_y: number, isOutput: boolean) : void {
		gfx.draw_cross(this.x, y, this.color)
		gfx.draw_arrow_to_op(this, y, op_y, isOutput)
	}
}

class Complete extends Notification {
	constructor(x: number, color?: string){
		super(x, color);
	}

	toRecorded() : Rx.Recorded {
		return Rx.ReactiveTest.onCompleted(this.x)
	}

	draw(gfx: Graphics, y : number, op_y: number, isOutput: boolean) : void {
		gfx.draw_line(this.x, y - eventRadius, this.x, y + eventRadius, "#000000");
	}
}

interface Point {
	x: number;
	y: number;
}

class Stream {
	shape: string;
	notifications: Notification[];

	constructor(public start : Point,
			public end: Point,
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

	setError(x: number, color?: string) : Stream {
		return this.setErr(new Err(x, color))
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
		else if (notif.x - eventRadius > this.start.x && notif.x + eventRadius < this.end.x) {
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
			return notifBeforeEnd && notif.x - eventRadius > this.start.x
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
		var notifs : Rx.Recorded[] = this.notifications.map((notif) => { return notif.toRecorded() })

		return scheduler.createColdObservable.apply(scheduler, notifs)
	}

	static fromJson(json: JSON, y : number) {
		var start = {x: json["start"], y: y}
		var end = {x: json["maxEnd"], y: y}
		var stream = new Stream(start, end, false, json["shape"]);
		json["notifications"].forEach( (notif) => {
			switch(notif.type) {
				case "Event": stream.addEvent(notif.x, notif.shape, notif.color); break;
				case "Error": stream.setError(notif.x, notif.color); break;
				case "Complete": stream.setCompleteTime(notif.x); break;
				default:
					throw Error("Unkown notification type.");
					console.log(notif);
			}
		})
		return stream;
	}
}

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
		stream.notifications.forEach((notif) => {
			var y = Util.intersection(stream, notif.x)
			notif.draw(this, y, op_y, stream.isOutput)
		})
		this.draw_arrow(stream.start, stream.end)
	}

	draw_arrow_to_op(notif: Notification, y : number, op_y: number, isOutput : boolean) :void {
		if (isOutput) {
			this.draw_dashed_arrow(notif.x, op_y + 2.5 * eventRadius, y - eventRadius)
		} else {
			this.draw_dashed_arrow(notif.x, y + eventRadius, op_y)
		}
	}

	draw_cursor(mousePos: MousePos, currStream: Stream): void {
		// Check if currStream not null
		if(currStream) {
			var isMarked = (currStream.onNotification(mousePos.x) != null) || !currStream.validNotification(new Notification(mousePos.x))
			var y = Util.intersection(currStream, mousePos.x)
			switch (currStream.shape) {
				case "circle":
					return this.draw_circle(mousePos.x, y, "red", isMarked)
				case "square":
					return this.draw_square(mousePos.x, y, "red", isMarked)
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

	draw_arrow(from: Point, to: Point) : void {
		this.ctx.beginPath()
		// Draw the line
		this.ctx.lineWidth = 3
		this.ctx.strokeStyle = "#000000"
		this.ctx.moveTo(from.x, from.y)

		var norm = Util.normalizeVector(Util.makeVector(from, to))
		var arrowBase = {x: to.x - norm.x*eventRadius, y: to.y - norm.y * eventRadius}
		this.ctx.lineTo(arrowBase.x, arrowBase.y)

		// Draw the arrow
		var perp = Util.perpendicularVector(norm)
		this.ctx.moveTo(arrowBase.x - perp.x * eventRadius, arrowBase.y - 0.5 * perp.y * eventRadius)
		this.ctx.lineTo(to.x, to.y)
		this.ctx.lineTo(arrowBase.x + perp.x * eventRadius, arrowBase.y + 0.5 * perp.y * eventRadius)
		this.ctx.closePath()
		this.ctx.stroke()
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
	/**
	 * Get the current input stream that is being moused over.
	 * @return The currently mouse over stream or null
	 **/
	static getCurrentStream(mousePos : MousePos, streams: Stream[]) : Stream {
		var selectedStream : Stream = null
		var minDistance = Number.POSITIVE_INFINITY
		for (var i in streams) {
			var stream = streams[i]
			var y = Util.intersection(stream, mousePos.x)
			var distance = this.diff(y, mousePos.y)
			if (distance < minDistance && distance < 2 * eventRadius) {
				minDistance = distance
				selectedStream = stream
			}
		}
		return selectedStream
	}

	static diff(a : number, b : number) : number {
		return Math.abs(a - b);
	}

	/**
	 * Get the largest y value from the streams and add 3 * eventRadius
	 **/
	static operator_y(streams: Stream[]) {
		return streams.reduce((accum : number, stream : Stream) => {
			if( stream.start.y > accum ) {
				return stream.start.y
			} else if( stream.end.y > accum ) {
				return stream.end.y
			} else {
				return accum
			}
		}, 0) + eventRadius * 3
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

	static triggeredObservable<T>(source : Rx.Observable<T>, trigger : Rx.Observable<any>) {
		return Rx.Observable.create(function (observer) {
			var atEnd : boolean
			var hasValue : boolean
			var value : T

			function triggerSubscribe() {
				if (hasValue) {
					observer.onNext(value);
				}
				if (atEnd) {
					observer.onCompleted();
				}
			}

			return new Rx.CompositeDisposable(
				source.subscribe(function (newValue) {
					hasValue = true;
					value = newValue;
				}, observer.onError.bind(observer), function () {
					atEnd = true;
				}),
				trigger.subscribe(triggerSubscribe, observer.onError.bind(observer), triggerSubscribe)
			)
		})
	}

	/**
	 * Calculates the y intersection on the line from start to end at x.
	 **/
	static intersectionPoints(start: Point, end: Point, x: number) : number {
		var coeff = (end.y - start.y) / (end.x - start.x)
		return (x - start.x) * coeff + start.y
	}

	static intersection(stream: Stream, x: number) : number {
		return Util.intersectionPoints(stream.start, stream.end, x)
	}

	static normalizeVector(vector: Point): Point {
		var x = vector.x
		var y = vector.y
		var len = x*x + y*y
		if (len > 0) {
			var ilen = 1 / Math.sqrt(len);
			return {x: x * ilen, y: y * ilen}
		}
		return undefined
	}

	static perpendicularVector(vector: Point): Point {
		return {x: -vector.y, y: vector.x}
	}

	static makeVector(start: Point, end: Point): Point {
		return {x: end.x - start.x, y: end.y - start.y}
	}
}

interface Tuple2<T1, T2> {
	1: T1;
	2: T2;
}

class MarbleDrawer {
	constructor(canvas: HTMLCanvasElement,
			streamJson: JSON,
			createOutputStream: {(streams: Stream[], op_y: number): Stream}) //(Stream[], number) => Stream
	{
		var streams : Stream[] = MarbleDrawer.initialiseStreamsJson(streamJson)
		var op_y = streams.reduce((accum : number, stream) => { return accum + 4 * eventRadius }, 0)
			+ 2 * eventRadius
		var mousePos: Rx.Observable<MousePos> = Rx.Observable.fromEvent(canvas, 'mousemove')
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
			.startWith({x: -1337, y:-1337}) // Default position

		// On mouse out of the canvas set the mouse position to somewhere 'invisible'.
		var mouseOut = Rx.Observable.fromEvent(canvas, 'mouseout');
		mousePos = mousePos.merge(mouseOut.map((evt) => { return {x: -1337, y:-1337} }))

		// On mouse down add an event to the current stream.
		var mouseDown = Rx.Observable.fromEvent(canvas, 'mousedown')
		Util.triggeredObservable(mousePos, mouseDown)
			.subscribe(MarbleDrawer.mouseDownHandler(streams))

		// When a key is pressed, add the appriopriate notification to the stream.
		var keypress = <Rx.Observable<KeyboardEvent>> Rx.Observable.fromEvent(canvas, 'keypress');
		var combined : Rx.Observable<Tuple2<KeyboardEvent, MousePos>> = keypress.combineLatest(mousePos, (s1, s2) =>{ return {1: s1, 2: s2} })
		// Every keypress, trigger the output.
		Util.triggeredObservable(combined, keypress)
			.subscribe(MarbleDrawer.keyboardHandler(streams))

		// On any user event, update the canvas.
		mousePos.combineLatest(
				//Make sure it has a starting value, for initial rendering.
				(<Rx.Observable<any>> keypress).merge(mouseDown).startWith(''),
				// Only return the mouse pos
				(s1, s2) => {return s1}
			).throttle(1) // Limit to one update per ms
			.subscribe( (mouseEvt: MousePos) => {
				// Update the output stream
				var allStreams = streams.concat(createOutputStream(streams, op_y))
				MarbleDrawer.render(canvas, mouseEvt, allStreams, op_y)
			})
	}

	static initialiseStreamsJson(streamJson: JSON) : Stream[] {
		var y = 2*eventRadius
		return streamJson["streams"].map(json => {
			var r = Stream.fromJson(json, y)
			y += 4*eventRadius
			return r
		})
	}

	static mouseDownHandler(streams: Stream[])
		: (MousePos) => void {
		return (mousePos: MousePos) => {
			var currStream = Util.getCurrentStream(mousePos, streams);
			if(currStream) currStream.addEvent(mousePos.x)
		}
	}

	static keyboardHandler(streams: Stream[])
	: (Tuple2) => void { // Tuple2<KeyboardEvent, MousePos> => void
		return (evts: Tuple2<KeyboardEvent, MousePos>) => {
			var mousePos = evts[2];
			var currStream = Util.getCurrentStream(mousePos, streams);
			if(currStream) {
				switch (evts[1].which) {
					case 101:
						currStream.setError(mousePos.x);
						break;
					case 99:
						currStream.setCompleteTime(mousePos.x);
				}
			}
		}
	}

	static render(canvas: HTMLCanvasElement,
			mousePos: MousePos,
			allStreams : Stream[],
			op_y: number)
	{
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var gfx = new Graphics(canvas, ctx);
		allStreams.forEach(stream => {
			gfx.draw_stream(stream, op_y)
		});
		gfx.draw_cursor(mousePos, Util.getCurrentStream(mousePos, allStreams));
		gfx.draw_operator(op_y);
	}
}
