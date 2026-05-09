// ============================================================
// player.js — Player ship: movement, shooting, power-ups, draw
// ============================================================

class Drone {
  constructor(player, side) {
    this.player = player;
    this.side   = side; // -1 left, +1 right
    this.x      = player.x + side * 40;
    this.y      = player.y;
    this.shootT = 0;
    this.angle  = 0;
  }

  update(dt) {
    this.angle += dt * 3;
    const tx = this.player.x + this.side * 45 + Math.sin(this.angle) * 8;
    const ty = this.player.y + Math.cos(this.angle * 0.7) * 10;
    this.x = Utils.lerp(this.x, tx, 0.15);
    this.y = Utils.lerp(this.y, ty, 0.15);
    this.shootT -= dt;
  }

  shouldShoot() {
    if (this.shootT <= 0) { this.shootT = 0.35; return true; }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 12;
    ctx.fillStyle   = '#00ffaa';
    const s = 10;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - s);
    ctx.lineTo(this.x + s*.7, this.y + s);
    ctx.lineTo(this.x - s*.7, this.y + s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#003322'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = canvas.width  / 2;
    this.y = canvas.height - 70;
    this.w = 38; this.h = 42;

    // ── Base stats (modified by RPG)
    this.maxHp      = 100;
    this.hp         = 100;
    this.speed      = 5;
    this.damage     = 10;
    this.fireRate   = 0.25;   // seconds between shots
    this.maxShield  = 0;
    this.shield     = 0;
    this.shieldRegen = 0;

    // ── State
    this._fireT     = 0;
    this.invTime    = 0;      // invincibility timer
    this.dead       = false;
    this.age        = 0;

    // ── Controls
    this.keys   = {};
    this.mouseX = this.x;   // start at center, updated by window mousemove
    this.firing = false;

    // ── Active power-ups map
    this.activePU = {};       // id -> ActivePU

    // ── Drones
    this.drones = [];

    // ── Tween for hit flash
    this.flashT = 0;
  }

  // ────────────────────────────────────── Power-up API ──── //
  hasPU(id) { return !!this.activePU[id] && this.activePU[id].remaining > 0; }

  applyPU(puType, audio) {
    if (puType.dur === 0) return; // instant (handled by game.js)
    this.activePU[puType.id] = new ActivePU(puType);
    // Side effects
    if (puType.id === 'shield') {
      this.maxShield = Math.max(this.maxShield, 60 + this.maxHp * 0.3);
      this.shield    = this.maxShield;
    }
    if (puType.id === 'drone') {
      this.drones = [new Drone(this, -1), new Drone(this, 1)];
    }
  }

  updatePU(dt) {
    for (const id in this.activePU) {
      const alive = this.activePU[id].update(dt);
      if (!alive) {
        delete this.activePU[id];
        if (id === 'drone') this.drones = [];
        if (id === 'shield') { this.shield = 0; this.maxShield = 0; }
      }
    }
  }

  // ──────────────────────────────────────── Damage ──────── //
  takeDamage(dmg, particles) {
    if (this.invTime > 0) return false;
    if (this.hasPU('ghost'))   return false;

    if (this.shield > 0) {
      this.shield -= dmg;
      if (this.shield < 0) { this.hp += this.shield; this.shield = 0; }
    } else {
      this.hp -= dmg;
    }

    this.flashT  = 0.3;
    this.invTime = 1.0;

    if (particles) particles.playerDamage(this.x, this.y);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return true;
  }

  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

  // ──────────────────────────────────────── Update ──────── //
  update(dt) {
    this.age    += dt;
    this.flashT -= dt;
    this.invTime = Math.max(0, this.invTime - dt);
    this._fireT  = Math.max(0, this._fireT  - dt);

    // Shield regen
    if (this.shieldRegen > 0 && this.maxShield > 0) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dt);
    }

    this._move(dt);
    this.updatePU(dt);
    this.drones.forEach(d => d.update(dt));
  }

  _move(dt) {
    // Ship follows mouse X smoothly
    const tx = Utils.lerp(this.x, this.mouseX, 0.14);
    this.x = Utils.clamp(tx, this.w/2, this.canvas.width - this.w/2);
  }

  // Returns array of new Projectile objects to spawn
  tryShoot(particles, audio) {
    if (!this.firing) return [];  // left click only
    const rate = this.hasPU('rapid') ? this.fireRate * 0.28 : this.fireRate;
    if (this._fireT > 0) return [];
    this._fireT = rate;

    const shots = [];
    const dmg   = this.damage * (this.hasPU('rapid') ? 0.8 : 1);
    const spd   = -14;

    if (this.hasPU('laser')) return []; // laser handled separately

    if (this.hasPU('spread')) {
      const angles = [-0.55, -0.28, -Math.PI/2, -Math.PI/2+0.28, -Math.PI/2+0.55];
      angles.forEach(a => shots.push(new SpreadBullet(this.x, this.y - this.h/2, a, 14, dmg * 0.7)));
    } else if (this.hasPU('triple')) {
      shots.push(new Projectile(this.x,      this.y-this.h/2,  0, spd, dmg, true, {color:'#00f5ff'}));
      shots.push(new Projectile(this.x-18,   this.y-this.h/2,  0, spd, dmg*.8, true, {color:'#7b2fbe'}));
      shots.push(new Projectile(this.x+18,   this.y-this.h/2,  0, spd, dmg*.8, true, {color:'#7b2fbe'}));
    } else if (this.hasPU('flame')) {
      shots.push(new FlameBullet(this.x, this.y-this.h/2, spd));
    } else {
      shots.push(new Projectile(this.x, this.y-this.h/2, 0, spd, dmg, true, {color:'#00f5ff'}));
    }

    if (particles) particles.playerShot(this.x, this.y - this.h/2);
    if (audio)     audio.shoot();
    return shots;
  }

  getDroneShots(audio) {
    const shots = [];
    this.drones.forEach(d => {
      if (d.shouldShoot()) {
        shots.push(new Projectile(d.x, d.y - 14, 0, -12, this.damage * 0.5, true, { w:3, h:10, color:'#00ffaa' }));
        if (audio) audio.shoot();
      }
    });
    return shots;
  }

  // ──────────────────────────────────────── Draw ────────── //
  draw(ctx) {
    // Blink when invincible
    if (this.invTime > 0 && Math.floor(this.age * 20) % 2 === 0) return;

    ctx.save();

    // Flash on hit
    if (this.flashT > 0) ctx.filter = 'brightness(3)';

    const x = this.x, y = this.y, s = 20;

    // Engine glow
    const pulse = 0.85 + 0.15 * Math.sin(this.age * 16);
    ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 25 * pulse;

    // Ghost tint
    if (this.hasPU('ghost')) { ctx.globalAlpha = 0.5; ctx.shadowColor = '#aaaaff'; }

    // Ship body (cyan)
    ctx.fillStyle = '#00c8d4';
    ctx.beginPath();
    ctx.moveTo(x,       y - s*1.2);
    ctx.lineTo(x+s*.65, y + s*.6);
    ctx.lineTo(x,       y + s*.1);
    ctx.lineTo(x-s*.65, y + s*.6);
    ctx.closePath(); ctx.fill();

    // Accent stripe
    ctx.fillStyle = '#7b2fbe';
    ctx.beginPath();
    ctx.moveTo(x-s*.2, y - s*.3);
    ctx.lineTo(x+s*.2, y - s*.3);
    ctx.lineTo(x+s*.1, y + s*.2);
    ctx.lineTo(x-s*.1, y + s*.2);
    ctx.closePath(); ctx.fill();

    // Wings
    ctx.fillStyle = '#0099aa';
    ctx.beginPath();
    ctx.moveTo(x-s*.65, y+s*.6);
    ctx.lineTo(x-s*1.35, y+s*.35);
    ctx.lineTo(x-s*.85,  y+s*.7);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x+s*.65, y+s*.6);
    ctx.lineTo(x+s*1.35, y+s*.35);
    ctx.lineTo(x+s*.85,  y+s*.7);
    ctx.closePath(); ctx.fill();

    // Cockpit
    ctx.fillStyle = '#aaffff';
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(x, y-s*.4, s*.2, s*.35, 0, 0, Math.PI*2); ctx.fill();

    // Engine exhaust
    const thrust = 0.8 + 0.2 * Math.sin(this.age * 20);
    ctx.fillStyle = `rgba(100,180,255,${thrust * 0.8})`;
    ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.ellipse(x, y+s*.6, s*.2, s*.4*thrust, 0, 0, Math.PI*2); ctx.fill();

    ctx.restore();

    // Drones
    this.drones.forEach(d => d.draw(ctx));

    // Shield bubble
    if (this.shield > 0 && this.maxShield > 0) {
      const alpha = 0.25 + 0.15 * Math.sin(this.age * 8);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  }

  get bounds() { return { x:this.x-this.w/2, y:this.y-this.h/2, w:this.w, h:this.h }; }
}
