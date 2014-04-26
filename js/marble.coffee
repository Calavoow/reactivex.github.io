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

	# read json file
	
	streamJson = util.getJson("merge.json")
	streams = streamJson["streams"].map(Stream.fromJson, Stream)
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
			currStream.addEvent(mousePos)
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
			switch evt.which
				when 101
					# E pressed
					currStream.setError(mousePos)
				when 99 
					# C pressed
					currStream.setComplete(mousePos)
		render canvas, mousePos
		return
	), false
		
	
	# bootstrap rendering
	render canvas, util.getMousePos()
	return

class Stream
	# The @shape argument is for output streams.
	constructor: (@y, @start, @maxEnd, @isOutput, @shape) ->
		# If the stream is an input, it needs to have a shape.
		if not @isOuput
			throw Error("Expected shape") if not @shape?

		@notifications = []
		this
	
	addEvent: (mousePos) ->
		if this.removeNotif(mousePos)
		else if this.validNotification(mousePos)
			@notifications.push
				x: mousePos.x
				color: util.random_color()
				shape: @shape
				type: "Event"
		return

	setError: (mousePos) ->
		this.setUnique(mousePos,
			x: mousePos.x
			color: util.random_color()
			type: "Error"
		)

	setComplete: (mousePos) ->
		this.setUnique(mousePos,
			x: mousePos.x
			type: "Complete"
		)
	
	removeNotif: (mousePos) ->
		notifIdx= this.onNotification(mousePos)
		if notifIdx?
			currStream.notifications.splice(notifIdx,1)
			return true
		else
			return false

	setUnique: (mousePos, uniqueNotif) ->
		if this.removeNotif(mousePos)
		else if mousePos.x - eventRadius > @start and mousePos.x + eventRadius < @maxEnd
			@notifications.push uniqueNotif

		# Make sure there is only one unique notification in the stream.
		@notifications = @notifications.filter(this.validNotification, this)
		return this

	###
	# Invariant property of Notifications
	#
	# Requires a .x property on given events and errors.
	###
	validNotification: (notif) ->
		# The notifications that may only occur once on a stream.
		uniqueNotifs = currStream.notifications.filter((curNotif) ->
			curNotif.type is "Error" or curNotif.type is "Complete"
		)
		# Filter out any older completion notifications from the stream.
		if notif.type is "Error" or notif.type is "Complete"
			# Only the last completion is valid.
			notif.x is uniqueNotifs[uniqueNotifs.length-1].x 
		else
			# It should NOT be the case that the event happens after any uniqueNotif.
			notifBeforeEnd = not uniqueNotifs.some((uniqueNotif) -> notif.x + eventRadius >= uniqueNotif.x)
			notifBeforeEnd and notif.x - eventRadius > currStream.start

	###
	# Find if the mouse is on a notification in this stream.
	###
	onNotification: (mousePos) ->
		for notif, i in @notifications
			if util.diff(notif.x, mousePos.x) < 2 * eventRadius
				return i
		return null
	
	@fromJson: (json) ->
		stream = new Stream(
			util.next_available_y(),
			json.start,
			json.maxEnd,
			false,
			json.shape
		)
		
		# Set a color for notifications missing an explicit one.
		json.notifications.forEach( (notif) ->
			if not notif["color"]?
				notif.color = util.random_color()
		)
		stream.notifications = json.notifications
		return stream

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
		isOutput: true

	xs.merge(ys).subscribe ((evt) ->
		output_stream.notifications.push evt
		return
	), ((err) ->
		output_stream.notifications.push err
		output_stream.maxEnd = err.x + 3*eventRadius
		return
	), ->
		output_stream.notifications.push
			x: scheduler.now()
			type: "Complete"
		output_stream.maxEnd = output_stream.end + 2*eventRadius
		return

	scheduler.start()
	output_stream

stream_to_observable = (stream, scheduler) ->
	notifications = stream.notifications.map((notif) ->
		notifType = switch notif.type
			when "Event"
				Rx.ReactiveTest.onNext
			when "Error"
				Rx.ReactiveTest.onError
			when "Complete"
				Rx.ReactiveTest.onCompleted
			else throw "Something wrong with notification type"
		notifType(notif.x, notif)
	)

	scheduler.createColdObservable notifications

render = (canvas, mousePos) ->
	ctx = canvas.getContext("2d")
	ctx.clearRect 0, 0, canvas.width, canvas.height
	gfx = new Graphics(ctx)
	
	#var message = mousePos.x + ',' + mousePos.y;
	#		ctx.font = '18pt Calibri';
	#		ctx.fillStyle = 'black';
	#		ctx.fillText(message, 10, 25);
	###
	for i of streams
		gfx.draw_stream streams[i]
	###
	streams.concat(create_output_stream()).forEach(gfx.draw_stream, gfx)
	util.set_pointer mousePos
	gfx.draw_cursor mousePos
	gfx.draw_operator canvas
	# gfx.draw_stream create_output_stream() 
	return


###
# GRAPHICS
###
class Graphics
	constructor: (@ctx) ->
	draw_stream: (stream) ->
		op_y = util.operator_y()
		maxEnd = canvas.width - 10
		for notif in stream.notifications
			switch notif.type
				when "Event" then this.draw_event stream, notif
				when "Error" then this.draw_error stream, notif
				when "Complete" 
					this.draw_complete stream, notif
					maxEnd = notif.x + 2*eventRadius
		# If there is an end to the stream
		this.draw_arrow stream.start, maxEnd, stream.y

		return

	draw_event: (stream, event, isOutput) ->
		switch event.shape
			when "circle"
				this.fill_circle event.x, stream.y, event.color, false
			when "square"
				this.fill_square event.x, stream.y, event.color, false
		this.draw_arrow_to_op(stream, event)
	
	draw_error: (stream, error, isOutput) ->
		this.draw_cross error.x, stream.y, error.color
		this.draw_arrow_to_op(stream, error)

	draw_complete: (stream, complete) ->
		this.draw_line complete.x, stream.y - eventRadius, complete.x, stream.y + eventRadius, "#000000"

	draw_arrow_to_op: (stream, notif) ->
		if stream.isOutput
			this.draw_dashed_arrow(notif.x,
				util.operator_y() + 2.5 * eventRadius, stream.y - eventRadius)
		else
			this.draw_dashed_arrow(notif.x,
				stream.y + eventRadius, util.operator_y())
		return


	draw_cursor: (mousePos) ->
		if util.is_on_stream(mousePos)
			isMarked = currStream.onNotification(mousePos)
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

	draw_cross: (centerx, centery, color) ->
		# Topleft to bottomright
		this.draw_line(centerx - eventRadius,
			centery + eventRadius,
			centerx + eventRadius,
			centery - eventRadius,
			color)

		# Bottomright to topleft 
		this.draw_line(centerx - eventRadius,
			centery - eventRadius,
			centerx + eventRadius,
			centery + eventRadius,
			color)
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
		# Find maximum value of y
		streams.reduce((accum, stream) ->
			if stream.y > accum then stream.y else accum
		, 0) + eventRadius * 3 # And add 3 * eventRadius spacing

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
	
	_y_counter: 0
	next_available_y: ->
		20 + eventRadius + util._y_counter++ * (2 * eventRadius + 20)

	httpGet: (theUrl) ->
    	xmlHttp = null

    	xmlHttp = new XMLHttpRequest()
    	xmlHttp.open( "GET", theUrl, false )
    	xmlHttp.send( null )
    	return xmlHttp.responseText

    getJson: (url) ->
    	JSON.parse(util.httpGet(url))
