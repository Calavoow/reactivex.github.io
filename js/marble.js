// Generated by CoffeeScript 1.7.1

/*
 * GLOBALS
 */

(function() {
  var Graphics, addError, addEvent, canvas, create_output_stream, currStream, eventRadius, removeNotification, render, setComplete, stream_to_observable, streams, util, validNotification;

  canvas = void 0;

  streams = void 0;

  currStream = void 0;

  eventRadius = 20;


  /*
   * MAIN
   */

  window.onload = function() {
    canvas = document.getElementById("rxCanvas");
    streams = [
      {
        shape: "circle",
        y: canvas.height / 8,
        notifications: [],
        start: 10,
        maxEnd: canvas.width - 10,
        isOutput: false
      }, {
        shape: "square",
        y: canvas.height / 8 * 3,
        notifications: [],
        start: 10,
        maxEnd: canvas.width - 10,
        isOutput: false
      }
    ];
    currStream = streams[0];
    canvas.addEventListener("mousemove", (function(evt) {
      var mousePos;
      mousePos = util.setMousePos(canvas, evt);
      currStream = util.getCurrentStream(mousePos);
      render(canvas, mousePos);
    }), false);
    canvas.addEventListener("mousedown", (function(evt) {
      var mousePos, notifIdx;
      mousePos = util.setMousePos(canvas, evt);
      if (util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
        notifIdx = util.onNotification(mousePos);
        if (notifIdx != null) {
          removeNotification(notifIdx);
        } else {
          addEvent(mousePos);
        }
        render(canvas, mousePos);
      }
    }), false);
    canvas.addEventListener("mouseout", (function(evt) {
      var mousePos;
      mousePos = {
        x: -1337,
        y: -1337
      };
      render(canvas, mousePos);
    }), false);
    canvas.addEventListener("keypress", (function(evt) {
      var mousePos, notifIdx;
      mousePos = util.getMousePos();
      if (util.diff(mousePos.y, currStream.y) < 2 * eventRadius) {
        notifIdx = util.onNotification(mousePos);
        if (notifIdx != null) {
          removeNotification(notifIdx);
        } else {
          switch (evt.which) {
            case 101:
              addError(mousePos);
              break;
            case 99:
              setComplete(mousePos);
          }
        }
      }
      render(canvas, mousePos);
    }), false);
    render(canvas, util.getMousePos());
  };


  /*
   * LOGIC
   */

  create_output_stream = function() {
    var output_stream, scheduler, xs, ys;
    scheduler = new Rx.TestScheduler();
    xs = stream_to_observable(streams[0], scheduler);
    ys = stream_to_observable(streams[1], scheduler);
    output_stream = {
      shape: "unknown",
      y: util.output_stream_y(),
      notifications: [],
      start: 10,
      end: 0,
      isOutput: true
    };
    xs.merge(ys).subscribe((function(evt) {
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

  stream_to_observable = function(stream, scheduler) {
    var notifications;
    notifications = stream.notifications.map(function(notif) {
      var notifType;
      notifType = (function() {
        switch (notif.type) {
          case "Event":
            return Rx.ReactiveTest.onNext;
          case "Error":
            return Rx.ReactiveTest.onError;
          case "Complete":
            return Rx.ReactiveTest.onCompleted;
          default:
            throw "Something wrong with notification type";
        }
      })();
      return notifType(notif.x, notif);
    });
    return scheduler.createColdObservable(notifications);
  };

  render = function(canvas, mousePos) {
    var ctx, gfx;
    ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gfx = new Graphics(ctx);

    /*
    	for i of streams
    		gfx.draw_stream streams[i]
     */
    streams.concat(create_output_stream()).forEach(gfx.draw_stream, gfx);
    util.set_pointer(mousePos);
    gfx.draw_cursor(mousePos);
    gfx.draw_operator(canvas);
  };

  addEvent = function(mousePos) {
    if (validNotification(mousePos)) {
      currStream.notifications.push({
        x: mousePos.x,
        color: util.random_color(),
        shape: currStream.shape,
        type: "Event"
      });
    }
  };

  addError = function(mousePos) {
    if (validNotification(mousePos)) {
      currStream.notifications.push({
        x: mousePos.x,
        color: util.random_color(),
        type: "Error"
      });
    }
  };


  /*
   * Invariant property of Notifications
   *
   * Requires a .x property on given events and errors.
   */

  validNotification = function(notif) {
    var completionNotifs, notifBeforeEnd;
    completionNotifs = currStream.notifications.filter(function(curNotif) {
      return curNotif.type === "Complete";
    });
    if (notif.type === "Complete") {
      return notif.x === completionNotifs[completionNotifs.length - 1].x;
    } else {
      notifBeforeEnd = !completionNotifs.some(function(completionNotif) {
        return notif.x + eventRadius >= completionNotif.x;
      });
      return notifBeforeEnd && notif.x - eventRadius > currStream.start;
    }
  };

  setComplete = function(mousePos) {
    if (mousePos.x - eventRadius > currStream.start && mousePos.x + eventRadius < currStream.maxEnd) {
      currStream.notifications.push({
        x: mousePos.x,
        type: "Complete"
      });
      return currStream.notifications = currStream.notifications.filter(function(notif) {
        return validNotification(notif);
      });
    }
  };


  /*
   * Remove notifications that are after the currStream's end
  cleanNotifications = ->
  	 * Do not perform in place modifications while looping
  	currStream.notifications = currStream.notifications.filter( (notif) ->
  		val = validNotification(notif)
  		console.log(val)
  		return val
  	)
  	return
   */

  removeNotification = function(notifIdx) {
    console.log("Removing notification" + notifIdx);
    currStream.notifications.splice(notifIdx, 1);
  };


  /*
   * GRAPHICS
   */

  Graphics = (function() {
    function Graphics(ctx) {
      this.ctx = ctx;
    }

    Graphics.prototype.draw_stream = function(stream) {
      var maxEnd, notif, op_y, _i, _len, _ref;
      console.log(stream);
      op_y = util.operator_y();
      maxEnd = canvas.width - 10;
      _ref = stream.notifications;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        notif = _ref[_i];
        switch (notif.type) {
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
      }
      this.draw_arrow(stream.start, maxEnd, stream.y);
    };

    Graphics.prototype.draw_event = function(stream, event, isOutput) {
      switch (event.shape) {
        case "circle":
          this.fill_circle(event.x, stream.y, event.color, false);
          break;
        case "square":
          this.fill_square(event.x, stream.y, event.color, false);
      }
      return this.draw_arrow_to_op(stream, event);
    };

    Graphics.prototype.draw_error = function(stream, error, isOutput) {
      this.draw_cross(error.x, stream.y, error.color);
      return this.draw_arrow_to_op(stream, error);
    };

    Graphics.prototype.draw_complete = function(stream, complete) {
      return this.draw_line(complete.x, stream.y - eventRadius, complete.x, stream.y + eventRadius, "#000000");
    };

    Graphics.prototype.draw_arrow_to_op = function(stream, notif) {
      if (stream.isOutput) {
        this.draw_dashed_arrow(notif.x, util.operator_y() + 2.5 * eventRadius, stream.y - eventRadius);
      } else {
        this.draw_dashed_arrow(notif.x, stream.y + eventRadius, util.operator_y());
      }
    };

    Graphics.prototype.draw_cursor = function(mousePos) {
      var isMarked;
      if (util.is_on_stream(mousePos)) {
        isMarked = util.onNotification(mousePos);
        switch (currStream.shape) {
          case "circle":
            return this.draw_circle(mousePos.x, currStream.y, "red", isMarked != null);
          case "square":
            return this.draw_square(mousePos.x, currStream.y, "red", isMarked != null);
        }
      }
    };

    Graphics.prototype.draw_operator = function() {
      var y;
      y = util.operator_y();
      this.ctx.beginPath();
      this.ctx.rect(10, y, canvas.width - 20, 2.5 * eventRadius);
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = "#000000";
      this.ctx.stroke();
    };


    /*
    	 * GRAPHICAL PRIMITIVES
     */

    Graphics.prototype.draw_line = function(fromx, fromy, tox, toy, color) {
      this.ctx.beginPath();
      this.ctx.lineWith = 3;
      this.ctx.strokeStyle = color;
      this.ctx.moveTo(fromx, fromy);
      this.ctx.lineTo(tox, toy);
      this.ctx.stroke();
    };

    Graphics.prototype.draw_cross = function(centerx, centery, color) {
      this.draw_line(centerx - eventRadius, centery + eventRadius, centerx + eventRadius, centery - eventRadius, color);
      this.draw_line(centerx - eventRadius, centery - eventRadius, centerx + eventRadius, centery + eventRadius, color);
    };

    Graphics.prototype.draw_arrow = function(fromx, tox, y) {
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
    };

    Graphics.prototype.draw_dashed_arrow = function(x, fromy, toy) {
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
    };

    Graphics.prototype.draw_circle = function(centerx, centery, color, isMarked) {
      this.circle(centerx, centery, color, isMarked, function(ctx) {
        ctx.stroke();
      });
    };

    Graphics.prototype.fill_circle = function(centerx, centery, color, isMarked) {
      this.circle(centerx, centery, color, isMarked, function(ctx) {
        ctx.fill();
      });
    };

    Graphics.prototype.circle = function(centerx, centery, color, isMarked, drawFunc) {
      this.ctx.beginPath();
      this.ctx.arc(centerx, centery, eventRadius, 0, 2 * Math.PI, false);
      this.ctx.fillStyle = color;
      drawFunc(this.ctx);
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
      this.ctx.stroke();
    };

    Graphics.prototype.draw_square = function(centerx, centery, color, isMarked) {
      this.square(centerx, centery, color, isMarked, false);
    };

    Graphics.prototype.fill_square = function(centerx, centery, color, isMarked) {
      this.square(centerx, centery, color, isMarked, true);
    };

    Graphics.prototype.square = function(centerx, centery, color, isMarked, doFill) {
      this.ctx.beginPath();
      this.ctx.rect(centerx - eventRadius, centery - eventRadius, 2 * eventRadius, 2 * eventRadius);
      if (doFill) {
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = (isMarked ? "red" : "#000000");
      this.ctx.stroke();
    };

    return Graphics;

  })();


  /*
   * UTILITIES
   */

  util = {
    getCurrentStream: function(mousePos) {
      var distance, i, minDistance, selectedStream, stream;
      minDistance = Number.POSITIVE_INFINITY;
      selectedStream = currStream;
      for (i in streams) {
        stream = streams[i];
        distance = this.diff(stream.y, mousePos.y);
        if (distance < minDistance) {
          minDistance = distance;
          selectedStream = stream;
        }
      }
      return selectedStream;
    },
    is_on_stream: function(mousePos) {
      return this.diff(mousePos.y, currStream.y) < 2 * eventRadius;
    },
    diff: function(a, b) {
      return Math.abs(a - b);
    },
    onNotification: function(mousePos) {
      var evt, i;
      for (i in currStream.notifications) {
        evt = currStream.notifications[i];
        if (this.diff(evt.x, mousePos.x) < 2 * eventRadius) {
          return i;
        }
      }
      return null;
    },
    pos: {
      x: 0,
      y: 0
    },
    getMousePos: function() {
      return this.pos;
    },
    setMousePos: function(canvas, evt) {
      var rect;
      rect = canvas.getBoundingClientRect();
      this.pos = evt != null ? {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      } : {
        x: 0,
        y: 0
      };
      return this.pos;
    },
    set_pointer: function(mousePos) {
      document.body.style.cursor = (this.is_on_stream(mousePos) && this.diff(mousePos.x, currStream.end) < 5 ? "ew-resize" : "auto");
    },
    operator_y: function() {
      return streams.reduce(function(accum, stream) {
        if (stream.y > accum) {
          return stream.y;
        } else {
          return accum;
        }
      }, 0) + eventRadius * 3;
    },
    output_stream_y: function() {
      var i, stream, ypos;
      ypos = 0;
      for (i in streams) {
        stream = streams[i];
        if (stream.y > ypos) {
          ypos = stream.y;
        }
      }
      return ypos + eventRadius * 9;
    },
    random_color: function() {
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
  };

}).call(this);
