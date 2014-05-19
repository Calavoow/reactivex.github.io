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

	addEvent(mousePos : MousePos) : Stream {
		if (this.removeNotif(mousePos)) {

		} else if (this.validNotification(new Notification(mousePos.x))) {
			this.notifications.push(new Evt(mousePos.x, this.shape));
		}
		return this;
	}

	setError(mousePos : MousePos) : Stream {
		return this.setUnique(mousePos, new Err(mousePos.x));
	}

	setComplete(mousePos : MousePos) : Stream {
		return this.setUnique(mousePos, new Complete(mousePos.x));
	}

	removeNotif(mousePos : MousePos) : boolean {
		var notifIdx;
		notifIdx = this.onNotification(mousePos);
		if (notifIdx != null) {
			this.notifications.splice(notifIdx, 1);
			return true;
		} else {
			return false;
		}
	}

	setUnique(mousePos : MousePos, uniqueNotif : Notification) : Stream {
		if (this.removeNotif(mousePos)) {

		} else if (mousePos.x - eventRadius > this.start && mousePos.x + eventRadius < this.maxEnd) {
			this.notifications.push(uniqueNotif);
		}
		this.notifications = this.notifications.filter(this.validNotification, this);
		return this;
	}

	/*
	 * Invariant property of Notifications
	 *
	 * Requires a .x property on given events and errors.
	 */
	validNotification(notif: Notification) : boolean {
		var notifBeforeEnd, uniqueNotifs;
		uniqueNotifs = this.notifications.filter(function(curNotif) {
			return typeof notif === "Error" || typeof notif === "Complete";
		});
		if (typeof notif === "Error" || typeof notif === "Complete") {
			return notif.x === uniqueNotifs[uniqueNotifs.length - 1].x;
		} else {
			notifBeforeEnd = !uniqueNotifs.some(function(uniqueNotif) {
				return notif.x + eventRadius >= uniqueNotif.x;
			});
			return notifBeforeEnd && notif.x - eventRadius > this.start;
		}
	}


	/*
	 * Find if the mouse is on a notification in this stream.
	 */

	onNotification(mousePos) {
		var i, notif, _i, _len, _ref;
		_ref = this.notifications;
		for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
			notif = _ref[i];
			if (Util.diff(notif.x, mousePos.x) < 2 * eventRadius) {
				return i;
			}
		}
		return null;
	}
	
	toObservable(scheduler : Rx.TestScheduler) : Rx.Observable<Notification> {
		var notifs : Rx.Recorded[] = this.notifications.map(function(notif) {
			var notifType
			if(notif instanceof Evt) notifType = Rx.ReactiveTest.onNext
			else if(notif instanceof Err) notifType = Rx.ReactiveTest.onError
			else if(notif instanceof Complete) notifType = Rx.ReactiveTest.onCompleted
			else throw Error("Something wrong with notification type")
			return notifType(notif.x, notif)
		});
		return scheduler.createColdObservable.apply(notifs);
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
			if(notif instanceof Evt) this.draw_event(stream, notif);
			else if(notif instanceof Err) this.draw_error(stream, notif);
			else if(notif instanceof Complete){
				this.draw_complete(stream, notif);
				maxEnd = notif.x + 2 * eventRadius;
			} else {

			}
		}, this);
		this.draw_arrow(stream.start, maxEnd, stream.y);
	}

	draw_event(stream : Stream, event : Evt, op_y: number, isOutput : boolean) : void {
		switch (event.shape) {
			case "circle":
				this.fill_circle(event.x, stream.y, event.color, false);
				break;
			case "square":
				this.fill_square(event.x, stream.y, event.color, false);
		}
		return this.draw_arrow_to_op(stream, event, op_y);
	}

	draw_error(stream : Stream, error : Err, op_y: number, isOutput: boolean) {
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
			var isMarked = currStream.onNotification(mousePos);
			switch (currStream.shape) {
				case "circle":
					return this.draw_circle(mousePos.x, currStream.y, "red", isMarked != null);
				case "square":
					return this.draw_square(mousePos.x, currStream.y, "red", isMarked != null);
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

	draw_line(fromx, fromy, tox, toy, color) {
		this.ctx.beginPath();
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = color;
		this.ctx.moveTo(fromx, fromy);
		this.ctx.lineTo(tox, toy);
		this.ctx.stroke();
	}

	draw_cross(centerx, centery, color) {
		this.draw_line(centerx - eventRadius, centery + eventRadius, centerx + eventRadius, centery - eventRadius, color);
		this.draw_line(centerx - eventRadius, centery - eventRadius, centerx + eventRadius, centery + eventRadius, color);
	}

	draw_arrow(fromx, tox, y) {
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

	draw_dashed_arrow(x, fromy, toy) {
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

	draw_circle(centerx, centery, color, isMarked) {
		this.circle(centerx, centery, color, isMarked, function(ctx) {
			ctx.stroke();
		});
	}

	fill_circle(centerx, centery, color, isMarked) {
		this.circle(centerx, centery, color, isMarked, function(ctx) {
			ctx.fill();
		});
	}

	circle(centerx, centery, color, isMarked, drawFunc) {
		this.ctx.beginPath();
		this.ctx.arc(centerx, centery, eventRadius, 0, 2 * Math.PI, false);
		this.ctx.fillStyle = color;
		drawFunc(this.ctx);
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
		this.ctx.stroke();
	}

	draw_square(centerx, centery, color, isMarked) {
		this.square(centerx, centery, color, isMarked, false);
	}

	fill_square(centerx, centery, color, isMarked) {
		this.square(centerx, centery, color, isMarked, true);
	}

	square(centerx, centery, color, isMarked, doFill) {
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

	static output_stream_y(streams : Stream[]) {
		var i, stream, ypos;
		ypos = 0;
		for (i in streams) {
			stream = streams[i];
			if (stream.y > ypos) {
				ypos = stream.y;
			}
		}
		return ypos + eventRadius * 9;
	}

	static random_color() {
		var color, i, letters;
		letters = "0123456789ABCDEF".split("");
		color = "#";
		i = 0;
		while (i < 6) {
			color += letters[Math.round(Math.random() * 15)];
			i++;
		}
		return color;
	}

	static httpGet(theUrl) {
		var xmlHttp;
		xmlHttp = null;
		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", theUrl, false);
		xmlHttp.send(null);
		return xmlHttp.responseText;
	}

	static getJson(url) {
		return JSON.parse(Util.httpGet(url));
	}
}

(function() {
	window.onload = function() {
		var canvas = <HTMLCanvasElement> document.getElementById("rxCanvas");
		var streamJson = Util.getJson("merge.json");
		var y = 0 
		var streams : Stream[] = streamJson["streams"].map(function(json) {
			y += 4*eventRadius
			return Stream.fromJson(json, y)
		});

		var mousePosObs: Rx.Observable<MousePos> = Rx.Observable.fromEvent(canvas, 'mousemove')
			.map(function(evt: MouseEvent) {
				var rect = canvas.getBoundingClientRect();
				return evt != null ? {
					x: evt.clientX - rect.left,
					y: evt.clientY - rect.top
				} : {
					x: 0,
					y: 0
				};
			});

		var mousePos = new Rx.BehaviorSubject({x:0, y:0});
		mousePosObs.subscribe(function(mouseEvt) {
			mousePos.onNext(mouseEvt);
		});

		var mouseDownObs = Rx.Observable.fromEvent(canvas, 'mousedown');
		mouseDownObs.subscribe(function(){
			mousePos.take(1).subscribe(function(mouseEvt){
				var currStream = Util.getCurrentStream(mouseEvt, streams);
				if (Util.diff(mouseEvt.y, currStream.y) < 2 * eventRadius) {
					currStream.addEvent(mouseEvt);
				}
			});
		});

		var mouseOutObs = Rx.Observable.fromEvent(canvas, 'mouseout');
		mouseOutObs.subscribe(function(evt){
			mousePos.onNext({
					x: -1337,
					y: -1337
			});
		});

		var keypressObs = <Rx.Observable<KeyboardEvent>> Rx.Observable.fromEvent(canvas, 'keypress');
		keypressObs.subscribe(function(evt){
			mousePos.take(1).subscribe(function(mouseEvt) {
				var currStream = Util.getCurrentStream(mouseEvt, streams);
				if (Util.diff(mouseEvt.y, currStream.y) < 2 * eventRadius) {
					switch (evt.which) {
						case 101:
							currStream.setError(mouseEvt);
							break;
						case 99:
							currStream.setComplete(mouseEvt);
					}
				}
			});
		});


		// On any user event, update the canvas.
		mouseDownObs.merge(keypressObs).merge(mousePos).subscribe(function(){
			mousePos.take(1).subscribe(function(mouseEvt) {
				render(canvas, mouseEvt, streams); 
			});
		});
	};

	/**
	 * LOGIC
	 **/
	function create_output_stream(streams: Stream[], op_y: number) {
		var inputStreams, output_stream, scheduler;
		scheduler = new Rx.TestScheduler();

		inputStreams = streams.map(function(stream) {
			return stream.toObservable(scheduler);
		});
		output_stream = new Stream(op_y, 10, 0, true);

		// Combine the streams
		inputStreams.reduce(function(accum, obs) {
			return accum.merge(obs);
		}).subscribe((function(evt) {
			output_stream.notifications.push(evt);
		}), (function(err) {
			output_stream.notifications.push(err);
			output_stream.maxEnd = err.x + 3 * eventRadius;
		}), function() {
			output_stream.notifications.push(new Complete(scheduler.now()));
			output_stream.maxEnd = output_stream.end + 2 * eventRadius;
		});
		scheduler.start();
		return output_stream;
	};

	function render(canvas: HTMLCanvasElement, mousePos: MousePos, streams : Stream[]) {
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var gfx = new Graphics(canvas, ctx);
		streams.concat(create_output_stream(streams, 400)).forEach(gfx.draw_stream, gfx);
		gfx.draw_cursor(mousePos, Util.getCurrentStream(mousePos, streams));
		gfx.draw_operator(300);
	};
}).call(this);
