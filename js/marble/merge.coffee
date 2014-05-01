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
