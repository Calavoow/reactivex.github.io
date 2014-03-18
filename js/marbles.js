/***************/
/*** GLOBALS ***/
/***************/

var canvas;

var eventRadius = 20;

var streams;

var currStream;

/************/
/*** MAIN ***/
/************/

window.onload = function() {
    // init globals
    canvas = document.getElementById('rxCanvas');

    streams = [
        {
            shape: "circle",
            y: canvas.height / 8,
            events: [],
            end: 450
        },
        {
            shape: "square",
            y: canvas.height / 8 * 3,
            events: [],
            end: 470
        }
    ];

    currStream = streams[0];

    // register event handlers
    canvas.addEventListener('mousemove', function(evt) {
        var mousePos = getMousePos(canvas, evt); 
        currStream = getCurrentStream(mousePos);
        render (canvas, mousePos);
    }, false);

    canvas.addEventListener('mousedown', function(evt) {
        var mousePos = getMousePos(canvas, evt); 
        if (diff(mousePos.y, currStream.y) < 2*eventRadius) {
            isOnEvent(mousePos) ? removeEvent(mousePos) 
                                : addEvent(mousePos); 
            render (canvas, mousePos);
        }
    }, false);

    canvas.addEventListener ("mouseout", function(evt) { 
        var mousePos = { x:-1337, y:-1337 };
        render (canvas, mousePos);
    }, false);

    // bootstrap rendering
    render(canvas, getMousePos(canvas, null));
}

/*************/
/*** LOGIC ***/
/*************/

create_output_stream = function() {
    var scheduler = new Rx.TestScheduler();

    var xs = stream_to_observable(streams[0], scheduler);
    var ys = stream_to_observable(streams[1], scheduler);
            
    var output_stream = {
        shape: "unknown",
        y: output_stream_y(),
        events: [],
        end: 0
    };

    xs.merge(ys).subscribe(
        function(evt) {
            //console.log("[OK] " + evt + " " + scheduler.now());
            output_stream.events.push(evt);
        },
        function(err) {
            //console.log("[ERROR] " + err);
        },
        function() {
            //console.log("[DONE] " + scheduler.now());
            output_stream.end = scheduler.now();
        }
    );

    scheduler.start();

    return output_stream;
}
        
stream_to_observable = function(stream, scheduler) {
    var onNext = Rx.ReactiveTest.onNext,
        onCompleted = Rx.ReactiveTest.onCompleted;

    var events = [];
    for (var i = 0; i < stream.events.length; i++) {
        var evt = stream.events[i];
        if (evt != null && evt != undefined) {
            events.push(onNext(evt.x, evt));
        }
    }
    events.push(onCompleted(stream.end));
    
    return scheduler.createColdObservable(events);
}

render = function (canvas, mousePos) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /*var message = mousePos.x + ',' + mousePos.y;
    ctx.font = '18pt Calibri';
    ctx.fillStyle = 'black';
    ctx.fillText(message, 10, 25);*/

    for (var i in streams) {
        draw_stream(ctx, streams[i], false);
    }

    set_pointer(mousePos);

    draw_cursor(ctx, mousePos);

    draw_operator(ctx, canvas);

    draw_stream(ctx, create_output_stream(), true);
}

addEvent = function (mousePos) {
    if (mousePos.x + eventRadius < currStream.end ) {
        currStream.events.push({ x: mousePos.x
                               , color: random_color()
                               , shape: currStream.shape });
    }
}
    
removeEvent = function (mousePos) {
    for (var i in currStream.events) {
        var evt = currStream.events[i];
        if (diff(evt.x, mousePos.x) < 2*eventRadius) {
            delete currStream.events[i];
        }
    }
}

/****************/
/*** GRAPHICS ***/
/****************/

draw_stream = function (ctx, stream, isOutput) {
    var op_y = operator_y();
    draw_arrow (ctx, 10, canvas.width - 10, stream.y);
    for (var i in stream.events) {
        var evt = stream.events[i];
        switch (evt.shape) {
            case "circle":
                fill_circle (ctx, evt.x, stream.y, evt.color, false);
                break;
            case "square":
                fill_square (ctx, evt.x, stream.y, evt.color, false);
                break;
        }
        isOutput ? draw_dashed_arrow(ctx, evt.x, op_y + 2.5*eventRadius, stream.y - eventRadius)
                    : draw_dashed_arrow(ctx, evt.x, stream.y + eventRadius, op_y);
    }
    draw_line(ctx, stream.end, stream.y - eventRadius, stream.end, stream.y + eventRadius, '#000000');
}

draw_cursor = function(ctx, mousePos) {
    if (is_on_stream(mousePos)) {
        var isMarked = isOnEvent(mousePos);
        switch (currStream.shape) {
            case "circle":
                draw_circle (ctx, mousePos.x, currStream.y, 'red', isMarked);
                break;
            case "square":
                draw_square (ctx, mousePos.x, currStream.y, 'red', isMarked);
                break;
        }
    }
}

draw_operator = function(ctx) {
    var y = operator_y();
    ctx.beginPath();
    ctx.rect(10, y, canvas.width-20, 2.5*eventRadius);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
}

set_pointer = function (mousePos) {
    document.body.style.cursor = is_on_stream(mousePos) && diff(mousePos.x, currStream.end) < 5
                               ? "ew-resize" : "auto";
}

/****************************/
/*** GRAPHICAL PRIMITIVES ***/
/****************************/

draw_line = function (ctx, fromx, fromy, tox, toy, color) {
    ctx.beginPath();
    ctx.lineWith = 3;
    ctx.strokeStyle = color;
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
}

draw_arrow = function (ctx, fromx, tox, y) {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.moveTo(fromx, y);
    ctx.lineTo(tox-eventRadius, y);
    ctx.moveTo(tox-eventRadius, y - 0.5*eventRadius);
    ctx.lineTo(tox            , y);
    ctx.lineTo(tox-eventRadius, y + 0.5*eventRadius);
    ctx.closePath();
    ctx.stroke();
}

draw_dashed_arrow = function (ctx, x, fromy, toy) {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.setLineDash([4, 7]);
    ctx.moveTo(x, fromy);
    ctx.lineTo(x, toy-eventRadius);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(x - 0.5*eventRadius, toy-eventRadius);
    ctx.lineTo(x                  , toy);
    ctx.lineTo(x + 0.5*eventRadius, toy-eventRadius);
    ctx.closePath();
    ctx.stroke();
} 

draw_circle = function (ctx, centerx, centery, color, isMarked) {
    circle (ctx, centerx, centery, color, isMarked, function(ctx) { 
        ctx.stroke(); 
    });
}

fill_circle = function (ctx, centerx, centery, color, isMarked) {
    circle (ctx, centerx, centery, color, isMarked, function(ctx) { 
        ctx.fill(); 
    });
}

circle = function (ctx, centerx, centery, color, isMarked, drawFunc) {
    ctx.beginPath();
    ctx.arc(centerx, centery, eventRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    drawFunc(ctx);
    ctx.lineWidth = 3;
    ctx.strokeStyle = isMarked ? 'red' : '#000000';
    ctx.stroke();
}
    
draw_square = function (ctx, centerx, centery, color, isMarked) {
    square (ctx, centerx, centery, color, isMarked, false);
}

fill_square = function (ctx, centerx, centery, color, isMarked) {
    square (ctx, centerx, centery, color, isMarked, true);
}

square = function (ctx, centerx, centery, color, isMarked, doFill) {
    ctx.beginPath();
    ctx.rect(centerx-eventRadius, centery-eventRadius, 2*eventRadius, 2*eventRadius);
    if (doFill) {
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = isMarked ? 'red' : '#000000';
    ctx.stroke();
}

/*****************/
/*** UTILITIES ***/
/*****************/

getCurrentStream = function (mousePos) {
    var minDistance = Number.POSITIVE_INFINITY;
    var selectedStream = currStream;
    for (var i in streams) {
        var stream = streams[i];
        var distance = diff(stream.y, mousePos.y);
        if (distance < minDistance) {
            minDistance = distance;
            selectedStream = stream;
        }
    }
    return selectedStream;
}

is_on_stream = function (mousePos) {
    return diff(mousePos.y, currStream.y) < 2*eventRadius;
}

diff = function (a, b) {
   return Math.abs(a - b); 
}

isOnEvent = function (mousePos) {
    for (var i in currStream.events) {
        var evt = currStream.events[i];
        if (diff(evt.x, mousePos.x) < 2*eventRadius) {
            return true;
        }
    }
    return false;
}

getMousePos = function (canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return evt != null ? { x: evt.clientX - rect.left,
                           y: evt.clientY - rect.top } 
                       : { x: 0, y: 0};
}

operator_y = function() {
    var y = 0;
    for (var i in streams) {
        var sy = streams[i].y;
        if (sy > y) {
            y = sy;
        }
    }
    return y + eventRadius * 3;
}
        
output_stream_y = function() {
    var ypos = 0;
    for (var i in streams) {
        var stream = streams[i];
        if (stream.y > ypos) {
            ypos = stream.y;
        }
    }
    return ypos + eventRadius * 9;
}


random_color = function() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

