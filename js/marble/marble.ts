///<reference path="../rx/rx-lite.d.ts"/>
///<reference path="../rx/rx.d.ts"/>
///<reference path="../rx/rx.testing.d.ts"/>

var eventRadius = 20;

class Notification{
	x: number;
	color: string = Util.random_color();

	constructor(x: number, color?: string){
		this.x = x;
		if(color) this.color = color;
	}
}

class Evt extends Notification {
	shape: string;
	
	constructor(x: number, shape: string, color?: string) {
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
	y: number;
	start: number;
	maxEnd: number;
	isOutput: boolean;
	shape: string;
	notifications: Notification[];

	constructor(y : number, start : number, maxEnd : number, isOutput : boolean, shape?: string) {
		this.y = y;
		this.start = start;
		this.maxEnd = maxEnd;
		this.isOutput = isOutput;
		if(shape) this.shape = shape;
		if (!this.isOutput && this.shape == null) {
			throw Error("Expected shape");
		}
		this.notifications = [];
	}

	addEvent(mousePos : MousePos) : Stream {
		if (this.removeNotif(mousePos)) {

		} else if (this.validNotification(new Notification(mousePos.x))) {
			this.notifications.push({
				x: mousePos.x,
				color: Util.random_color(),
				shape: this.shape,
				type: "Event"
			});
		}
		return this;
	}

	setError(mousePos : MousePos) : Stream {
		return this.setUnique(mousePos, {
			x: mousePos.x,
			color: Util.random_color(),
			type: "Error"
		});
	}

	setComplete(mousePos : MousePos) : Stream {
		return this.setUnique(mousePos, {
			x: mousePos.x,
			type: "Complete"
		});
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

	setUnique(mousePos : MousePos, uniqueNotif) : Stream {
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
	
	toObservable(scheduler) {
		var notifs;
		notifs = this.notifications.map(function(notif) {
			var notifType = (function() {
				console.log(typeof notif);
				switch (typeof notif) {
					case "Event":
						return Rx.ReactiveTest.onNext;
					case "Error":
						return Rx.ReactiveTest.onError;
					case "Complete":
						return Rx.ReactiveTest.onCompleted;
					default:
						throw Error("Something wrong with notification type");
				}
			})();
			return notifType(notif.x, notif);
		});
		return scheduler.createColdObservable(notifs);
	}

	static fromJson(json, y : number) {
		var stream;
		stream = new Stream(y, json.start, json.maxEnd, false, json.shape);
		json.notifications.forEach(function(notif) {
			if (notif["color"] == null) {
				return notif.color = Util.random_color();
			}
		});
		stream.notifications = json.notifications;
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
	private ctx;
	constructor(ctx : HTMLCanvasElement) {
		this.ctx = ctx;
	}

	draw_stream(stream : Stream, op_y : number) : void {
		var maxEnd = 500; // Default value
		stream.notifications.forEach(function(notif){
			switch (typeof notif) {
				case "Event":
					this.draw_event(stream, notif);
					break;
				case "Error":
					this.draw_error(stream, notif);
					break;
				case "Complete":
					this.draw_complete(stream, notif);
					maxEnd = notif.x + 2 * eventRadius;
			}
		});
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
		this.ctx.rect(10, op_y, this.ctx.width - 20, 2.5 * eventRadius);
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = "#000000";
		this.ctx.stroke();
	}

	/**
	 * GRAPHICAL PRIMITIVES
	 **/

	draw_line(fromx, fromy, tox, toy, color) {
		this.ctx.beginPath();
		this.ctx.lineWith = 3;
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
	/*
	 * MAIN
	 */
	var mousePos: MousePos;
	var currStream: Stream;


	window.onload = function() {
		var canvas = <HTMLCanvasElement> document.getElementById("rxCanvas");
		var streamJson = Util.getJson("merge.json");
		var streams = streamJson["streams"].map(Stream.fromJson, Stream);
		var currStream = streams[0];

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

		mousePosObs.subscribe(
			function (evt){
				// Keep mousePos updated
				mousePos = evt;

				// Keep the current stream updated
				currStream = Util.getCurrentStream(mousePos, streams);
			}
		);

		var mouseDownObs = Rx.Observable.fromEvent(canvas, 'mousedown');
		mouseDownObs.subscribe(function(evt){
			if (Util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
				currStream.addEvent(mousePos);
			}
		});

		var mouseOutObs = Rx.Observable.fromEvent(canvas, 'mouseout');
		mouseOutObs.subscribe(function(evt){
			mousePos = {
				x: -1337,
				y: -1337
			};
		});

		var keypressObs = <Rx.Observable<KeyboardEvent>> Rx.Observable.fromEvent(canvas, 'keypress');
		keypressObs.subscribe(function(evt){
			if (Util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
				switch (evt.which) {
					case 101:
						currStream.setError(mousePos);
						break;
					case 99:
						currStream.setComplete(mousePos);
				}
			}
		});

		render(canvas, mousePos, streams); 
	};



	/*
	 * LOGIC
	 */
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
			output_stream.notifications.push({
				x: scheduler.now(),
				type: "Complete"
			});
			output_stream.maxEnd = output_stream.end + 2 * eventRadius;
		});
		scheduler.start();
		return output_stream;
	};

	function render(canvas: HTMLCanvasElement, mousePos: MousePos, streams : Stream[]) {
		var ctx, gfx;
		ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		gfx = new Graphics(ctx);
		streams.concat(create_output_stream(streams, 400)).forEach(gfx.draw_stream, gfx);
		gfx.draw_cursor(mousePos);
		gfx.draw_operator(canvas);
	};
}).call(this);
