// ============================================================
// game.js — Main game loop, state machine, collision, waves
// ============================================================

const STATE = { MENU:'menu', PLAYING:'playing', LEVELUP:'levelup', PAUSE:'pause', GAMEOVER:'gameover', BOSSINTRO:'bossintro' };

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.audio  = new AudioManager();
    this.ui     = new UIManager();
    this.psys   = new ParticleSystem();
    this.stars  = new Starfield(this.canvas);

    this.state  = STATE.MENU;

    this._bindMenuButtons();
    this._loop      = this._loop.bind(this);
    this.lastTime   = 0;
    requestAnimationFrame(this._loop);
  }

  // ──────────────────────────────────────── Resize ──────── //
  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.stars) { this.stars.canvas = this.canvas; }
  }

  // ──────────────────────────────── Menu / Button Binds ─── //
  _bindMenuButtons() {
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-controls').addEventListener('click', () => this.ui.toggleControls());
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-menu-from-pause').addEventListener('click', () => this.goMenu());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-menu-from-gameover').addEventListener('click', () => this.goMenu());
  }

  // ──────────────────────────── Input Setup ─────────────── //
  _bindInput() {
    const p = this.player;
    this._kd = e => {
      p.keys[e.key] = true;
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.togglePause();
      e.preventDefault();
    };
    this._ku = e => { p.keys[e.key] = false; };
    this._mm = e => {
      const rect = this.canvas.getBoundingClientRect();
      p.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    };
    this._md = e => { if (e.button === 0) { p.firing = true; this.audio.resume(); } };
    this._mu = e => { if (e.button === 0) p.firing = false; };

    // ── Touch (mobile / tablet) ──────────────────────────── //
    this._tt = e => {
      e.preventDefault();
      this.audio.resume();
      const touch = e.touches[0];
      const rect  = this.canvas.getBoundingClientRect();
      p.mouseX  = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
      p.firing  = true;
    };
    this._tm = e => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect  = this.canvas.getBoundingClientRect();
      p.mouseX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
    };
    this._te = e => {
      e.preventDefault();
      if (e.touches.length === 0) p.firing = false;
    };

    window.addEventListener('keydown',   this._kd);
    window.addEventListener('keyup',     this._ku);
    window.addEventListener('mousemove', this._mm);
    window.addEventListener('mousedown', this._md);
    window.addEventListener('mouseup',   this._mu);
    window.addEventListener('touchstart', this._tt, { passive: false });
    window.addEventListener('touchmove',  this._tm, { passive: false });
    window.addEventListener('touchend',   this._te, { passive: false });
  }

  _unbindInput() {
    window.removeEventListener('keydown',   this._kd);
    window.removeEventListener('keyup',     this._ku);
    window.removeEventListener('mousemove', this._mm);
    window.removeEventListener('mousedown', this._md);
    window.removeEventListener('mouseup',   this._mu);
    window.removeEventListener('touchstart', this._tt);
    window.removeEventListener('touchmove',  this._tm);
    window.removeEventListener('touchend',   this._te);
  }

  // ──────────────────────────────────── Game Start ──────── //
  startGame() {
    if (this._kd) this._unbindInput();

    this.player  = new Player(this.canvas);
    this.rpg     = new RPGSystem(this.player);
    this.psys    = new ParticleSystem();

    this.score   = 0;
    this.wave    = 0;
    this.kills   = 0;
    this.boss    = null;
    this.bossNum = 0;

    this.projectiles   = [];   // player projectiles
    this.enemyBullets  = [];   // enemy projectiles
    this.powerups      = [];
    this.bombs         = [];
    this.laser         = null;

    this.waveClearing  = false;
    this.wavePause     = 0;
    this.upgradesCache = [];

    this._bindInput();
    this.state = STATE.PLAYING;
    this.ui.show('hud');

    this._nextWave();
  }

  goMenu() {
    if (this._kd) this._unbindInput();
    this.state = STATE.MENU;
    this.ui.show('menu');
  }

  togglePause() {
    if (this.state === STATE.PLAYING) { this.state = STATE.PAUSE; this.ui.show('pause'); }
    else if (this.state === STATE.PAUSE) { this.resume(); }
  }

  resume() { this.state = STATE.PLAYING; this.ui.show('hud'); }

  // ──────────────────────────────────── Wave Logic ──────── //
  _nextWave() {
    this.wave++;
    this.powerups      = [];
    this.projectiles   = [];
    this.enemyBullets  = [];
    this.bombs         = [];
    this.laser         = null;
    this.waveClearing  = false;

    if (this.wave % 5 === 0) {
      // Boss wave
      this.bossNum++;
      this.formation = null;
      this.boss      = new BossEnemy(this.canvas.width / 2, 130, this.bossNum);
      this.ui.showBossIntro(this.boss.name, () => {
        this.state = STATE.PLAYING;
        this.ui.show('hud');
      });
      this.state = STATE.BOSSINTRO;
      this.audio.bossIntro();
    } else {
      this.formation = new Formation(this.canvas, this.wave);
      this.boss      = null;
    }
  }

  // ──────────────────────────────── Main Loop ───────────── //
  _loop(ts) {
    requestAnimationFrame(this._loop);
    const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    this.stars.update(dt);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#030612';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.stars.draw(ctx);

    if (this.state === STATE.PLAYING) this._updateGame(dt);
    if (this.state !== STATE.MENU)    this._drawGame(ctx);
    if (this.state === STATE.PLAYING) this.ui.updateHUD(this.player, this.rpg, this.score, this.wave);
  }

  // ──────────────────────────────────── Update ──────────── //
  _updateGame(dt) {
    const p = this.player;

    // HP regen
    if (p._hpRegen) p.hp = Math.min(p.maxHp, p.hp + p._hpRegen * dt);

    p.update(dt);

    // Player shooting
    const newShots = p.tryShoot(this.psys, this.audio);
    newShots.forEach(s => { if (p._piercingShots) s.piercing = true; });
    this.projectiles.push(...newShots);
    this.projectiles.push(...p.getDroneShots(this.audio));

    // Laser
    if (p.hasPU('laser')) {
      if (!this.laser) this.laser = new LaserBeam(p.x, this.canvas.height);
      else this.laser.update(dt);
    } else { this.laser = null; }

    // Wave complete check
    const allGone = (!this.formation || !this.formation.alive) && !this.boss;
    if (allGone && !this.waveClearing) {
      this.waveClearing = true;
      this.wavePause    = 2;
    }
    if (this.waveClearing) {
      this.wavePause -= dt;
      if (this.wavePause <= 0) { this.waveClearing = false; this._nextWave(); }
    }

    // Formation
    if (this.formation) {
      this.formation.update(dt, p.x, p.y);
      // Enemy shooting
      this.formation.getShooters().forEach(e => {
        const angle = Utils.angleTo(e.x, e.y, p.x, p.y);
        const spd   = 5 + this.wave * 0.2;
        this.enemyBullets.push(new Projectile(e.x, e.y, Math.cos(angle)*spd, Math.sin(angle)*spd, 15, false, { color:'#ff3860', w:4, h:10 }));
        this.audio.enemyShoot();
      });
      if (!this.formation.alive) this.formation = null;
    }

    // Boss
    if (this.boss && !this.boss.dead) {
      this.boss.update(dt);
      if (this.boss.shouldShoot()) {
        const angles = this.boss.getShootAngles(p.x, p.y);
        const spd    = 4.5 + this.bossNum * 0.4;
        angles.forEach(a => {
          this.enemyBullets.push(new Projectile(this.boss.x, this.boss.y+40, Math.cos(a)*spd, Math.sin(a)*spd, 20, false, { color:'#ff0066', w:6, h:12 }));
        });
        this.audio.enemyShoot();
      }
      if (this.boss.shouldDropBomb()) {
        this.enemyBullets.push(new Projectile(this.boss.x, this.boss.y+50, 0, 3, 30, false, { color:'#ff8800', w:10, h:10 }));
      }
    }

    // Update player projectiles
    for (let i = this.projectiles.length-1; i >= 0; i--) {
      this.projectiles[i].update(dt, this.canvas.width, this.canvas.height);
      if (this.projectiles[i].dead) { this.projectiles.splice(i, 1); }
    }

    // Update enemy bullets
    for (let i = this.enemyBullets.length-1; i >= 0; i--) {
      this.enemyBullets[i].update(dt, this.canvas.width, this.canvas.height);
      if (this.enemyBullets[i].dead) { this.enemyBullets.splice(i, 1); }
    }

    // Collision: player bullets → enemies
    this._bulletVsEnemies();

    // Collision: laser → enemies
    if (this.laser) this._laserVsEnemies();

    // Collision: bombs
    this.bombs.forEach(b => b.update(dt));
    this.bombs = this.bombs.filter(b => b.active);
    this._bombVsEnemies();

    // Collision: enemy bullets → player
    this._enemyBulletsVsPlayer(dt);

    // Power-ups
    const magnetR = 120 + (this.player._magnetBonus || 0);
    this.powerups.forEach(pu => { pu.magnetR = magnetR; pu.update(dt, p); });
    this.powerups = this.powerups.filter(pu => !pu.dead);
    this._checkPowerupCollect();

    this.psys.update(dt);
  }

  // ──────────────────────────── Collision Helpers ───────── //
  _bulletVsEnemies() {
    const targets = [];
    if (this.formation) targets.push(...this.formation.enemies);
    if (this.boss && !this.boss.dead) targets.push(this.boss);

    for (let bi = this.projectiles.length-1; bi >= 0; bi--) {
      const b = this.projectiles[bi];
      let hit = false;
      for (let ei = 0; ei < targets.length; ei++) {
        const e = targets[ei];
        if (e.dead) continue;
        const eb = e.bounds, bb = b.bounds;
        if (!Utils.rectHit({ x:bb.x, y:bb.y, w:bb.w, h:bb.h }, { x:eb.x, y:eb.y, w:eb.w, h:eb.h })) continue;

        let dmg = b.damage;
        // Crit chance
        if (this.player._critChance && Math.random() < this.player._critChance) dmg *= 2;

        const killed = e.hit(dmg);
        hit = !b.piercing;

        if (killed) {
          this.kills++;
          this.score += e.score;
          this._giveXP(e.xpReward);
          if (e instanceof BossEnemy) {
            this.psys.explodeBoss(e.x, e.y);
            this.audio.explode(true); this.audio.victory();
            this._spawnPowerup(e.x, e.y);
            this._spawnPowerup(e.x - 40, e.y);
            this._spawnPowerup(e.x + 40, e.y);
            this.boss = null;
          } else {
            this.psys.explodeEnemy(e.x, e.y, e.color);
            this.audio.explode(false);
            if (Math.random() < e.dropChance) this._spawnPowerup(e.x, e.y);
          }
        }
        if (hit) break;
      }
      if (hit) { this.projectiles.splice(bi, 1); }
    }
  }

  _laserVsEnemies() {
    const targets = [];
    if (this.formation) targets.push(...this.formation.enemies);
    if (this.boss && !this.boss.dead) targets.push(this.boss);

    targets.forEach(e => {
      if (e.dead) return;
      if (Math.abs(e.x - this.laser.x) < this.laser.w + e.w/2) {
        let dmg = this.laser.damage;
        if (this.player._critChance && Math.random() < this.player._critChance) dmg *= 2;
        const killed = e.hit(dmg);
        if (killed) {
          this.kills++; this.score += e.score;
          this._giveXP(e.xpReward);
          if (e instanceof BossEnemy) {
            this.psys.explodeBoss(e.x, e.y);
            this.audio.explode(true); this.audio.victory();
            this._spawnPowerup(e.x, e.y);
            this._spawnPowerup(e.x - 40, e.y);
            this._spawnPowerup(e.x + 40, e.y);
            this.boss = null;
          } else {
            this.psys.explodeEnemy(e.x, e.y, e.color);
            this.audio.explode(false);
            if (Math.random() < e.dropChance) this._spawnPowerup(e.x, e.y);
          }
        }
      }
    });
  }

  _bombVsEnemies() {
    const targets = [];
    if (this.formation) targets.push(...this.formation.enemies);
    if (this.boss && !this.boss.dead) targets.push(this.boss);

    this.bombs.forEach(bomb => {
      targets.forEach(e => {
        if (e.dead || bomb.hit.has(e)) return;
        if (bomb.hitsEnemy(e.x, e.y)) {
          bomb.hit.add(e);
          const killed = e.hit(bomb.damage);
          if (killed) {
            this.kills++; this.score += e.score;
            this.psys.explodeEnemy(e.x, e.y, e.color);
            this._giveXP(e.xpReward);
          }
        }
      });
    });
  }

  _enemyBulletsVsPlayer(dt) {
    const p = this.player;
    const pb = p.bounds;
    for (let i = this.enemyBullets.length-1; i >= 0; i--) {
      const b  = this.enemyBullets[i];
      const bb = b.bounds;
      if (Utils.rectHit({ x:bb.x, y:bb.y, w:bb.w, h:bb.h }, { x:pb.x, y:pb.y, w:pb.w, h:pb.h })) {
        const hurt = p.takeDamage(b.damage, this.psys);
        if (hurt) this.audio.playerHit();
        this.enemyBullets.splice(i, 1);
        if (p.dead) { this.ui.showGameOver(this.score, this.wave, this.rpg.level, this.kills); this.state = STATE.GAMEOVER; return; }
      }
    }
  }

  // ──────────────────────────── Power-up Collect ────────── //
  _checkPowerupCollect() {
    const p = this.player;
    for (let i = this.powerups.length-1; i >= 0; i--) {
      const pu = this.powerups[i];
      if (!pu.hitsPlayer(p.x, p.y)) continue;
      this.psys.collectPowerup(pu.x, pu.y);
      this.audio.powerup();
      this._applyPowerupEffect(pu.type);
      this.powerups.splice(i, 1);
      // Double-drop bonus
      if (p._doubleDropChance && Math.random() < 0.25) {
        this._spawnPowerup(p.x + Utils.rand(-50,50), p.y);
      }
    }
  }

  _applyPowerupEffect(type) {
    const p = this.player;
    if (type.id === 'bomb') {
      this.bombs.push(new Bomb(p.x, p.y));
      this.psys.burst(p.x, p.y, { colors:['#ffd700','#ff8800','#fff'], count:30, speed:200, size:6 });
      this.audio.explode(false);
    } else {
      p.applyPU(type, this.audio);
    }
  }

  _spawnPowerup(x, y) { this.powerups.push(new PowerUp(x, y, randomPUType())); }

  // ──────────────────────────── XP & Level-Up ───────────── //
  _giveXP(amount) {
    const leveled = this.rpg.addXP(amount);
    if (leveled && this.state === STATE.PLAYING) this._showLevelUp();
  }

  _showLevelUp() {
    this.state = STATE.LEVELUP;
    const picks = this.rpg.pickUpgrades(3);
    if (picks.length === 0) { this.state = STATE.PLAYING; return; }
    this.audio.levelUp();
    this.ui.showLevelUp(this.rpg.level, picks, upgrade => {
      this.rpg.applyUpgrade(upgrade);
      this.state = STATE.PLAYING;
      this.ui.show('hud');
    });
  }

  // ──────────────────────────────────────── Draw ────────── //
  _drawGame(ctx) {
    const p = this.player;

    // Enemy projectiles
    this.enemyBullets.forEach(b => b.draw(ctx));

    // Formation
    if (this.formation) this.formation.draw(ctx);

    // Boss
    if (this.boss && !this.boss.dead) this.boss.draw(ctx);

    // Boss HP bar
    if (this.boss && !this.boss.dead) this._drawBossHPBar(ctx);

    // Laser
    if (this.laser && p.hasPU('laser')) this.laser.draw(ctx, p.x);

    // Player projectiles
    this.projectiles.forEach(b => b.draw(ctx));

    // Bombs
    this.bombs.forEach(b => b.draw(ctx));

    // Power-ups
    this.powerups.forEach(pu => pu.draw(ctx));

    // Particles
    this.psys.draw(ctx);

    // Player
    if (!this.player.dead) this.player.draw(ctx);
  }

  _drawBossHPBar(ctx) {
    const b   = this.boss;
    const bw  = this.canvas.width * 0.5;
    const bx  = (this.canvas.width - bw) / 2;
    const by  = this.canvas.height - 36;
    const pct = Math.max(0, b.hp / b.maxHp);

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 4, by - 16, bw + 8, 28);
    ctx.strokeStyle = '#cc0044';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 4, by - 16, bw + 8, 28);

    // Name
    ctx.font = '12px Orbitron, monospace';
    ctx.fillStyle = '#ff4488';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.name + ' — PHASE ' + b.phase, this.canvas.width/2, by - 8);

    // Bar
    ctx.fillStyle = '#1a0010';
    ctx.fillRect(bx, by + 2, bw, 10);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#cc0044');
    grad.addColorStop(0.5, '#ff4488');
    grad.addColorStop(1, '#ff0066');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff0066'; ctx.shadowBlur = 10;
    ctx.fillRect(bx, by + 2, bw * pct, 10);
    ctx.restore();
  }
}

// ─── Boot ─────────────────────────────────────────────────── //
window.addEventListener('DOMContentLoaded', () => { window._game = new Game(); });
