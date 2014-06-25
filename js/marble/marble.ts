///<reference path="../RxJS/ts/rx.d.ts"/>
///<reference path="../RxJS/ts/rx.testing.d.ts"/>
///<reference path="../RxJS/ts/rx.async.d.ts"/>
///<reference path="../RxJS/ts/rx.binding.d.ts"/>
///<reference path="../RxJS/ts/rx.time.d.ts"/>

// A constant defining the size of the notification drawings.
var eventRadius = 20;

class Notification {
	color: string = Util.randomColor();

	constructor(public x: number, color?: string) {
		if(color) this.color = color;
	}

	toRecorded() : Rx.Recorded {
		throw new Error("toRecorded not implemented")
	}

	drawOnStream(gfx: Graphics, y : number, isOutput: boolean, op_y: number) : void {
		this.draw(gfx, y, isOutput, true, op_y)
	}

	draw(gfx: Graphics, y : number, isOutput: boolean, onStream: boolean, op_y?: number, isMarked?: boolean) : void {
		throw new Error("draw not implemented")
	}

	toJson() : JSON {
		throw new Error("toJSON not implemented")
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

	draw(gfx: Graphics, y : number, isOutput: boolean, onStream: boolean, op_y?: number, isMarked?: boolean) : void {
		if(onStream && !op_y) throw new Error("Expected op_y")
		var marked = false
		if(isMarked) marked = isMarked

		switch (this.shape) {
			case "circle":
				gfx.circle({x: this.x, y: y}, this.color, marked, onStream)
				break
			case "square":
				gfx.square({x: this.x, y: y}, this.color, marked, onStream)
				break
			case "triangle":
				gfx.triangle({x: this.x, y: y}, this.color, marked, onStream)
		}
		if(op_y) {
			gfx.draw_arrow_to_op(this, y, op_y, isOutput);
		}
	}

	toJson() : any {
		return {x: this.x, shape: this.shape, type: "Event", color: this.color}
	}
}

class Err extends Notification{
	constructor(x: number, color?: string){
		super(x, color);
	}

	toRecorded() : Rx.Recorded {
		return Rx.ReactiveTest.onError(this.x, this)
	}

	draw(gfx: Graphics, y : number, isOutput: boolean, onStream: boolean, op_y?: number, isMarked?: boolean) : void {
		var color = this.color
		if(!onStream) color = "#000000"
		gfx.cross({x: this.x, y: y}, color)

		if(op_y) {
			gfx.draw_arrow_to_op(this, y, op_y, isOutput)
		}
	}

	toJson() : any {
		return {x: this.x, type: "Error", color: this.color}
	}
}

class Complete extends Notification {
	constructor(x: number, color?: string){
		super(x, color);
	}

	toRecorded() : Rx.Recorded {
		return Rx.ReactiveTest.onCompleted(this.x)
	}

	draw(gfx: Graphics, y : number, isOutput: boolean, onStream: boolean, op_y?: number, isMarked?: boolean) : void {
		gfx.line({x: this.x, y: y - eventRadius}, {x: this.x, y: y + eventRadius},  "#000000");
	}

	toJson(): any {
		return {x: this.x, type: "Complete"}
	}
}

interface Point {
	x: number;
	y: number;
}

/**
 * Abstract class Stream, provides the base class for streams.
 *
 * Abstract classes not implemented yet.
 **/
class Stream<T> {
	shape: string; // Can be undefined, if it is of multiple shapes
	notifications: T[];

	constructor(public start : Point,
			public end: Point,
			public isOutput : boolean,
			shape?: string) {
		this.notifications = [];
		this.shape = shape
	}

	draw(gfx: Graphics, op_y: number) : void {
		throw new Error("draw not implemented")
	}
}

class OutputStream<T> extends Stream<T> {
	height(): number {
		throw new Error("heightObservable not implemented")
	}

	toJson() : any {
		throw new Error("toJson not implemented")
	}
}

class BasicStream extends OutputStream<Notification> {
	constructor(public start : Point,
			public end: Point,
			public isOutput : boolean,
			shape?: string) {
		super(start, end, isOutput, shape)
	}

	addEvent(x: number, shape?: string, color?: string) : BasicStream {
		if(shape) this.addEvt(new Evt(x, shape, color))
		else this.addEvt(new Evt(x, this.shape, color))

		return this
	}

	addEvt(evt: Evt) : BasicStream {
		if(this.isOutput) { // Ignore conistency rules, this is the output stream
			this.notifications.push(evt)
		} else if (this.removeNotif(evt)) {
			// If the event overlaps with another event, remove it.
		} else if (this.validNotification(evt)) {
			this.notifications.push(evt)
		}
		return this;
	}

	setError(x: number, color?: string) : BasicStream {
		return this.setErr(new Err(x, color))
	}

	setErr(err: Err) : BasicStream {
		return this.setUnique(err)
	}

	setCompleteTime(x : number) : BasicStream {
		return this.setComplete(new Complete(x))
	}

	setComplete(compl: Complete) : BasicStream {
		return this.setUnique(compl)
	}

	private setUnique(notif: Notification) : BasicStream {
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
			if(uniqueNotifs.length == 0) {
				return true
			} else {
				// If this notification is the last one added to uniqueNotifs, it is valid.
				return notif.x === uniqueNotifs[uniqueNotifs.length - 1].x
			}
		} else {
			// The notification is an Event
			var evt = <Evt> notif
			// If this stream enforces shapes and the event has a shape
			var validShape = true
			if(this.shape && evt.shape) { 
				// Then they have to be the same
				validShape = evt.shape == this.shape
			}

			// If this Notification occurs before the latest unique notification, then that is part 1.
			var notifBeforeEnd = !uniqueNotifs.some(function(uniqueNotif) {
				return notif.x + eventRadius >= uniqueNotif.x
			})
			// And if it is after the start of the Stream then it is valid.
			var notifAfterBegin = notif.x - eventRadius > this.start.x
			return validShape && notifBeforeEnd && notifAfterBegin
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

	draw(gfx: Graphics, op_y : number) : void {
		this.notifications.forEach((notif) => {
			var y = Util.intersection(this, notif.x)
			notif.drawOnStream(gfx, y, this.isOutput, op_y)
		})
		gfx.arrow(this.start, this.end, false)
	}

	height(): number {
		return Math.max(this.start.y, this.end.y) + 2*eventRadius
	}

	static fromJson(json: JSON, y : number) : BasicStream {
		var start = {x: json["start"], y: y}
		var end = {x: json["maxEnd"], y: y}
		var stream = new BasicStream(start, end, false, json["shape"]);
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
	
	toJson() : any {
		return {
			start: this.start.x,
			end: this.end.x,
			notifications: this.notifications.map((notif) => {return notif.toJson()}),
			shape: this.shape
		}
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

	draw_arrow_to_op(notif: Notification, y : number, op_y: number, isOutput : boolean) :void {
		if (isOutput) {
			this.arrow({x: notif.x, y: op_y + 2.5*eventRadius},{x: notif.x, y:y - eventRadius}, true)
		} else {
			this.arrow({x: notif.x, y:y + eventRadius}, {x: notif.x, y:op_y}, true)
		}
	}

	draw_cursor(mousePos: MousePos, shape: string, currStream: BasicStream): void {
		// Check if currStream not null
		if(currStream) {
			var notif: Notification 
			if(shape == "error") {
				notif = new Err(mousePos.x)
			} else if(shape == "complete") {
				notif = new Complete(mousePos.x)
			} else {
				notif = new Evt(mousePos.x, shape)
			}

			var isMarked = (currStream.onNotification(mousePos.x) != null) || !currStream.validNotification(notif)
			var y = Util.intersection(currStream, mousePos.x)
			notif.draw(this, y, true, false, undefined, isMarked)
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
	line(from: Point, to: Point, color : string) : void {
		this.ctx.beginPath()
		this.ctx.lineWidth = 3
		this.ctx.strokeStyle = color
		this.ctx.moveTo(from.x, from.y)
		this.ctx.lineTo(to.x, to.y)
		this.ctx.stroke()
	}

	cross(center: Point, color : string) : void {
		this.line({x: center.x - eventRadius, y: center.y + eventRadius}, {x: center.x + eventRadius, y: center.y - eventRadius}, color);
		this.line({x: center.x - eventRadius, y: center.y - eventRadius}, {x: center.x + eventRadius, y: center.y + eventRadius}, color);
	}

	arrow(from: Point, to: Point, dashed: boolean) : void {
		this.ctx.beginPath()
		// Draw the line
		this.ctx.lineWidth = 3
		this.ctx.strokeStyle = "#000000"
		if(dashed) {
			this.ctx.setLineDash([4, 7])
		}
		this.ctx.moveTo(from.x, from.y)

		var norm = Util.normalizeVector(Util.makeVector(from, to))
		var arrowBase = {x: to.x - norm.x*eventRadius, y: to.y - norm.y * eventRadius}
		this.ctx.lineTo(arrowBase.x, arrowBase.y)
		this.ctx.closePath()
		this.ctx.stroke()

		if(dashed) {
			this.ctx.setLineDash([])
		}

		// Draw the arrow
		this.ctx.beginPath()
		var perp = Util.perpendicularVector(norm)
		this.ctx.moveTo(arrowBase.x - perp.x * eventRadius, arrowBase.y - 0.5 * perp.y * eventRadius)
		this.ctx.lineTo(to.x, to.y)
		this.ctx.lineTo(arrowBase.x + perp.x * eventRadius, arrowBase.y + 0.5 * perp.y * eventRadius)
		this.ctx.closePath()
		this.ctx.stroke()
	}

	circle(center: Point, color: string, isMarked : boolean, doFill: boolean) : void {
		this.ctx.beginPath()
		this.ctx.arc(center.x, center.y, eventRadius, 0, 2 * Math.PI, false)
		if(doFill) {
			this.ctx.fillStyle = color
			this.ctx.fill()
		}
		this.ctx.lineWidth = 3
		this.ctx.strokeStyle = (isMarked ? "red" : "#000000")
		this.ctx.stroke()
	}

	square(center: Point, color : string, isMarked : boolean, doFill : boolean) : void {
		this.ctx.beginPath()
		this.ctx.rect(center.x - eventRadius, center.y - eventRadius, 2 * eventRadius, 2 * eventRadius)
		if (doFill) {
			this.ctx.fillStyle = color
			this.ctx.fill()
		}
		this.ctx.lineWidth = 3
		this.ctx.strokeStyle = (isMarked ? "red" : "#000000")
		this.ctx.stroke()
	}

	/**
	 * Draw an isosecles triangle
	 *
	 * An equilateral triangle looks bad, because it looks unaligned with the square and circle.
	 **/
	triangle(center: Point, color : string, isMarked : boolean, doFill : boolean) : void {
		this.ctx.beginPath()
		this.ctx.moveTo(center.x, center.y - eventRadius)
		this.ctx.lineTo(center.x + Math.cos(7/6 * Math.PI) * eventRadius, center.y + eventRadius)
		this.ctx.lineTo(center.x + Math.cos(11/6 * Math.PI) * eventRadius, center.y + eventRadius)
		this.ctx.closePath()
		if (doFill) {
			this.ctx.fillStyle = color
			this.ctx.fill()
		}
		this.ctx.lineWidth = 3
		this.ctx.strokeStyle = (isMarked ? "red" : "#000000")
		this.ctx.stroke()
	}
}

module Util {
	/**
	 * Get the current input stream that is being moused over.
	 * @return The currently mouse over stream or null
	 **/
	export function getCurrentStream(mousePos : MousePos, inputStreams: BasicStream[]): BasicStream {
		var selectedStream : BasicStream = null
		var minDistance = Number.POSITIVE_INFINITY
		for (var i in inputStreams) {
			var stream = inputStreams[i]
			var y = Util.intersection(stream, mousePos.x)
			var distance = this.diff(y, mousePos.y)
			if (distance < minDistance && distance < 2 * eventRadius) {
				minDistance = distance
				selectedStream = stream
			}
		}
		return selectedStream
	}

	export function diff(a : number, b : number) : number {
		return Math.abs(a - b);
	}

	/**
	 * Get the largest y value from the streams and add 3 * eventRadius
	 **/
	export function operator_y(streams: Stream<any>[]) {
		return streams.reduce((accum : number, stream : Stream<any>) => {
			if( stream.start.y > accum ) {
				return stream.start.y
			} else if( stream.end.y > accum ) {
				return stream.end.y
			} else {
				return accum
			}
		}, 0) + eventRadius * 3
	}

	export function randomColor() : string {
		var letters = "0123456789ABCDEF".split("");
		var color = "#";
		var i = 0;
		while (i < 6) {
			color += letters[Math.round(Math.random() * 15)];
			i++;
		}
		return color;
	}

	export function randomShape() : string {
		var shapes = ["circle", "square", "triangle"]
		return shapes[Util.randomInt(0,2)]
	}

	export function randomInt(min : number, max: number) : number {
		return Math.floor(Math.random() * (max-min+1) + min)
	}

	export function httpGet(theUrl : string) : string {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", theUrl, false);
		xmlHttp.send(null);
		return xmlHttp.responseText;
	}

	export function getJson(url : string) : JSON {
		return JSON.parse(Util.httpGet(url));
	}

	export function triggeredObservable<T>(source : Rx.Observable<T>, trigger : Rx.Observable<any>) {
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
	export function intersectionPoints(start: Point, end: Point, x: number) : number {
		var coeff = (end.y - start.y) / (end.x - start.x)
		return (x - start.x) * coeff + start.y
	}

	export function intersection(stream: Stream<any>, x: number) : number {
		return Util.intersectionPoints(stream.start, stream.end, x)
	}

	export function normalizeVector(vector: Point): Point {
		var x = vector.x
		var y = vector.y
		var len = x*x + y*y
		if (len > 0) {
			var ilen = 1 / Math.sqrt(len);
			return {x: x * ilen, y: y * ilen}
		}
		return undefined
	}

	export function perpendicularVector(vector: Point): Point {
		return {x: -vector.y, y: vector.x}
	}

	export function makeVector(start: Point, end: Point): Point {
		return {x: end.x - start.x, y: end.y - start.y}
	}

}

interface Tuple2<T1, T2> {
	_1: T1;
	_2: T2;
}

class MarbleDrawer {
	constructor(canvas: HTMLCanvasElement,
			streamJson: JSON,
			createOutputStream: {(streams: BasicStream[], op_y: number): OutputStream<any>}, //(Stream[], number) => Stream
			createJson: Rx.Observable<any>,
			jsonOutput: (OutputStream) => void,
			mouseEventType: Rx.Observable<string>)
	{
		var streams : BasicStream[] = this.initialiseStreamsJson(streamJson)
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
		var mouseOut = Rx.Observable.fromEvent(canvas, 'mouseout')
		mousePos = mousePos.merge(mouseOut.map((evt) => { return {x: -1337, y:-1337} }))

		// On mouse down add an event to the current stream.
		var mouseDown = Rx.Observable.fromEvent(canvas, 'mousedown')
		var mouseShape : Rx.Observable<Tuple2<MousePos, string>> = mousePos.combineLatest(mouseEventType, (pos, type) => {
			return {_1: pos, _2: type}
		})
		Util.triggeredObservable(mouseShape, mouseDown)
			.subscribe(this.mouseDownHandler(streams))

		// When a key is pressed, add the appriopriate notification to the stream.
		var keypress = <Rx.Observable<KeyboardEvent>> Rx.Observable.fromEvent(canvas, 'keypress')
		var combined : Rx.Observable<Tuple2<KeyboardEvent, MousePos>> = keypress.combineLatest(mousePos, (s1, s2) =>{ return {_1: s1, _2: s2} })
		// Every keypress, trigger the output.
		Util.triggeredObservable(combined, keypress)
			.subscribe(this.keyboardHandler(streams))

		// On any user event, update the canvas.
		mouseShape.combineLatest(
				//Make sure it has a starting value, for initial rendering.
				(<Rx.Observable<any>> keypress).merge(mouseDown).startWith(''),
				// Only return the mouse pos
				(s1, s2) => {return s1}
			).throttle(1) // Limit to one update per ms
			.subscribe( (mouseShape: Tuple2<MousePos, string>) => {
				// Update the output stream
				var outputStream = createOutputStream(streams, op_y)
				this.render(canvas, mouseShape._1, mouseShape._2, streams, outputStream, op_y)
			})

		// On every create Json event, call the Json output with the output stream.
		createJson.subscribe( () =>{
			var outputStream = createOutputStream(streams, op_y)
			jsonOutput(outputStream)
		})
	}

	initialiseStreamsJson(streamJson: JSON) : BasicStream[] {
		var y = 2*eventRadius
		return streamJson["streams"].map(json => {
			var r = BasicStream.fromJson(json, y)
			y += 4*eventRadius
			return r
		})
	}

	mouseDownHandler(streams: BasicStream[])
		: (Tuple2) => void { //Tuple2<MousePos, string>
		return (mouseShape: Tuple2<MousePos, string>) => {
			var mousePos = mouseShape._1
			var shape = mouseShape._2
			var currStream = Util.getCurrentStream(mousePos, streams)
			// If there is no current stream
			if(!currStream) return

			if(shape == "error") {
				currStream.setError(mousePos.x)
			} else if(shape == "complete") {
				currStream.setCompleteTime(mousePos.x)
			} else {
				currStream.addEvent(mousePos.x, shape)
			}
		}
	}

	keyboardHandler(streams: BasicStream[])
	: (Tuple2) => void { // Tuple2<KeyboardEvent, MousePos> => void
		return (evts: Tuple2<KeyboardEvent, MousePos>) => {
			var mousePos = evts._2
			var currStream = Util.getCurrentStream(mousePos, streams)
			if(currStream) {
				switch (evts._1.which) {
					case 101:
						currStream.setError(mousePos.x)
						break
					case 99:
						currStream.setCompleteTime(mousePos.x)
				}
			}
		}
	}

	render(canvas: HTMLCanvasElement,
			mousePos: MousePos,
			mouseShape: string,
			inputStreams: BasicStream[],
			outputStream: OutputStream<any>,
			op_y: number)
	{
		var ctx = canvas.getContext("2d")
		// Adjust context height depending on output stream
		ctx.canvas.height = outputStream.height()
		ctx.clearRect(0, 0, canvas.width, canvas.height)

		var gfx = new Graphics(canvas, ctx)
		var allStreams = (<Stream<any>[]> inputStreams).concat(outputStream)
		allStreams.forEach((stream) => {stream.draw(gfx, op_y)})
		gfx.draw_cursor(mousePos, mouseShape, Util.getCurrentStream(mousePos, inputStreams))
		gfx.draw_operator(op_y)
	}
}
