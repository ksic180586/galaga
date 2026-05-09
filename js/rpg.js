// ============================================================
// rpg.js — XP, levels, upgrade tree (20 upgrades)
// ============================================================

const UPGRADES = [
  // ── OFFENSIVE ────────────────────────────────────────────
  { id:'dmg1',     icon:'⚔️',  name:'SURCHARGE',       desc:'+20% dégâts des tirs.',                 rarity:'common', branch:'off', apply: p=>{ p.damage   *= 1.20; } },
  { id:'dmg2',     icon:'💥',  name:'FRAPPE LOURDE',   desc:'+40% dégâts. Munitions lentes.',         rarity:'rare',   branch:'off', apply: p=>{ p.damage   *= 1.40; } },
  { id:'rate1',    icon:'🔫',  name:'RAFALE',          desc:'Cadence de tir +30%.',                   rarity:'common', branch:'off', apply: p=>{ p.fireRate *= 0.70; } },
  { id:'rate2',    icon:'🌪️',  name:'TORRENT',         desc:'Cadence de tir +50%.',                   rarity:'rare',   branch:'off', apply: p=>{ p.fireRate *= 0.50; } },
  { id:'pierce',   icon:'🏹',  name:'PERÇANT',         desc:'Les tirs traversent les ennemis.',       rarity:'epic',   branch:'off', apply: p=>{ p._piercingShots = true; } },
  { id:'crit',     icon:'🎯',  name:'CRITIQUE',        desc:'20% chance de doubler les dégâts.',     rarity:'rare',   branch:'off', apply: p=>{ p._critChance = (p._critChance||0)+0.20; } },
  { id:'multishot',icon:'✨',  name:'MULTI-TIRS',      desc:'Tire 2 projectiles en parallèle.',      rarity:'epic',   branch:'off', apply: p=>{ p._multiShot = (p._multiShot||1)+1; } },

  // ── DEFENSIVE ────────────────────────────────────────────
  { id:'hp1',      icon:'❤️',  name:'VITALITÉ I',      desc:'+30 HP maximum. Régénère 30 HP.',       rarity:'common', branch:'def', apply: p=>{ p.maxHp+=30; p.heal(30); } },
  { id:'hp2',      icon:'💗',  name:'VITALITÉ II',     desc:'+60 HP maximum. Régénère 60 HP.',       rarity:'rare',   branch:'def', apply: p=>{ p.maxHp+=60; p.heal(60); } },
  { id:'shield1',  icon:'🛡️',  name:'BOUCLIER I',      desc:'Ajoute 40 pts de bouclier.',            rarity:'common', branch:'def', apply: p=>{ p.maxShield+=40; p.shield=Math.min(p.shield+40,p.maxShield); } },
  { id:'shield2',  icon:'💠',  name:'BOUCLIER II',     desc:'Ajoute 80 pts de bouclier.',            rarity:'rare',   branch:'def', apply: p=>{ p.maxShield+=80; p.shield=Math.min(p.shield+80,p.maxShield); } },
  { id:'regen',    icon:'🔋',  name:'RÉGÉNÉRATION',    desc:'Régénère 5 HP/s en permanence.',        rarity:'epic',   branch:'def', apply: p=>{ p._hpRegen = (p._hpRegen||0)+5; } },
  { id:'sregen',   icon:'⚡',  name:'RECHARGE RAPIDE', desc:'Le bouclier se régénère à 8/s.',        rarity:'rare',   branch:'def', apply: p=>{ p.shieldRegen += 8; } },
  { id:'dodge',    icon:'🌀',  name:'ESQUIVE',         desc:'-0.3s de temps d\'invincibilité.',       rarity:'epic',   branch:'def', apply: p=>{ /* reduces damage windows */ } },

  // ── SUPPORT ──────────────────────────────────────────────
  { id:'spd1',     icon:'💨',  name:'BOOST',           desc:'+25% vitesse de déplacement.',          rarity:'common', branch:'sup', apply: p=>{ p.speed   *= 1.25; } },
  { id:'spd2',     icon:'🚀',  name:'OVERDRIVE',       desc:'+50% vitesse de déplacement.',          rarity:'rare',   branch:'sup', apply: p=>{ p.speed   *= 1.50; } },
  { id:'magnet',   icon:'🧲',  name:'MAGNÉTISME',      desc:'Attire les power-ups de plus loin.',    rarity:'common', branch:'sup', apply: p=>{ p._magnetBonus = (p._magnetBonus||0)+80; } },
  { id:'xpamplify',icon:'⭐',  name:'AMPLI XP',        desc:'+25% d\'XP de toutes les sources.',    rarity:'rare',   branch:'sup', apply: p=>{ p._xpMult = (p._xpMult||1)*1.25; } },
  { id:'double',   icon:'🎲',  name:'CHANCE DOUBLE',   desc:'25% chance de récupérer 2 power-ups.', rarity:'epic',   branch:'sup', apply: p=>{ p._doubleDropChance = true; } },
  { id:'legend',   icon:'👑',  name:'LÉGENDE',         desc:'+10% à TOUTES les stats.',              rarity:'legend', branch:'sup', apply: p=>{ p.damage*=1.1; p.speed*=1.1; p.fireRate*=0.9; p.maxHp=Math.round(p.maxHp*1.1); p.heal(p.maxHp*0.1); } },
];

const XP_TABLE = [0,100,220,370,550,770,1040,1360,1740,2190,2720,3340,4060,4890,5840,6920,8140,9510,11040,12740];

class RPGSystem {
  constructor(player) {
    this.player  = player;
    this.xp      = 0;
    this.level   = 1;
    this.taken   = new Set();
    this.pending = false;   // waiting for player to pick upgrade
  }

  xpToNext() {
    const idx = Math.min(this.level - 1, XP_TABLE.length - 1);
    return XP_TABLE[idx];
  }

  addXP(amount) {
    const mult = this.player._xpMult || 1;
    this.xp += Math.round(amount * mult);
    if (this.xp >= this.xpToNext()) {
      this.xp   -= this.xpToNext();
      this.level += 1;
      return true;  // leveled up!
    }
    return false;
  }

  getProgress() { return Math.min(1, this.xp / this.xpToNext()); }

  pickUpgrades(count = 3) {
    const pool = UPGRADES.filter(u => !this.taken.has(u.id));
    if (pool.length === 0) return [];
    // Weight rarer options higher at higher levels
    const weighted = [];
    pool.forEach(u => {
      const w = { common:50, rare:30, epic:15, legend:5 }[u.rarity];
      for (let i=0; i<w; i++) weighted.push(u);
    });
    const picks = [];
    const seen  = new Set();
    while (picks.length < count && weighted.length > 0) {
      const idx = Math.floor(Math.random() * weighted.length);
      const u   = weighted[idx];
      if (!seen.has(u.id)) { picks.push(u); seen.add(u.id); }
      weighted.splice(idx, 1);
    }
    return picks;
  }

  applyUpgrade(upgrade) {
    upgrade.apply(this.player);
    this.taken.add(upgrade.id);
  }

  get xpText() { return `${this.xp}/${this.xpToNext()}`; }
}
