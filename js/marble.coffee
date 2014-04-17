###
# GLOBALS
###
canvas = undefined
streams = undefined
currStream = undefined
eventRadius = 20

###
# MAIN
###

window.onload = ->
	# init globals
	canvas = document.getElementById("rxCanvas")
	streams = [
		{
			shape: "circle"
			y: canvas.height / 8
			notifications: []
			end: 450
			start: 10
			maxEnd: canvas.width - 10
		}
		{
			shape: "square"
			y: canvas.height / 8 * 3
			notifications: []
			end: 470
			start: 10
			maxEnd: canvas.width - 10 
		}
	]
	currStream = streams[0]
	
	# register event handlers
	canvas.addEventListener "mousemove", ((evt) ->
		mousePos = util.setMousePos(canvas, evt)
		currStream = util.getCurrentStream(mousePos)
		render canvas, mousePos
		return
	), false

	canvas.addEventListener "mousedown", ((evt) ->
		mousePos = util.setMousePos(canvas, evt)
		if util.diff(mousePos.y, currStream.y) < 2 * eventRadius
			# Remove the notification at the current position, if it exists.
			notifIdx = util.onNotification(mousePos)
			if notifIdx?
				removeNotification(notifIdx)
			else
				addEvent(mousePos)
			render canvas, mousePos
		return
	), false

	canvas.addEventListener "mouseout", ((evt) ->
		mousePos =
			x: -1337
			y: -1337

		render canvas, mousePos
		return
	), false

	canvas.addEventListener "keypress", ((evt) ->
		mousePos = util.getMousePos()
		if util.diff(mousePos.y, currStream.y) < 2 * eventRadius
			notifIdx = util.onNotification(mousePos)
			if notifIdx?
				console.log("Removin thing")
				removeNotification(notifIdx)
			else
				switch evt.which
					when 101
						console.log("E pressed")
						addError(mousePos)
					when 99 
						console.log("C pressed")
						setComplete(mousePos)
					else
						console.log(evt.which)

		return
	), false
		
	
	# bootstrap rendering
	render canvas, util.getMousePos()
	return

###
# LOGIC
###
create_output_stream = ->
	scheduler = new Rx.TestScheduler()
	xs = stream_to_observable(streams[0], scheduler)
	ys = stream_to_observable(streams[1], scheduler)
	output_stream =
		shape: "unknown"
		y: util.output_stream_y()
		notifications: []
		start: 10
		end: 0

	xs.merge(ys).subscribe ((evt) ->
		
		#console.log("[OK] " + evt + " " + scheduler.now());
		output_stream.notifications.push evt
		return
	), ((err) ->
	
	#console.log("[ERROR] " + err);
	), ->
		
		#console.log("[DONE] " + scheduler.now());
		output_stream.end = scheduler.now()
		output_stream.maxEnd = output_stream.end + 2*eventRadius
		return

	scheduler.start()
	output_stream

stream_to_observable = (stream, scheduler) ->
	onNext = Rx.ReactiveTest.onNext
	onCompleted = Rx.ReactiveTest.onCompleted
	notifications= []
	i = 0

	while i < stream.notifications.length
		evt = stream.notifications[i]
		notifications.push onNext(evt.x, evt) if evt?
		i++
	notifications.push onCompleted(stream.end)
	scheduler.createColdObservable notifications 

render = (canvas, mousePos) ->
	ctx = canvas.getContext("2d")
	ctx.clearRect 0, 0, canvas.width, canvas.height

	gfx = new Graphics(ctx)
	
	#var message = mousePos.x + ',' + mousePos.y;
	#		ctx.font = '18pt Calibri';
	#		ctx.fillStyle = 'black';
	#		ctx.fillText(message, 10, 25);
	for i of streams
		gfx.draw_stream streams[i], false
	util.set_pointer mousePos
	gfx.draw_cursor mousePos
	gfx.draw_operator canvas
	gfx.draw_stream create_output_stream(), true
	return

addEvent = (mousePos) ->
	if mousePos.x + eventRadius < currStream.end
		currStream.notifications.push
			x: mousePos.x
			color: util.random_color()
			shape: currStream.shape
	return

setComplete = (mousePos) ->
	if mousePos.x - eventRadius > currStream.start and mousePos.x + eventRadius < currStream.maxEnd
		currStream.end = mousePos.x
		cleanNotifications()

###
# Remove notifications that are after the currStream's end
###
cleanNotifications = ->
	for notif, i in currStream.notifications
		removeNotification(i) if notif.x + eventRadius > currStream.end
	return

# Remove a notification by id from the currStream
removeNotification = (notifIdx) ->
	currStream.notifications.splice(notifIdx,1)
	###
		for i of currStream.notifications
			evt = currStream.notifications[i]
			delete currStream.notifications[i]	if util.diff(evt.x, mousePos.x) < 2 * eventRadius
	###
	return

###
# GRAPHICS
###
class Graphics
	constructor: (@ctx) ->
	draw_stream: (stream, isOutput) ->
		op_y = util.operator_y()
		this.draw_arrow stream.start, stream.maxEnd- 10, stream.y
		for i of stream.notifications
			notif = stream.notifications[i]
			switch notif.shape
				when "circle"
					this.fill_circle notif.x, stream.y, notif.color, false
				when "square"
					this.fill_square notif.x, stream.y, notif.color, false
			if isOutput 
				this.draw_dashed_arrow(notif.x, op_y + 2.5 * eventRadius, stream.y - eventRadius)
			else
				this.draw_dashed_arrow(notif.x, stream.y + eventRadius, op_y)
		this.draw_line stream.end, stream.y - eventRadius, stream.end, stream.y + eventRadius, "#000000"
		return

	draw_cursor: (mousePos) ->
		if util.is_on_stream(mousePos)
			isMarked = util.onNotification(mousePos)
			switch currStream.shape
				when "circle"
					this.draw_circle mousePos.x, currStream.y, "red", isMarked?
				when "square"
					this.draw_square mousePos.x, currStream.y, "red", isMarked?

	draw_operator: ->
		y = util.operator_y()
		@ctx.beginPath()
		@ctx.rect 10, y, canvas.width - 20, 2.5 * eventRadius
		@ctx.lineWidth = 3
		@ctx.strokeStyle = "#000000"
		@ctx.stroke()
		return

	###
	# GRAPHICAL PRIMITIVES
	###
	draw_line: (fromx, fromy, tox, toy, color) ->
		@ctx.beginPath()
		@ctx.lineWith = 3
		@ctx.strokeStyle = color
		@ctx.moveTo fromx, fromy
		@ctx.lineTo tox, toy
		@ctx.stroke()
		return

	draw_arrow: (fromx, tox, y) ->
		@ctx.beginPath()
		@ctx.lineWidth = 3
		@ctx.strokeStyle = "#000000"
		@ctx.moveTo fromx, y
		@ctx.lineTo tox - eventRadius, y
		@ctx.moveTo tox - eventRadius, y - 0.5 * eventRadius
		@ctx.lineTo tox, y
		@ctx.lineTo tox - eventRadius, y + 0.5 * eventRadius
		@ctx.closePath()
		@ctx.stroke()
		return

	draw_dashed_arrow: (x, fromy, toy) ->
		@ctx.beginPath()
		@ctx.lineWidth = 3
		@ctx.strokeStyle = "#000000"
		@ctx.setLineDash [
			4
			7
		]
		@ctx.moveTo x, fromy
		@ctx.lineTo x, toy - eventRadius
		@ctx.closePath()
		@ctx.stroke()
		@ctx.beginPath()
		@ctx.setLineDash []
		@ctx.moveTo x - 0.5 * eventRadius, toy - eventRadius
		@ctx.lineTo x, toy
		@ctx.lineTo x + 0.5 * eventRadius, toy - eventRadius
		@ctx.closePath()
		@ctx.stroke()
		return

	draw_circle: (centerx, centery, color, isMarked) ->
		this.circle centerx, centery, color, isMarked, (ctx) ->
			ctx.stroke()
			return

		return

	fill_circle: (centerx, centery, color, isMarked) ->
		this.circle centerx, centery, color, isMarked, (ctx) ->
			ctx.fill()
			return

		return

	circle: (centerx, centery, color, isMarked, drawFunc) ->
		@ctx.beginPath()
		@ctx.arc centerx, centery, eventRadius, 0, 2 * Math.PI, false
		@ctx.fillStyle = color
		drawFunc @ctx
		@ctx.lineWidth = 3
		@ctx.strokeStyle = (if isMarked then "red" else "#000000")
		@ctx.stroke()
		return

	draw_square: (centerx, centery, color, isMarked) ->
		this.square centerx, centery, color, isMarked, false
		return

	fill_square: (centerx, centery, color, isMarked) ->
		this.square centerx, centery, color, isMarked, true
		return

	square: (centerx, centery, color, isMarked, doFill) ->
		@ctx.beginPath()
		@ctx.rect centerx - eventRadius, centery - eventRadius, 2 * eventRadius, 2 * eventRadius
		if doFill
			@ctx.fillStyle = color
			@ctx.fill()
		@ctx.lineWidth = 3
		@ctx.strokeStyle = (if isMarked then "red" else "#000000")
		@ctx.stroke()
		return

###
# UTILITIES
###
util = 
	getCurrentStream: (mousePos) ->
		minDistance = Number.POSITIVE_INFINITY
		selectedStream = currStream
		for i of streams
			stream = streams[i]
			distance = this.diff(stream.y, mousePos.y)
			if distance < minDistance
				minDistance = distance
				selectedStream = stream
		selectedStream

	is_on_stream: (mousePos) ->
		this.diff(mousePos.y, currStream.y) < 2 * eventRadius

	diff: (a, b) ->
		Math.abs a - b

	onNotification: (mousePos) ->
		for i of currStream.notifications
			evt = currStream.notifications[i]
			return i if this.diff(evt.x, mousePos.x) < 2 * eventRadius
		return null
	
	pos:
		x: 0
		y: 0

	getMousePos: ->
		return @pos

	setMousePos: (canvas, evt) ->
		rect = canvas.getBoundingClientRect()
		@pos = if evt?
			x: evt.clientX - rect.left
			y: evt.clientY - rect.top
		else
			x: 0
			y: 0
		return @pos

	set_pointer: (mousePos) ->
		document.body.style.cursor =
			(if this.is_on_stream(mousePos) and this.diff(mousePos.x, currStream.end) < 5	then "ew-resize"
			else "auto")
		return

	operator_y: ->
		y = 0
		for i of streams
			sy = streams[i].y
			y = sy	if sy > y
		y + eventRadius * 3

	output_stream_y: ->
		ypos = 0
		for i of streams
			stream = streams[i]
			ypos = stream.y	if stream.y > ypos
		ypos + eventRadius * 9

	random_color: ->
		letters = "0123456789ABCDEF".split("")
		color = "#"
		i = 0

		while i < 6
			color += letters[Math.round(Math.random() * 15)]
			i++
		color
