// ============================================================
// particles.js — Particle system for explosions & FX
// ============================================================

class Particle {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.vx = opts.vx !== undefined ? opts.vx : (Math.random() - 0.5) * (opts.speed || 4) * 2;
    this.vy = opts.vy !== undefined ? opts.vy : (Math.random() - 0.5) * (opts.speed || 4) * 2;
    this.life    = opts.life    ?? (Math.random() * 0.5 + 0.3);
    this.maxLife = this.life;
    this.size    = opts.size    ?? (Math.random() * 4 + 1);
    this.color   = opts.color   ?? '#ffffff';
    this.gravity = opts.gravity ?? 40;
    this.drag    = opts.drag    ?? 0.95;
  }

  update(dt) {
    this.vy  += this.gravity * dt;
    this.vx  *= this.drag;
    this.vy  *= this.drag;
    this.x   += this.vx;
    this.y   += this.vy;
    this.life -= dt;
  }

  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    const s = this.size * a;
    if (s < 0.1) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle   = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

class ParticleSystem {
  constructor() { this.pool = []; }

  emit(x, y, count, opts = {}) {
    const colors = opts.colors || [opts.color || '#ffffff'];
    for (let i = 0; i < count; i++) {
      this.pool.push(new Particle(x, y, {
        ...opts,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: undefined, vy: undefined          // let constructor randomize
      }));
    }
  }

  burst(x, y, { colors, count = 20, speed = 200, size = 4, life = 0.7, gravity = 120 } = {}) {
    const c = colors || ['#ff6b35', '#ffd700', '#ff3860', '#ffffff'];
    // Radial burst
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const spd   = speed * (0.5 + Math.random() * 0.5);
      this.pool.push(new Particle(x, y, {
        vx: Math.cos(angle) * spd * 0.016,
        vy: Math.sin(angle) * spd * 0.016,
        color: c[Math.floor(Math.random() * c.length)],
        size: size * (0.5 + Math.random()),
        life: life * (0.7 + Math.random() * 0.6),
        gravity, drag: 0.93
      }));
    }
    // Flash center
    for (let i = 0; i < 5; i++) {
      this.pool.push(new Particle(x, y, {
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: '#ffffff',
        size: size * 2,
        life: 0.15,
        gravity: 0, drag: 1
      }));
    }
  }

  explodeEnemy(x, y, color = '#ff3860') {
    this.burst(x, y, { colors: [color, '#ff8800', '#ffd700', '#fff'], count: 22, speed: 180, size: 4, life: 0.8 });
  }

  explodeBoss(x, y) {
    this.burst(x, y, { colors: ['#ff3860', '#ff8c00', '#ffd700', '#fff', '#ff00ff'], count: 60, speed: 300, size: 7, life: 1.2, gravity: 60 });
    // Extra rings
    for (let r = 0; r < 3; r++) {
      setTimeout(() => {
        const ox = x + Utils.rand(-40, 40);
        const oy = y + Utils.rand(-40, 40);
        this.burst(ox, oy, { colors: ['#ff4400', '#ffaa00'], count: 15, speed: 150, size: 3, life: 0.5 });
      }, r * 150);
    }
  }

  playerShot(x, y) {
    this.emit(x, y, 3, {
      colors: ['#00f5ff', '#7b2fbe', '#ffffff'],
      speed: 1.5, size: 2, life: 0.2, gravity: 0, drag: 0.9
    });
  }

  collectPowerup(x, y) {
    this.burst(x, y, { colors: ['#ffd700', '#ffaa00', '#ffffff', '#00ffaa'], count: 25, speed: 160, size: 5, life: 0.9, gravity: 60 });
  }

  playerDamage(x, y) {
    this.burst(x, y, { colors: ['#ff3860', '#ff8888', '#ffffff'], count: 12, speed: 120, size: 3, life: 0.5 });
  }

  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      this.pool[i].update(dt);
      if (this.pool[i].dead) this.pool.splice(i, 1);
    }
  }

  draw(ctx) {
    this.pool.forEach(p => p.draw(ctx));
  }
}
