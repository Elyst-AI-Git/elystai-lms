// @ts-nocheck
function n(e) {
  // @ts-ignore
  this.init(e || {});
}
n.prototype = {
  // @ts-ignore
  init: function (e) {
    // @ts-ignore
    this.phase = e.phase || 0;
    // @ts-ignore
    this.offset = e.offset || 0;
    // @ts-ignore
    this.frequency = e.frequency || 0.001;
    // @ts-ignore
    this.amplitude = e.amplitude || 1;
  },
  update: function () {
    return (
      // @ts-ignore
      (this.phase += this.frequency),
      // @ts-ignore
      (e = this.offset + Math.sin(this.phase) * this.amplitude)
    );
  },
  value: function () {
    return e;
  },
};

// @ts-ignore
function Line(e) {
  // @ts-ignore
  this.init(e || {});
}

Line.prototype = {
  // @ts-ignore
  init: function (e) {
    // @ts-ignore
    this.spring = e.spring + 0.1 * Math.random() - 0.05;
    // @ts-ignore
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    // @ts-ignore
    this.nodes = [];
    for (var t, n = 0; n < E.size; n++) {
      t = new Node();
      // @ts-ignore
      t.x = pos.x;
      // @ts-ignore
      t.y = pos.y;
      // @ts-ignore
      this.nodes.push(t);
    }
  },
  update: function () {
    // @ts-ignore
    let e = this.spring,
      // @ts-ignore
      t = this.nodes[0];
    // @ts-ignore
    t.vx += (pos.x - t.x) * e;
    // @ts-ignore
    t.vy += (pos.y - t.y) * e;
    // @ts-ignore
    for (var n, i = 0, a = this.nodes.length; i < a; i++)
      // @ts-ignore
      (t = this.nodes[i]),
        0 < i &&
          // @ts-ignore
          ((n = this.nodes[i - 1]),
          (t.vx += (n.x - t.x) * e),
          (t.vy += (n.y - t.y) * e),
          (t.vx += n.vx * E.dampening),
          (t.vy += n.vy * E.dampening)),
        // @ts-ignore
        (t.vx *= this.friction),
        // @ts-ignore
        (t.vy *= this.friction),
        (t.x += t.vx),
        (t.y += t.vy),
        (e *= E.tension);
  },
  draw: function () {
    let e,
      t,
      // @ts-ignore
      n = this.nodes[0].x,
      // @ts-ignore
      i = this.nodes[0].y;
    // @ts-ignore
    ctx.beginPath();
    // @ts-ignore
    ctx.moveTo(n, i);
    // @ts-ignore
    for (var a = 1, o = this.nodes.length - 2; a < o; a++) {
      // @ts-ignore
      e = this.nodes[a];
      // @ts-ignore
      t = this.nodes[a + 1];
      n = 0.5 * (e.x + t.x);
      i = 0.5 * (e.y + t.y);
      // @ts-ignore
      ctx.quadraticCurveTo(e.x, e.y, n, i);
    }
    // @ts-ignore
    e = this.nodes[a];
    // @ts-ignore
    t = this.nodes[a + 1];
    // @ts-ignore
    ctx.quadraticCurveTo(e.x, e.y, t.x, t.y);
    // @ts-ignore
    ctx.stroke();
    // @ts-ignore
    ctx.closePath();
  },
};

// Hoisted to module scope (these were nested inside onMousemove) so the
// cleanup returned by renderCanvas can detach them on unmount.
// @ts-ignore
function setPos(e) {
  e.touches
    ? // @ts-ignore
      ((pos.x = e.touches[0].pageX), (pos.y = e.touches[0].pageY))
    : // @ts-ignore
      ((pos.x = e.clientX), (pos.y = e.clientY)),
    e.preventDefault();
}
// @ts-ignore
function setPosTouch(e) {
  // @ts-ignore
  1 == e.touches.length &&
    ((pos.x = e.touches[0].pageX), (pos.y = e.touches[0].pageY));
}
// @ts-ignore
function resetLines() {
  lines = [];
  for (let e = 0; e < E.trails; e++)
    lines.push(new Line({ spring: 0.45 + (e / E.trails) * 0.025 }));
}
// @ts-ignore
function onMousemove(e) {
  document.removeEventListener("mousemove", onMousemove),
    document.removeEventListener("touchstart", onMousemove),
    document.addEventListener("mousemove", setPos),
    document.addEventListener("touchmove", setPos),
    document.addEventListener("touchstart", setPosTouch),
    setPos(e),
    resetLines(),
    render();
}

function render() {
  // @ts-ignore
  if (ctx.running) {
    // @ts-ignore
    ctx.globalCompositeOperation = "source-over";
    // @ts-ignore
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // @ts-ignore
    // source-over (not "lighter") so the trail is visible against a WHITE
    // background — "lighter" would blow out to invisible on white.
    ctx.globalCompositeOperation = "source-over";
    // @ts-ignore
    // Brand-locked dark-emerald trail (#03624C family): hue in the green band,
    // low lightness so it reads as deep green on the white hero.
    ctx.strokeStyle = "hsla(" + Math.round(f.update()) + ",92%,21%,0.06)";
    // @ts-ignore
    ctx.lineWidth = 10;
    for (var e, t = 0; t < E.trails; t++) {
      // @ts-ignore
      (e = lines[t]).update();
      e.draw();
    }
    // @ts-ignore
    ctx.frame++;
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas() {
  // @ts-ignore
  ctx.canvas.width = window.innerWidth - 20;
  // @ts-ignore
  ctx.canvas.height = window.innerHeight;
}

// @ts-ignore
var ctx,
  // @ts-ignore
  f,
  e = 0,
  pos = {},
  // @ts-ignore
  lines = [],
  E = {
    debug: true,
    friction: 0.5,
    trails: 80,
    size: 50,
    dampening: 0.025,
    tension: 0.99,
  };
function Node() {
  this.x = 0;
  this.y = 0;
  this.vy = 0;
  this.vx = 0;
}

// @ts-ignore
function onFocus() {
  // @ts-ignore
  if (!ctx.running) {
    // @ts-ignore
    ctx.running = true;
    // Guard against resuming before the first pointer event has seeded
    // `lines` — render() indexes into it unconditionally.
    if (!lines.length) resetLines();
    render();
  }
}
function onBlur() {
  // Pause the loop when the window loses focus. The original set this to
  // `true`, so it never actually paused — a needless CPU drain whenever the
  // tab/window was in the background.
  // @ts-ignore
  ctx.running = false;
}

export const renderCanvas = function () {
  // @ts-ignore
  ctx = document.getElementById("canvas").getContext("2d");
  ctx.running = true;
  ctx.frame = 1;
  f = new n({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 6,
    frequency: 0.0015,
    offset: 165,
  });
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("touchstart", onMousemove);
  document.body.addEventListener("orientationchange", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);
  resizeCanvas();

  // Return a teardown so the caller can stop the loop and detach every global
  // listener on unmount — otherwise the RAF keeps painting a now-detached
  // canvas and the document-level pointer listeners leak across navigations.
  return function cleanup() {
    // @ts-ignore
    ctx.running = false;
    document.removeEventListener("mousemove", onMousemove);
    document.removeEventListener("touchstart", onMousemove);
    document.removeEventListener("mousemove", setPos);
    document.removeEventListener("touchmove", setPos);
    document.removeEventListener("touchstart", setPosTouch);
    document.body.removeEventListener("orientationchange", resizeCanvas);
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onBlur);
  };
};
