// ============================================================
// utils.js — Math helpers, collision, stars background
// ============================================================

const Utils = {
  lerp: (a, b, t) => a + (b - a) * t,
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  rand: (min, max) => Math.random() * (max - min) + min,
  randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  randFrom: arr => arr[Math.floor(Math.random() * arr.length)],
  angleTo: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),

  rectHit(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  },

  circleHit(ax, ay, ar, bx, by, br) {
    return Math.hypot(bx - ax, by - ay) < ar + br;
  },

  // Draw a glowing rounded rect
  glowRect(ctx, x, y, w, h, color, blur = 12) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
};

// ─── Starfield ────────────────────────────────────────────── //
class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.layers = [
      this.genLayer(80,  0.3, 1.2, 0.2),
      this.genLayer(50,  0.6, 2.0, 0.5),
      this.genLayer(25,  1.0, 3.0, 1.0),
    ];
  }

  genLayer(count, speed, maxSize, opacity) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * 700,
        y: Math.random() * 700,
        r: Math.random() * maxSize + 0.5,
        speed,
        opacity,
        twinkle: Math.random() * Math.PI * 2
      });
    }
    return stars;
  }

  update(dt) {
    this.layers.forEach(layer => {
      layer.forEach(s => {
        s.y += s.speed * 60 * dt;
        s.twinkle += dt * 2;
        if (s.y > this.canvas.height + 5) {
          s.y = -5;
          s.x = Math.random() * this.canvas.width;
        }
      });
    });
  }

  draw(ctx) {
    this.layers.forEach(layer => {
      layer.forEach(s => {
        const alpha = s.opacity * (0.7 + 0.3 * Math.sin(s.twinkle));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = s.r > 1.5 ? 4 : 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
  }
}
