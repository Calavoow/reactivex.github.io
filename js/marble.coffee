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
			events: []
			end: 450
		}
		{
			shape: "square"
			y: canvas.height / 8 * 3
			events: []
			end: 470
		}
	]
	currStream = streams[0]
	
	# register event handlers
	canvas.addEventListener "mousemove", ((evt) ->
		mousePos = getMousePos(canvas, evt)
		currStream = getCurrentStream(mousePos)
		render canvas, mousePos
		return
	), false
	canvas.addEventListener "mousedown", ((evt) ->
		mousePos = getMousePos(canvas, evt)
		if diff(mousePos.y, currStream.y) < 2 * eventRadius
			(if isOnEvent(mousePos) then removeEvent(mousePos) else addEvent(mousePos))
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
	
	# bootstrap rendering
	render canvas, getMousePos(canvas, null)
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
		y: output_stream_y()
		events: []
		end: 0

	xs.merge(ys).subscribe ((evt) ->
		
		#console.log("[OK] " + evt + " " + scheduler.now());
		output_stream.events.push evt
		return
	), ((err) ->
	
	#console.log("[ERROR] " + err);
	), ->
		
		#console.log("[DONE] " + scheduler.now());
		output_stream.end = scheduler.now()
		return

	scheduler.start()
	output_stream

stream_to_observable = (stream, scheduler) ->
	onNext = Rx.ReactiveTest.onNext
	onCompleted = Rx.ReactiveTest.onCompleted
	events = []
	i = 0

	while i < stream.events.length
		evt = stream.events[i]
		events.push onNext(evt.x, evt)	if evt? and evt isnt `undefined`
		i++
	events.push onCompleted(stream.end)
	scheduler.createColdObservable events

render = (canvas, mousePos) ->
	ctx = canvas.getContext("2d")
	ctx.clearRect 0, 0, canvas.width, canvas.height
	
	#var message = mousePos.x + ',' + mousePos.y;
	#		ctx.font = '18pt Calibri';
	#		ctx.fillStyle = 'black';
	#		ctx.fillText(message, 10, 25);
	for i of streams
		draw_stream ctx, streams[i], false
	set_pointer mousePos
	draw_cursor ctx, mousePos
	draw_operator ctx, canvas
	draw_stream ctx, create_output_stream(), true
	return

addEvent = (mousePos) ->
	if mousePos.x + eventRadius < currStream.end
		currStream.events.push
			x: mousePos.x
			color: random_color()
			shape: currStream.shape

	return

removeEvent = (mousePos) ->
	for i of currStream.events
		evt = currStream.events[i]
		delete currStream.events[i]	if diff(evt.x, mousePos.x) < 2 * eventRadius
	return
###
# GRAPHICS
###
draw_stream = (ctx, stream, isOutput) ->
	op_y = operator_y()
	draw_arrow ctx, 10, canvas.width - 10, stream.y
	for i of stream.events
		evt = stream.events[i]
		switch evt.shape
			when "circle"
				fill_circle ctx, evt.x, stream.y, evt.color, false
			when "square"
				fill_square ctx, evt.x, stream.y, evt.color, false
		(if isOutput then draw_dashed_arrow(ctx, evt.x, op_y + 2.5 * eventRadius, stream.y - eventRadius) else draw_dashed_arrow(ctx, evt.x, stream.y + eventRadius, op_y))
	draw_line ctx, stream.end, stream.y - eventRadius, stream.end, stream.y + eventRadius, "#000000"
	return

draw_cursor = (ctx, mousePos) ->
	if is_on_stream(mousePos)
		isMarked = isOnEvent(mousePos)
		switch currStream.shape
			when "circle"
				draw_circle ctx, mousePos.x, currStream.y, "red", isMarked
			when "square"
				draw_square ctx, mousePos.x, currStream.y, "red", isMarked

draw_operator = (ctx) ->
	y = operator_y()
	ctx.beginPath()
	ctx.rect 10, y, canvas.width - 20, 2.5 * eventRadius
	ctx.lineWidth = 3
	ctx.strokeStyle = "#000000"
	ctx.stroke()
	return

set_pointer = (mousePos) ->
	document.body.style.cursor = (if is_on_stream(mousePos) and diff(mousePos.x, currStream.end) < 5 then "ew-resize" else "auto")
	return

###
# GRAPHICAL PRIMITIVES
###
draw_line = (ctx, fromx, fromy, tox, toy, color) ->
	ctx.beginPath()
	ctx.lineWith = 3
	ctx.strokeStyle = color
	ctx.moveTo fromx, fromy
	ctx.lineTo tox, toy
	ctx.stroke()
	return

draw_arrow = (ctx, fromx, tox, y) ->
	ctx.beginPath()
	ctx.lineWidth = 3
	ctx.strokeStyle = "#000000"
	ctx.moveTo fromx, y
	ctx.lineTo tox - eventRadius, y
	ctx.moveTo tox - eventRadius, y - 0.5 * eventRadius
	ctx.lineTo tox, y
	ctx.lineTo tox - eventRadius, y + 0.5 * eventRadius
	ctx.closePath()
	ctx.stroke()
	return

draw_dashed_arrow = (ctx, x, fromy, toy) ->
	ctx.beginPath()
	ctx.lineWidth = 3
	ctx.strokeStyle = "#000000"
	ctx.setLineDash [
		4
		7
	]
	ctx.moveTo x, fromy
	ctx.lineTo x, toy - eventRadius
	ctx.closePath()
	ctx.stroke()
	ctx.beginPath()
	ctx.setLineDash []
	ctx.moveTo x - 0.5 * eventRadius, toy - eventRadius
	ctx.lineTo x, toy
	ctx.lineTo x + 0.5 * eventRadius, toy - eventRadius
	ctx.closePath()
	ctx.stroke()
	return

draw_circle = (ctx, centerx, centery, color, isMarked) ->
	circle ctx, centerx, centery, color, isMarked, (ctx) ->
		ctx.stroke()
		return

	return

fill_circle = (ctx, centerx, centery, color, isMarked) ->
	circle ctx, centerx, centery, color, isMarked, (ctx) ->
		ctx.fill()
		return

	return

circle = (ctx, centerx, centery, color, isMarked, drawFunc) ->
	ctx.beginPath()
	ctx.arc centerx, centery, eventRadius, 0, 2 * Math.PI, false
	ctx.fillStyle = color
	drawFunc ctx
	ctx.lineWidth = 3
	ctx.strokeStyle = (if isMarked then "red" else "#000000")
	ctx.stroke()
	return

draw_square = (ctx, centerx, centery, color, isMarked) ->
	square ctx, centerx, centery, color, isMarked, false
	return

fill_square = (ctx, centerx, centery, color, isMarked) ->
	square ctx, centerx, centery, color, isMarked, true
	return

square = (ctx, centerx, centery, color, isMarked, doFill) ->
	ctx.beginPath()
	ctx.rect centerx - eventRadius, centery - eventRadius, 2 * eventRadius, 2 * eventRadius
	if doFill
		ctx.fillStyle = color
		ctx.fill()
	ctx.lineWidth = 3
	ctx.strokeStyle = (if isMarked then "red" else "#000000")
	ctx.stroke()
	return

###
# UTILITIES
###
getCurrentStream = (mousePos) ->
	minDistance = Number.POSITIVE_INFINITY
	selectedStream = currStream
	for i of streams
		stream = streams[i]
		distance = diff(stream.y, mousePos.y)
		if distance < minDistance
			minDistance = distance
			selectedStream = stream
	selectedStream

is_on_stream = (mousePos) ->
	diff(mousePos.y, currStream.y) < 2 * eventRadius

diff = (a, b) ->
	Math.abs a - b

isOnEvent = (mousePos) ->
	for i of currStream.events
		evt = currStream.events[i]
		return true	if diff(evt.x, mousePos.x) < 2 * eventRadius
	false

getMousePos = (canvas, evt) ->
	rect = canvas.getBoundingClientRect()
	if evt?
		x: evt.clientX - rect.left
		y: evt.clientY - rect.top
	else
		x: 0
		y: 0

operator_y = ->
	y = 0
	for i of streams
		sy = streams[i].y
		y = sy	if sy > y
	y + eventRadius * 3

output_stream_y = ->
	ypos = 0
	for i of streams
		stream = streams[i]
		ypos = stream.y	if stream.y > ypos
	ypos + eventRadius * 9

random_color = ->
	letters = "0123456789ABCDEF".split("")
	color = "#"
	i = 0

	while i < 6
		color += letters[Math.round(Math.random() * 15)]
		i++
	color
