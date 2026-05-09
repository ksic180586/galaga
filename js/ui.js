// ============================================================
// ui.js — HUD updates and screen transitions
// ============================================================

class UIManager {
  constructor() {
    this.$screens = {
      menu:      document.getElementById('screen-menu'),
      hud:       document.getElementById('screen-hud'),
      levelup:   document.getElementById('screen-levelup'),
      pause:     document.getElementById('screen-pause'),
      gameover:  document.getElementById('screen-gameover'),
      bossintro: document.getElementById('screen-bossintro'),
    };
    // Refs to frequently updated elements
    this.$hp        = document.getElementById('hp-bar');
    this.$hpVal     = document.getElementById('hp-value');
    this.$shieldBlk = document.getElementById('shield-block');
    this.$shield    = document.getElementById('shield-bar');
    this.$shieldVal = document.getElementById('shield-value');
    this.$xpBar     = document.getElementById('xp-bar');
    this.$xpVal     = document.getElementById('xp-value');
    this.$lvl       = document.getElementById('player-level');
    this.$score     = document.getElementById('score-display');
    this.$wave      = document.getElementById('wave-display');
    this.$puSlots   = document.getElementById('hud-powerups');
  }

  show(name) {
    Object.values(this.$screens).forEach(s => s.classList.remove('active'));
    if (this.$screens[name]) this.$screens[name].classList.add('active');
  }

  updateHUD(player, rpg, score, wave) {
    // HP
    const hpPct = Math.max(0, player.hp / player.maxHp * 100);
    this.$hp.style.width    = hpPct + '%';
    this.$hpVal.textContent = Math.ceil(player.hp) + '/' + player.maxHp;

    // Shield
    if (player.maxShield > 0) {
      this.$shieldBlk.style.display = '';
      const sPct = Math.max(0, player.shield / player.maxShield * 100);
      this.$shield.style.width    = sPct + '%';
      this.$shieldVal.textContent = Math.ceil(player.shield) + '/' + player.maxShield;
    } else {
      this.$shieldBlk.style.display = 'none';
    }

    // XP
    this.$xpBar.style.width  = (rpg.getProgress() * 100) + '%';
    this.$xpVal.textContent  = rpg.xpText;
    this.$lvl.textContent    = rpg.level;

    // Score & wave
    this.$score.textContent = score.toLocaleString();
    this.$wave.textContent  = wave;

    // Power-up slots
    const pus = Object.values(player.activePU).filter(p => p.type.dur > 0);
    this.$puSlots.innerHTML = pus.map(p => `
      <div class="powerup-slot">
        <span class="powerup-icon">${p.type.icon}</span>
        <div class="powerup-bar-wrap"><div class="powerup-bar" style="width:${p.progress*100}%;background:${p.type.color}"></div></div>
        <span class="powerup-timer">${p.remaining.toFixed(1)}s</span>
      </div>
    `).join('');
  }

  showLevelUp(level, upgrades, onPick) {
    document.getElementById('new-level').textContent = level;
    const container = document.getElementById('upgrade-cards');
    container.innerHTML = '';
    upgrades.forEach(u => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <span class="upgrade-icon">${u.icon}</span>
        <div class="upgrade-name">${u.name}</div>
        <div class="upgrade-desc">${u.desc}</div>
        <span class="upgrade-rarity rarity-${u.rarity}">${u.rarity.toUpperCase()}</span>
      `;
      card.addEventListener('click', () => onPick(u), { once: true });
      container.appendChild(card);
    });
    this.show('levelup');
  }

  showBossIntro(name, onDone) {
    document.getElementById('boss-name').textContent = name;
    this.show('bossintro');
    setTimeout(onDone, 2800);
  }

  showGameOver(score, wave, level, kills) {
    document.getElementById('final-score').textContent = score.toLocaleString();
    document.getElementById('final-wave').textContent  = wave;
    document.getElementById('final-level').textContent = level;
    document.getElementById('final-kills').textContent = kills;
    this.show('gameover');
  }

  // Toggle controls panel
  toggleControls() {
    const panel = document.getElementById('controls-panel');
    panel.classList.toggle('visible');
  }
}
