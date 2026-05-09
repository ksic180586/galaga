// ============================================================
// enemy.js — Enemy types, formation, dive AI, boss
// ============================================================

// ─── Base Enemy ─────────────────────────────────────────── //
class Enemy {
  constructor(x, y, cfg = {}) {
    this.x = x; this.y = y;
    this.homeX = x; this.homeY = y;
    this.w    = cfg.w    ?? 36;  this.h = cfg.h ?? 36;
    this.hp   = cfg.hp   ?? 10;  this.maxHp = this.hp;
    this.score    = cfg.score    ?? 10;
    this.xpReward = cfg.xpReward ?? 5;
    this.color    = cfg.color    ?? '#ff3860';
    this.accent   = cfg.accent   ?? '#ff8800';
    this.canShoot = cfg.canShoot ?? false;
    this.shootCD  = cfg.shootCD  ?? 3;
    this.dropChance = cfg.dropChance ?? 0.08;
    this.diveSpeed  = cfg.diveSpeed  ?? 4;
    this.state  = 'forming'; // forming | idle | diving | returning
    this.path   = [];  this.pathIdx = 0;
    this.dead   = false;
    this.age    = 0;   this.wing = 0;
    this.flash  = 0;
    this._shootT = Math.random() * 3;
  }

  hit(dmg) {
    this.hp   -= dmg;
    this.flash = 0.15;
    if (this.hp <= 0) { this.dead = true; return true; }
    return false;
  }

  update(dt) {
    this.age += dt; this.wing += dt * 8;
    if (this.flash > 0) this.flash -= dt;
    switch (this.state) {
      case 'forming':   this._form(dt);    break;
      case 'idle':      this._idle(dt);    break;
      case 'diving':    this._dive(dt);    break;
      case 'returning': this._return(dt);  break;
    }
  }

  _form(dt) {
    const dx = this.homeX - this.x, dy = this.homeY - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < 4) { this.x = this.homeX; this.y = this.homeY; this.state = 'idle'; }
    else        { this.x += (dx/d)*5; this.y += (dy/d)*5; }
  }

  _idle(dt) {
    if (!this.canShoot) return;
    this._shootT -= dt;
  }

  dive(path) { this.path = path; this.pathIdx = 0; this.state = 'diving'; }

  _dive(dt) {
    if (this.pathIdx >= this.path.length) { this.state = 'returning'; return; }
    const t  = this.path[this.pathIdx];
    const dx = t.x - this.x, dy = t.y - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < 6) { this.pathIdx++; }
    else        { this.x += (dx/d)*this.diveSpeed; this.y += (dy/d)*this.diveSpeed; }
    if (this.canShoot) { this._shootT -= dt; }
  }

  _return(dt) {
    const dx = this.homeX - this.x, dy = this.homeY - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < 4) { this.x = this.homeX; this.y = this.homeY; this.state = 'idle'; }
    else        { this.x += (dx/d)*4; this.y += (dy/d)*4; }
  }

  shouldShoot() {
    if (!this.canShoot || this._shootT > 0) return false;
    this._shootT = this.shootCD + Math.random() * 2;
    return true;
  }

  draw(ctx) {
    ctx.save();
    if (this.flash > 0) { ctx.filter = 'brightness(4)'; }
    this._drawSprite(ctx);
    ctx.filter = 'none';
    // HP bar (only if damaged)
    if (this.hp < this.maxHp) {
      const bx = this.x - this.w/2, by = this.y - this.h/2 - 9;
      ctx.fillStyle = '#222'; ctx.fillRect(bx, by, this.w, 5);
      ctx.fillStyle = '#00ff88'; ctx.fillRect(bx, by, this.w*(this.hp/this.maxHp), 5);
    }
    ctx.restore();
  }

  _drawSprite(ctx) {
    const x = this.x, y = this.y, s = this.w * 0.5;
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fill();
  }

  get bounds() { return { x:this.x-this.w/2, y:this.y-this.h/2, w:this.w, h:this.h }; }
}

// ─── Basic Enemy (insect) ────────────────────────────────── //
class BasicEnemy extends Enemy {
  constructor(x, y, wn) {
    super(x, y, { hp:8+wn*2, score:10+wn*2, xpReward:4+wn,
      color:'#ff3860', accent:'#ff8800', diveSpeed:4+wn*0.2, dropChance:0.08 });
  }
  _drawSprite(ctx) {
    const x=this.x, y=this.y, s=this.w*0.5, wf=Math.sin(this.wing)*2.5;
    ctx.shadowColor=this.color; ctx.shadowBlur=12;
    // body
    ctx.fillStyle=this.color;
    ctx.beginPath(); ctx.moveTo(x,y-s); ctx.lineTo(x+s*.6,y+s*.5); ctx.lineTo(x,y+s*.2); ctx.lineTo(x-s*.6,y+s*.5); ctx.closePath(); ctx.fill();
    // wings
    ctx.fillStyle=this.accent;
    ctx.beginPath(); ctx.moveTo(x-s*.3,y+wf); ctx.lineTo(x-s*1.1,y+wf+s*.3); ctx.lineTo(x-s*.6,y+s*.5+wf); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+s*.3,y+wf); ctx.lineTo(x+s*1.1,y+wf+s*.3); ctx.lineTo(x+s*.6,y+s*.5+wf); ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(x, y-.05*s, 3, 0, Math.PI*2); ctx.fill();
  }
}

// ─── Shooter Enemy (hexagon) ─────────────────────────────── //
class ShooterEnemy extends Enemy {
  constructor(x, y, wn) {
    super(x, y, { hp:20+wn*3, score:25, xpReward:12,
      color:'#8800ff', accent:'#cc44ff', canShoot:true, shootCD:2.5, diveSpeed:3, dropChance:0.12 });
  }
  _drawSprite(ctx) {
    const x=this.x, y=this.y, s=this.w*.5;
    ctx.shadowColor=this.color; ctx.shadowBlur=16;
    ctx.fillStyle=this.color;
    ctx.beginPath();
    for (let i=0;i<6;i++) { const a=i*Math.PI/3-Math.PI/2; ctx.lineTo(x+Math.cos(a)*s, y+Math.sin(a)*s); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle=this.accent; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(x,y,s*.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ccc'; ctx.fillRect(x-2, y+s*.5, 4, 8);
  }
}

// ─── Fast Enemy (arrowhead) ──────────────────────────────── //
class FastEnemy extends Enemy {
  constructor(x, y, wn) {
    super(x, y, { hp:6+wn, score:20, xpReward:10,
      color:'#00ffaa', accent:'#88ffdd', diveSpeed:7+wn*0.3, dropChance:0.1 });
    this.zigT = 0;
  }
  _dive(dt) { this.zigT+=dt*7; this.x+=Math.sin(this.zigT)*2.5; super._dive(dt); }
  _drawSprite(ctx) {
    const x=this.x, y=this.y, s=this.w*.5;
    ctx.shadowColor=this.color; ctx.shadowBlur=12;
    ctx.fillStyle=this.color;
    ctx.beginPath(); ctx.moveTo(x,y-s); ctx.lineTo(x+s*.8,y+s); ctx.lineTo(x,y+s*.3); ctx.lineTo(x-s*.8,y+s); ctx.closePath(); ctx.fill();
  }
}

// ─── Tank Enemy (armored) ────────────────────────────────── //
class TankEnemy extends Enemy {
  constructor(x, y, wn) {
    super(x, y, { hp:60+wn*12, score:50, xpReward:25,
      color:'#ff8800', accent:'#ffcc44', w:48, h:48,
      canShoot:true, shootCD:1.8, diveSpeed:2, dropChance:0.28 });
  }
  _drawSprite(ctx) {
    const x=this.x, y=this.y, s=this.w*.5;
    ctx.shadowColor=this.color; ctx.shadowBlur=20;
    ctx.fillStyle=this.color; ctx.fillRect(x-s*.7, y-s*.7, s*1.4, s*1.4);
    ctx.fillStyle=this.accent;
    ctx.fillRect(x-s, y-s*.3, s*.3, s*.6);
    ctx.fillRect(x+s*.7, y-s*.3, s*.3, s*.6);
    ctx.strokeStyle='#ffffff33'; ctx.lineWidth=2;
    ctx.strokeRect(x-s*.5, y-s*.5, s, s);
    ctx.fillStyle='#999'; ctx.fillRect(x-3, y+s*.7, 6, 10);
  }
}

// ─── Boss Enemy ───────────────────────────────────────────── //
class BossEnemy extends Enemy {
  static NAMES = ['THE DEVOURER','VOID TYRANT','STAR CRUSHER','OMEGA PRIME','DARK HERALD'];

  constructor(x, y, bossNum) {
    const lvl = Math.min(bossNum, 5);
    super(x, y, {
      hp: 150 + lvl * 250,
      score: 500 * lvl,
      xpReward: 80 * lvl,
      color: '#cc0044',
      accent: '#ff4488',
      w: 90, h: 90,
      canShoot: true,
      shootCD: 0.9,
      diveSpeed: 2,
      dropChance: 1
    });
    this.bossNum   = bossNum;
    this.phase     = 1;
    this.phases    = lvl < 2 ? 2 : 3;
    this.name      = BossEnemy.NAMES[(bossNum - 1) % BossEnemy.NAMES.length];
    this.dir       = 1;
    this.entering  = true;
    this.entryY    = y;
    this.y         = -100;
    this.patrolSpd = 1.2 + lvl * 0.3;
    this.dropBombs = false;
    this.bombT     = 0;
  }

  update(dt) {
    this.age += dt; this.wing += dt*4;
    if (this.flash > 0) this.flash -= dt;
    // Advance phases
    const ratio = this.hp / this.maxHp;
    if (this.phases >= 2 && ratio < 0.5  && this.phase === 1) { this.phase = 2; this.shootCD = 0.55; }
    if (this.phases >= 3 && ratio < 0.25 && this.phase === 2) { this.phase = 3; this.shootCD = 0.3; this.dropBombs = true; }
    // Entry
    if (this.entering) {
      this.y += 2.5;
      if (this.y >= this.entryY) { this.y = this.entryY; this.entering = false; }
      return;
    }
    // Patrol
    this.x += this.dir * this.patrolSpd;
    if (this.x > 550 || this.x < 110) this.dir *= -1;
    this.y = this.entryY + Math.sin(this.age * 1.4) * 22;
    this._shootT -= dt;
    this.bombT   -= dt;
  }

  getShootAngles(playerX, playerY) {
    const base = Utils.angleTo(this.x, this.y, playerX, playerY);
    if (this.phase === 1) return [base - 0.2, base, base + 0.2];
    if (this.phase === 2) return [base - 0.45, base - 0.2, base, base + 0.2, base + 0.45];
    return [-0.6,-0.35,-0.15,0,0.15,0.35,0.6].map(o => base + o);
  }

  shouldDropBomb() {
    if (!this.dropBombs || this.bombT > 0) return false;
    this.bombT = 5 - this.phase * 0.8;
    return true;
  }

  _drawSprite(ctx) {
    const x=this.x, y=this.y, s=this.w*.5;
    const bodyC = this.phase===3 ? '#ff0033' : this.phase===2 ? '#dd0055' : this.color;
    const wf = Math.sin(this.wing) * 5;

    ctx.shadowColor = bodyC; ctx.shadowBlur = 30;
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : bodyC;

    // Central body
    ctx.beginPath();
    ctx.moveTo(x, y-s*1.15);
    ctx.lineTo(x+s*.8, y-s*.3);
    ctx.lineTo(x+s*1.1, y+s*.3);
    ctx.lineTo(x+s*.5,  y+s);
    ctx.lineTo(x,       y+s*.6);
    ctx.lineTo(x-s*.5,  y+s);
    ctx.lineTo(x-s*1.1, y+s*.3);
    ctx.lineTo(x-s*.8,  y-s*.3);
    ctx.closePath(); ctx.fill();

    // Wings
    const wc = this.phase>=2 ? '#ff6600' : '#ff4488';
    ctx.fillStyle = wc; ctx.shadowColor = wc; ctx.shadowBlur = 15;
    // Left wing
    ctx.beginPath(); ctx.moveTo(x-s*.8,y-s*.2); ctx.lineTo(x-s*2.1,y+wf); ctx.lineTo(x-s*1.5,y+s); ctx.lineTo(x-s*.8,y+s*.4); ctx.closePath(); ctx.fill();
    // Right wing
    ctx.beginPath(); ctx.moveTo(x+s*.8,y-s*.2); ctx.lineTo(x+s*2.1,y+wf); ctx.lineTo(x+s*1.5,y+s); ctx.lineTo(x+s*.8,y+s*.4); ctx.closePath(); ctx.fill();

    // Phase 3 horns
    if (this.phase >= 3) {
      ctx.fillStyle='#ff0000'; ctx.shadowColor='#ff0000';
      ctx.beginPath(); ctx.moveTo(x-s*.3,y-s); ctx.lineTo(x-s*.7,y-s*1.9); ctx.lineTo(x,y-s*1.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+s*.3,y-s); ctx.lineTo(x+s*.7,y-s*1.9); ctx.lineTo(x,y-s*1.1); ctx.closePath(); ctx.fill();
    }

    // Eye
    const pulse = 0.88 + Math.sin(this.age*5)*.12;
    const eyeC  = this.phase>=2 ? '#ff8800' : '#ffff00';
    ctx.fillStyle=eyeC; ctx.shadowColor=eyeC; ctx.shadowBlur=22;
    ctx.beginPath(); ctx.arc(x,y-s*.05,s*.3*pulse,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff0000'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(x,y-s*.05,s*.12*pulse,0,Math.PI*2); ctx.fill();
  }
}

// ─── Formation Manager ────────────────────────────────────── //
class Formation {
  constructor(canvas, waveNum) {
    this.cw       = canvas.width;
    this.ch       = canvas.height;
    this.waveNum  = waveNum;
    this.enemies  = [];
    this.offX     = 0;
    this.dir      = 1;
    this.speed    = 0.4 + waveNum * 0.06;
    this.diveCD   = Math.max(1.8, 5 - waveNum * 0.3);
    this.diveT    = 2;
    this._build();
  }

  _build() {
    const wn   = this.waveNum;
    const cols = Math.min(10, 5 + Math.floor(wn * 0.6));
    const rows = Math.min(5,  2 + Math.floor(wn * 0.35));
    const sx   = (this.cw - (cols-1)*52) / 2;
    const sy   = 75;

    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        const hx = sx + c*52, hy = sy + r*46;
        const ix = Math.random() > 0.5 ? -60 : this.cw+60;
        let e;
        if (wn >= 8 && r===0 && Math.random()<0.35)      e = new TankEnemy(ix, -60, wn);
        else if (wn >= 4 && r<=1 && Math.random()<0.3)   e = new ShooterEnemy(ix, -60, wn);
        else if (wn >= 6 && r>=2 && Math.random()<0.28)  e = new FastEnemy(ix, -60, wn);
        else                                               e = new BasicEnemy(ix, -60, wn);
        e.homeX = hx; e.homeY = hy;
        this.enemies.push(e);
      }
    }
  }

  update(dt, playerX, playerY) {
    // Remove dead
    this.enemies = this.enemies.filter(e => !e.dead);

    // Drift
    const idle = this.enemies.filter(e => e.state==='idle');
    if (idle.length === this.enemies.length && this.enemies.length > 0) {
      this.offX += this.dir * this.speed;
      const lx = Math.min(...idle.map(e=>e.homeX)) + this.offX;
      const rx = Math.max(...idle.map(e=>e.homeX)) + this.offX;
      if (rx > this.cw-35 || lx < 35) this.dir *= -1;
      idle.forEach(e => { e.x = e.homeX + this.offX; });
    }

    // Dive trigger
    this.diveT -= dt;
    if (this.diveT <= 0 && idle.length > 0) {
      this.diveT = this.diveCD;
      this._triggerDive(idle, playerX, playerY);
    }

    this.enemies.forEach(e => e.update(dt));
  }

  _triggerDive(candidates, px, py) {
    const n      = Math.min(candidates.length, Utils.randInt(1, Math.min(3, Math.ceil(this.waveNum/2))));
    const divers = candidates.sort(()=>Math.random()-0.5).slice(0,n);
    divers.forEach(e => {
      const path = this._makePath(e.x, e.y, px, py);
      e.dive(path);
    });
  }

  _makePath(sx, sy, px, py) {
    const path = [];
    // Curve via control points
    for (let i=1; i<=8; i++) {
      const t  = i/8;
      const cx = Utils.lerp(sx, px, t) + Math.sin(t*Math.PI)*Utils.rand(-120,120);
      const cy = Utils.lerp(sy, py + 100, t);
      path.push({ x:cx, y:cy });
    }
    // Exit off bottom
    path.push({ x: px + Utils.rand(-80,80), y: this.ch + 80 });
    return path;
  }

  get alive() { return this.enemies.length > 0; }

  draw(ctx) { this.enemies.forEach(e => e.draw(ctx)); }

  getShooters() {
    return this.enemies.filter(e => e.shouldShoot() && (e.state==='diving' || e.state==='idle'));
  }
}
