// ============================================================
// projectile.js — Player/Enemy projectiles, laser, bomb
// ============================================================

class Projectile {
  constructor(x, y, vx, vy, dmg, isPlayer, { w = 5, h = 14, color, piercing = false } = {}) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.damage   = dmg;
    this.isPlayer = isPlayer;
    this.w = w; this.h = h;
    this.color    = color || (isPlayer ? '#00f5ff' : '#ff3860');
    this.piercing = piercing;
    this.dead     = false;
    this.age      = 0;
  }

  update(dt, cw, ch) {
    this.x   += this.vx;
    this.y   += this.vy;
    this.age += dt;
    if (this.y < -30 || this.y > ch + 30 || this.x < -30 || this.x > cw + 30) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 12;
    // Outer glow
    ctx.fillStyle = this.color + '88';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.w * 0.9, this.h * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.w * 0.35, this.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get bounds() { return { x: this.x - this.w, y: this.y - this.h, w: this.w * 2, h: this.h * 2 }; }
}

// Angled spread projectile
class SpreadBullet extends Projectile {
  constructor(x, y, angle, speed, dmg) {
    super(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, dmg, true,
      { w: 4, h: 11, color: '#ff88ff' });
  }
}

// Flame (DoT) projectile
class FlameBullet extends Projectile {
  constructor(x, y, vy) {
    super(x, y, (Math.random() - 0.5) * 1.5, vy, 8, true,
      { w: 5, h: 10, color: '#ff6600' });
    this.dot     = 3; // damage per second
    this.dotTime = 1.5;
  }
}

// ─── Laser Beam (continuous weapon) ────────────────────────//
class LaserBeam {
  constructor(playerX, ch) {
    this.x       = playerX;
    this.ch      = ch;
    this.w       = 7;
    this.damage  = 3;          // per frame
    this.life    = 6;
    this.maxLife = 6;
    this.active  = true;
    this.t       = 0;
    this.isPlayer = true;
  }

  update(dt) {
    this.life -= dt;
    this.t    += dt;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx, px) {
    this.x = px;
    const alpha = (this.life / this.maxLife) * (0.75 + Math.sin(this.t * 28) * 0.25);
    ctx.save();
    ctx.globalAlpha = alpha;
    // Wide outer glow
    const grad = ctx.createLinearGradient(0, 0, 0, this.ch);
    grad.addColorStop(0,   'rgba(255,80,0,0)');
    grad.addColorStop(0.3, 'rgba(255,160,0,0.8)');
    grad.addColorStop(0.7, 'rgba(255,80,0,0.8)');
    grad.addColorStop(1,   'rgba(255,80,0,0)');
    ctx.shadowColor = '#ff6400';
    ctx.shadowBlur  = 25;
    ctx.fillStyle   = grad;
    ctx.fillRect(this.x - this.w * 2.5, 0, this.w * 5, this.ch);
    // White core
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#ffffffcc';
    ctx.fillRect(this.x - 1.5, 0, 3, this.ch);
    ctx.restore();
  }

  get bounds() { return { x: this.x - this.w, y: 0, w: this.w * 2, h: this.ch }; }
}

// ─── Star Bomb (AoE instant explosion) ─────────────────────//
class Bomb {
  constructor(x, y) {
    this.x       = x;
    this.y       = y;
    this.radius  = 15;
    this.maxR    = 180;
    this.life    = 0.6;
    this.maxLife = 0.6;
    this.damage  = 90;
    this.active  = true;
    this.isPlayer = true;
    this.hit     = new Set();
  }

  update(dt) {
    this.life   -= dt;
    this.radius  = this.maxR * (1 - this.life / this.maxLife);
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    const a = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    g.addColorStop(0,   'rgba(255,255,150,0.9)');
    g.addColorStop(0.4, 'rgba(255,140,0,0.6)');
    g.addColorStop(1,   'rgba(255,50,0,0)');
    ctx.fillStyle = g;
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur  = 30;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  hitsEnemy(ex, ey) { return Math.hypot(ex - this.x, ey - this.y) < this.radius; }
}
