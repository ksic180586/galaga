// ============================================================
// powerup.js — Collectible drops with visual + effect logic
// ============================================================

const PU = {
  RAPID:   { id:'rapid',   icon:'⚡', name:'Rapid Fire',   color:'#ffff00', dur:10, rarity:'rare' },
  TRIPLE:  { id:'triple',  icon:'💎', name:'Triple Shot',  color:'#00ffff', dur:12, rarity:'rare' },
  SPREAD:  { id:'spread',  icon:'🌀', name:'Spread Shot',  color:'#ff88ff', dur:8,  rarity:'epic' },
  SHIELD:  { id:'shield',  icon:'🛡', name:'Shield',       color:'#4488ff', dur:15, rarity:'common' },
  BOMB:    { id:'bomb',    icon:'⭐', name:'Star Bomb',     color:'#ffd700', dur:0,  rarity:'epic' },
  LASER:   { id:'laser',   icon:'🔴', name:'Laser Beam',   color:'#ff4400', dur:6,  rarity:'epic' },
  GHOST:   { id:'ghost',   icon:'🌙', name:'Ghost Mode',   color:'#aaaaff', dur:5,  rarity:'legend' },
  DRONE:   { id:'drone',   icon:'💠', name:'Drone',        color:'#00ffaa', dur:20, rarity:'rare' },
  FLAME:   { id:'flame',   icon:'🔥', name:'Flame Trail',  color:'#ff6600', dur:10, rarity:'rare' },
  XPBOOST: { id:'xpboost',icon:'💛', name:'XP Boost',     color:'#ffdd00', dur:30, rarity:'common' },
};

const PU_LIST = Object.values(PU);
const PU_WEIGHTS = { common:50, rare:30, epic:15, legend:5 };

function randomPUType() {
  const pool = [];
  PU_LIST.forEach(p => {
    const w = PU_WEIGHTS[p.rarity] || 10;
    for (let i = 0; i < w; i++) pool.push(p);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Collectible power-up entity ─────────────────────────── //
class PowerUp {
  constructor(x, y, type) {
    this.x    = x;
    this.y    = y;
    this.type = type || randomPUType();
    this.vy   = 1.8;
    this.dead = false;
    this.age  = 0;
    this.r    = 18;
    this.magnetR = 120;
  }

  update(dt, player) {
    this.age += dt;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < this.magnetR) {
      this.x += dx * 0.1;
      this.y += dy * 0.1;
    } else {
      this.y += this.vy;
    }
    if (this.y > 750) this.dead = true;
  }

  draw(ctx) {
    const bob  = Math.sin(this.age * 4) * 4;
    const x    = this.x;
    const y    = this.y + bob;
    const glow = 0.7 + 0.3 * Math.sin(this.age * 6);

    ctx.save();
    ctx.shadowColor = this.type.color;
    ctx.shadowBlur  = 18 * glow;

    // Ring
    ctx.strokeStyle = this.type.color;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.stroke();

    // Fill
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = this.type.color;
    ctx.fill();

    // Icon
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.font        = '18px serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.icon, x, y);
    ctx.restore();
  }

  get bounds() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  hitsPlayer(px, py, pr = 20) { return Math.hypot(px - this.x, py - this.y) < this.r + pr; }
}

// ─── Active power-up tracker ──────────────────────────────── //
class ActivePU {
  constructor(type) {
    this.type = type;
    this.remaining = type.dur;
    this.max       = type.dur;
  }
  update(dt) { this.remaining -= dt; return this.remaining > 0; }
  get progress() { return Math.max(0, this.remaining / this.max); }
}
