/* ============================================
   Sotaro craft 99 - Game Logic
   九九バトルゲーム (Web Audio API / State管理)
   ============================================ */

// ===== State =====
const state = {
  stage: 1,
  playerHP: 100,
  playerMaxHP: 100,
  enemyHP: 72,
  enemyMaxHP: 72,
  combo: 0,
  specialReady: false,
  timeLimit: 15,
  remainingTime: 15,
  lastProblem: null,
  currentProblem: null,
  isGameOver: false,
  isPaused: false,
  enemiesDefeated: 0,
  totalCorrect: 0,
  totalWrong: 0,
  bgmOn: true,
  volume: 0.5,
  items: [],
  weaponLevel: 0,
  gameMode: 'battle', // 'battle' or 'mining'
};

// ===== DOM References =====
const $ = (id) => document.getElementById(id);

const dom = {
  startScreen:   $('start-screen'),
  gameScreen:    $('game-screen'),
  gameoverScreen:$('gameover-screen'),
  startBtn:      $('start-btn'),
  retryBtn:      $('retry-btn'),
  bgmToggle:     $('bgm-toggle'),
  volumeSlider:  $('volume-slider'),
  playerHpBar:   $('player-hp-bar'),
  playerHpText:  $('player-hp-text'),
  enemyHpBar:    $('enemy-hp-bar'),
  enemyHpText:   $('enemy-hp-text'),
  enemyLabel:    $('enemy-label'),
  playerChar:    $('player-char'),
  enemyChar:     $('enemy-char'),
  effectText:    $('effect-text'),
  damageNumber:  $('damage-number'),
  stageNum:      $('stage-num'),
  comboNum:      $('combo-num'),
  timeNum:       $('time-num'),
  specialNum:    $('special-num'),
  specialStatus: $('special-status'),
  timerBar:      $('timer-bar'),
  questionText:  $('question-text'),
  answerInput:   $('answer-input'),
  answerForm:    $('answer-form'),
  submitBtn:     $('submit-btn'),
  specialBtn:    $('special-btn'),
  resultStats:   $('result-stats'),
  correctOverlay:$('correct-answer-overlay'),
  itemCollection:$('item-collection'),
  weaponDisplay: $('weapon-display'),
  modeBattle:    $('mode-battle'),
  modeMining:    $('mode-mining'),
  clearScreen:   $('clear-screen'),
  clearStats:    $('clear-stats'),
  clearRetryBtn: $('clear-retry-btn'),
};

// ===== Weapon System =====
const WEAPONS = [
  { name: 'こぶし',   emoji: '✊', color: '#d4a840', dmgBonus: 0 },
  { name: '木の剣',   emoji: '🗡️', color: '#a0622d', dmgBonus: 3 },
  { name: '石の剣',   emoji: '🗡️', color: '#9ca3af', dmgBonus: 5 },
  { name: '鉄の槍',   emoji: '🔱', color: '#d1d5db', dmgBonus: 8 },
  { name: '金の槍',   emoji: '🔱', color: '#fbbf24', dmgBonus: 11 },
  { name: '鉄の斧',   emoji: '🪓', color: '#9ca3af', dmgBonus: 14 },
  { name: 'ダイヤの斧', emoji: '🪓', color: '#22d3ee', dmgBonus: 18 },
  { name: 'ネザライトの剣', emoji: '⚔️', color: '#6b21a8', dmgBonus: 24 },
];

function getCurrentWeapon() {
  var idx = Math.min(state.weaponLevel, WEAPONS.length - 1);
  return WEAPONS[idx];
}

function updateWeaponUI() {
  var w = getCurrentWeapon();
  dom.weaponDisplay.textContent = w.emoji + ' ' + w.name;
  dom.weaponDisplay.style.color = w.color;
  // Update player right arm color to reflect weapon
  var rightArm = document.querySelector('.mc-arm.right-arm');
  if (rightArm && state.weaponLevel > 0) {
    rightArm.style.boxShadow = '2px 2px 0 var(--block-shadow), 0 0 6px ' + w.color;
  }
}

// ===== Item System =====
function addItem(item) {
  state.items.push(item);
  renderItems();
}

function renderItems() {
  var html = '';
  // Count items
  var counts = {};
  state.items.forEach(function(item) {
    var key = item.name;
    if (!counts[key]) counts[key] = { emoji: item.emoji, count: 0 };
    counts[key].count++;
  });
  for (var name in counts) {
    html += '<span class="item-badge" title="' + name + '">' +
      counts[name].emoji +
      (counts[name].count > 1 ? '<span class="item-count">x' + counts[name].count + '</span>' : '') +
      '</span>';
  }
  dom.itemCollection.innerHTML = html;
}

// ===== Enemy Mob Types =====
const MOB_TYPES = [
  {
    minStage: 1,
    name: 'SLIME', cssClass: 'mob-slime',
    item: { name: 'スライムボール', emoji: '🟢' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div>'
  },
  {
    minStage: 2,
    name: 'ZOMBIE', cssClass: 'mob-zombie',
    item: { name: '腐った肉', emoji: '🥩' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-arms"><div class="enemy-arm"></div><div class="enemy-torso"></div><div class="enemy-arm"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 3,
    name: 'SKELETON', cssClass: 'mob-skeleton',
    item: { name: '骨', emoji: '🦴' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-arms"><div class="enemy-arm"></div><div class="enemy-torso"></div><div class="enemy-arm"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 4,
    name: 'SPIDER', cssClass: 'mob-spider',
    item: { name: 'クモの糸', emoji: '🕸️' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 5,
    name: 'CREEPER', cssClass: 'mob-creeper',
    item: { name: '火薬', emoji: '💥' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 6,
    name: 'ENDERMAN', cssClass: 'mob-enderman',
    item: { name: 'エンダーパール', emoji: '🟣' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div></div><div class="enemy-arms"><div class="enemy-arm"></div><div class="enemy-torso"></div><div class="enemy-arm"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 7,
    name: 'BLAZE', cssClass: 'mob-blaze',
    item: { name: 'ブレイズロッド', emoji: '🔥' },
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 8,
    name: 'WITHER', cssClass: 'mob-wither',
    item: { name: 'ネザースター', emoji: '⭐' },
    html: '<div class="enemy-head"><div class="enemy-horn"></div><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 10,
    name: 'ENDER DRAGON', cssClass: 'mob-dragon', isBoss: true,
    item: { name: 'ドラゴンの卵', emoji: '🥚' },
    html: '<div class="enemy-head"><div class="enemy-horn left-horn"></div><div class="enemy-horn right-horn"></div><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"><div class="dragon-wing left-wing"></div><div class="dragon-wing right-wing"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div><div class="dragon-tail"></div>'
  },
];

// ===== Mining Targets =====
const MINE_TYPES = [
  {
    minStage: 1,
    name: '石', cssClass: 'mine-stone',
    item: { name: '丸石', emoji: '🪨' },
    html: '<div class="mine-block"><div class="mine-crack"></div></div>'
  },
  {
    minStage: 2,
    name: '石炭鉱石', cssClass: 'mine-coal',
    item: { name: '石炭', emoji: '⬛' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
  {
    minStage: 3,
    name: '鉄鉱石', cssClass: 'mine-iron',
    item: { name: '鉄の原石', emoji: '🔘' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
  {
    minStage: 4,
    name: '金鉱石', cssClass: 'mine-gold',
    item: { name: '金の原石', emoji: '🟡' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
  {
    minStage: 5,
    name: 'レッドストーン鉱石', cssClass: 'mine-redstone',
    item: { name: 'レッドストーン', emoji: '🔴' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
  {
    minStage: 6,
    name: 'ダイヤモンド鉱石', cssClass: 'mine-diamond',
    item: { name: 'ダイヤモンド', emoji: '💎' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
  {
    minStage: 7,
    name: 'エメラルド鉱石', cssClass: 'mine-emerald',
    item: { name: 'エメラルド', emoji: '💚' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
  {
    minStage: 8,
    name: '古代の残骸', cssClass: 'mine-netherite',
    item: { name: 'ネザライトの欠片', emoji: '🟤' },
    html: '<div class="mine-block"><div class="mine-ore"></div><div class="mine-crack"></div></div>'
  },
];

function getTargetForStage(stage) {
  var types = state.gameMode === 'mining' ? MINE_TYPES : MOB_TYPES;
  var target = types[0];
  for (var i = 0; i < types.length; i++) {
    if (stage >= types[i].minStage) target = types[i];
  }
  return target;
}

function renderEnemy(stage) {
  var target = getTargetForStage(stage);
  var el = dom.enemyChar;
  // Remove all mob/mine classes
  MOB_TYPES.forEach(function(m) { el.classList.remove(m.cssClass); });
  MINE_TYPES.forEach(function(m) { el.classList.remove(m.cssClass); });
  el.classList.remove('dying');
  el.classList.add(target.cssClass);
  el.innerHTML = target.html;
  dom.enemyLabel.textContent = target.name + ' Lv.' + stage;
}

// ===== Enemy HP Calculation =====
function getEnemyMaxHP(stage) {
  // Boss stage: Ender Dragon
  if (stage >= 10) {
    return 150;
  }
  // Stage 1-3: easy (30-50)
  // Stage 4-6: moderate (55-75)
  // Stage 7-9: hard (80-120)
  if (stage <= 3) {
    return 20 + stage * 10; // 30, 40, 50
  } else if (stage <= 6) {
    return 45 + (stage - 3) * 10; // 55, 65, 75
  } else {
    return 75 + (stage - 6) * 15; // 90, 105, 120
  }
}

// ===== Audio Engine (Web Audio API) =====
var audioCtx = null;
var bgmInterval = null;
var masterGain = null;
var audioUnlocked = false;

function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return;
    }
    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.volume;
    masterGain.connect(audioCtx.destination);
  }
}

// Must be called from direct user gesture (click/touchend)
function resumeAudio() {
  if (!audioCtx) initAudio();
  if (!audioCtx) return Promise.resolve();
  if (audioCtx.state === 'suspended') {
    return audioCtx.resume().then(function() {
      audioUnlocked = true;
    });
  }
  audioUnlocked = true;
  return Promise.resolve();
}

function setVolume(v) {
  state.volume = v;
  if (masterGain) masterGain.gain.value = v;
}

// --- Synth helpers ---
function playTone(freq, duration, type, vol, delay) {
  if (!audioCtx || !audioUnlocked) return;
  type = type || 'square';
  vol = (vol !== undefined) ? vol : 0.3;
  delay = delay || 0;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

function playNoise(duration, vol) {
  if (!audioCtx || !audioUnlocked) return;
  vol = (vol !== undefined) ? vol : 0.15;
  var bufferSize = Math.floor(audioCtx.sampleRate * duration);
  var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * vol;
  }
  var source = audioCtx.createBufferSource();
  source.buffer = buffer;
  var gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(gain);
  gain.connect(masterGain);
  source.start();
}

// --- SE ---
function seCorrect() {
  playTone(523, 0.1, 'square', 0.25);
  playTone(659, 0.1, 'square', 0.25, 0.08);
  playTone(784, 0.15, 'square', 0.25, 0.16);
}
function seWrong() {
  playTone(200, 0.15, 'sawtooth', 0.25);
  playTone(150, 0.2, 'sawtooth', 0.25, 0.12);
}
function seSpecialReady() {
  playTone(587, 0.1, 'square', 0.3);
  playTone(740, 0.1, 'square', 0.3, 0.1);
  playTone(880, 0.15, 'square', 0.3, 0.2);
  playTone(1175, 0.2, 'triangle', 0.3, 0.3);
}
function seSpecialAttack() {
  playTone(440, 0.08, 'square', 0.35);
  playTone(554, 0.08, 'square', 0.35, 0.06);
  playTone(659, 0.08, 'square', 0.35, 0.12);
  playTone(880, 0.1, 'square', 0.35, 0.18);
  playTone(1109, 0.15, 'square', 0.35, 0.25);
  playTone(1318, 0.25, 'triangle', 0.35, 0.32);
  playNoise(0.3, 0.1);
}
function seEnemyDown() {
  playTone(523, 0.12, 'square', 0.3);
  playTone(659, 0.12, 'square', 0.3, 0.1);
  playTone(784, 0.12, 'square', 0.3, 0.2);
  playTone(1047, 0.3, 'square', 0.3, 0.3);
}
function seItemGet() {
  playTone(784, 0.08, 'square', 0.2);
  playTone(1047, 0.12, 'triangle', 0.25, 0.08);
}
function seWeaponUp() {
  playTone(523, 0.08, 'square', 0.25);
  playTone(659, 0.08, 'square', 0.25, 0.08);
  playTone(784, 0.08, 'square', 0.25, 0.16);
  playTone(1047, 0.2, 'triangle', 0.3, 0.24);
}
function seGameOver() {
  playTone(392, 0.3, 'sawtooth', 0.25);
  playTone(330, 0.3, 'sawtooth', 0.25, 0.3);
  playTone(262, 0.5, 'sawtooth', 0.25, 0.6);
}
function seMine() {
  playNoise(0.08, 0.2);
  playTone(200, 0.05, 'square', 0.15);
}
function seGameClear() {
  // Victory fanfare - triumphant ascending melody
  playTone(523, 0.15, 'square', 0.3);
  playTone(523, 0.15, 'square', 0.3, 0.15);
  playTone(523, 0.15, 'square', 0.3, 0.3);
  playTone(523, 0.3, 'square', 0.3, 0.45);
  playTone(415, 0.3, 'square', 0.3, 0.75);
  playTone(466, 0.3, 'square', 0.3, 1.05);
  playTone(523, 0.2, 'square', 0.3, 1.35);
  playTone(466, 0.15, 'square', 0.3, 1.55);
  playTone(523, 0.6, 'square', 0.3, 1.7);
  // Harmony
  playTone(330, 0.15, 'triangle', 0.2, 0.45);
  playTone(262, 0.3, 'triangle', 0.2, 0.75);
  playTone(294, 0.3, 'triangle', 0.2, 1.05);
  playTone(330, 0.6, 'triangle', 0.2, 1.35);
  playTone(392, 0.6, 'triangle', 0.2, 1.7);
  // Final shimmer
  playTone(1047, 0.4, 'triangle', 0.15, 2.3);
  playTone(1319, 0.4, 'triangle', 0.12, 2.4);
  playTone(1568, 0.5, 'triangle', 0.1, 2.5);
}

// --- BGM System (Stage-adaptive RPG music) ---
var bgmStep = 0;
var bgmCurrentTier = -1;

// Tier 0: Bright adventure (Stage 1-5) - C major, upbeat
var bgmTier0 = {
  tempo: 180,
  melody: [
    523, 587, 659, 784, 880, 784, 659, 784,
    880, 1047, 880, 784, 659, 784, 880, 659,
    523, 659, 784, 880, 1047, 880, 784, 659,
    784, 659, 587, 523, 587, 659, 523, 0,
  ],
  bass: [
    262, 262, 330, 330, 349, 349, 392, 392,
    440, 440, 392, 392, 330, 330, 349, 349,
    262, 262, 330, 330, 349, 349, 440, 440,
    392, 330, 294, 262, 294, 330, 262, 262,
  ],
  melType: 'square', bassType: 'triangle',
  melVol: 0.07, bassVol: 0.05, drumVol: 0.03, drumEvery: 4,
};

// Tier 1: Battle intensity (Stage 6-14) - A minor, driving rhythm
var bgmTier1 = {
  tempo: 200,
  melody: [
    440, 523, 659, 523, 440, 392, 440, 523,
    659, 784, 659, 523, 440, 523, 659, 784,
    880, 784, 659, 523, 587, 659, 587, 523,
    440, 523, 440, 392, 349, 392, 440, 0,
  ],
  bass: [
    220, 220, 262, 262, 294, 294, 262, 262,
    220, 220, 262, 262, 294, 294, 330, 330,
    349, 349, 330, 330, 294, 294, 262, 262,
    220, 220, 196, 196, 175, 196, 220, 220,
  ],
  melType: 'square', bassType: 'sawtooth',
  melVol: 0.07, bassVol: 0.04, drumVol: 0.04, drumEvery: 2,
};

// Tier 2: Dark serious (Stage 15-24) - D minor, tension
var bgmTier2 = {
  tempo: 170,
  melody: [
    587, 523, 440, 523, 587, 698, 659, 587,
    523, 440, 392, 440, 523, 587, 523, 440,
    587, 698, 784, 698, 587, 523, 587, 698,
    659, 587, 523, 440, 392, 440, 523, 0,
  ],
  bass: [
    294, 294, 262, 262, 233, 233, 262, 262,
    294, 294, 349, 349, 330, 330, 294, 294,
    233, 233, 262, 262, 294, 294, 349, 349,
    330, 294, 262, 233, 196, 220, 262, 262,
  ],
  melType: 'sawtooth', bassType: 'sawtooth',
  melVol: 0.06, bassVol: 0.04, drumVol: 0.05, drumEvery: 2,
};

// Tier 3: Epic boss (Stage 25+) - E minor, intense
var bgmTier3 = {
  tempo: 220,
  melody: [
    659, 784, 880, 784, 659, 587, 659, 784,
    880, 1047, 988, 880, 784, 880, 988, 880,
    659, 784, 880, 988, 1047, 988, 880, 784,
    659, 587, 523, 587, 659, 784, 659, 0,
  ],
  bass: [
    165, 165, 196, 196, 220, 220, 247, 247,
    165, 165, 196, 196, 220, 220, 262, 262,
    330, 330, 294, 294, 262, 262, 247, 247,
    220, 196, 165, 165, 196, 220, 165, 165,
  ],
  melType: 'square', bassType: 'sawtooth',
  melVol: 0.07, bassVol: 0.05, drumVol: 0.05, drumEvery: 2,
};

var bgmTiers = [bgmTier0, bgmTier1, bgmTier2, bgmTier3];

function getBGMTier() {
  var s = state.stage;
  if (s >= 8)  return 3;
  if (s >= 5)  return 2;
  if (s >= 3)  return 1;
  return 0;
}

function startBGM() {
  if (!audioCtx || bgmInterval) return;
  bgmStep = 0;
  bgmCurrentTier = getBGMTier();
  var tier = bgmTiers[bgmCurrentTier];
  bgmInterval = setInterval(function() {
    if (!state.bgmOn) return;
    // Check if tier should change
    var newTier = getBGMTier();
    if (newTier !== bgmCurrentTier) {
      bgmCurrentTier = newTier;
      tier = bgmTiers[bgmCurrentTier];
      bgmStep = 0; // Reset to start of new melody
    }
    var idx = bgmStep % tier.melody.length;
    var melNote = tier.melody[idx];
    var bassNote = tier.bass[idx];
    if (melNote > 0) playTone(melNote, 0.1, tier.melType, tier.melVol);
    if (bassNote > 0) playTone(bassNote, 0.12, tier.bassType, tier.bassVol);
    // Percussion pattern
    if (bgmStep % tier.drumEvery === 0) playNoise(0.04, tier.drumVol);
    if (bgmStep % 8 === 4) playNoise(0.02, tier.drumVol * 0.6);
    bgmStep++;
  }, Math.floor(60000 / (tier ? tier.tempo : 180)));
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

// Restart BGM to pick up new tier tempo
function refreshBGM() {
  if (state.bgmOn && bgmInterval) {
    stopBGM();
    startBGM();
  }
}

function toggleBGM() {
  state.bgmOn = !state.bgmOn;
  dom.bgmToggle.classList.toggle('muted', !state.bgmOn);
  if (state.bgmOn) startBGM();
  else stopBGM();
}

// ===== Timer =====
var timerInterval = null;
var TIMER_TICK = 100;

function getTimeLimitForStage() {
  var reduction = Math.floor(state.enemiesDefeated / 3);
  return Math.max(5, 15 - reduction);
}

function startTimer() {
  stopTimer();
  state.timeLimit = getTimeLimitForStage();
  state.remainingTime = state.timeLimit;
  updateTimerUI();
  timerInterval = setInterval(function() {
    if (state.isGameOver || state.isPaused) return;
    state.remainingTime = Math.max(0, state.remainingTime - TIMER_TICK / 1000);
    updateTimerUI();
    if (state.remainingTime <= 0) handleWrong();
  }, TIMER_TICK);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  dom.timeNum.textContent = state.remainingTime.toFixed(1);
  var pct = (state.remainingTime / state.timeLimit) * 100;
  dom.timerBar.style.width = pct + '%';
  if (pct < 25) dom.timeNum.style.color = '#ef4444';
  else if (pct < 50) dom.timeNum.style.color = '#fbbf24';
  else dom.timeNum.style.color = '#fff';
}

// ===== Problem Generation =====
function generateProblem() {
  var a, b;
  do {
    a = Math.floor(Math.random() * 9) + 1;
    b = Math.floor(Math.random() * 9) + 1;
  } while (state.lastProblem && state.lastProblem.a === a && state.lastProblem.b === b);
  state.lastProblem = { a: a, b: b };
  state.currentProblem = { a: a, b: b, answer: a * b };
  dom.questionText.textContent = a + ' \u00D7 ' + b + ' = ?';
}

// ===== Damage & Battle =====
function calcDamageToEnemy() {
  var baseDamage = 10;
  var speedBonus = Math.floor((state.remainingTime / state.timeLimit) * 15);
  var weaponBonus = getCurrentWeapon().dmgBonus;
  return baseDamage + speedBonus + weaponBonus;
}

function damageEnemy(dmg) {
  state.enemyHP = Math.max(0, state.enemyHP - dmg);
  updateHPBars();
  showDamageNumber(dmg, false);
  dom.playerChar.classList.add('attacking');
  dom.enemyChar.classList.add('hit');
  if (state.gameMode === 'mining') seMine();
  setTimeout(function() {
    dom.playerChar.classList.remove('attacking');
    dom.enemyChar.classList.remove('hit');
  }, 300);
}

function damagePlayer(dmg) {
  state.playerHP = Math.max(0, state.playerHP - dmg);
  updateHPBars();
  showDamageNumber(dmg, true);
  dom.playerChar.classList.add('hit');
  setTimeout(function() {
    dom.playerChar.classList.remove('hit');
  }, 300);
}

function healPlayer(amount) {
  state.playerHP = Math.min(state.playerMaxHP, state.playerHP + amount);
  updateHPBars();
}

function updateHPBars() {
  var pp = (state.playerHP / state.playerMaxHP) * 100;
  var ep = (state.enemyHP / state.enemyMaxHP) * 100;
  dom.playerHpBar.style.width = pp + '%';
  dom.enemyHpBar.style.width = ep + '%';
  dom.playerHpText.textContent = state.playerHP + '/' + state.playerMaxHP;
  dom.enemyHpText.textContent = state.enemyHP + '/' + state.enemyMaxHP;
}

// ===== Show Effects =====
function showEffect(text, cls) {
  dom.effectText.textContent = text;
  dom.effectText.className = 'effect-text show ' + cls;
  setTimeout(function() { dom.effectText.className = 'effect-text'; }, 900);
}

function showDamageNumber(value, isPlayer) {
  dom.damageNumber.textContent = '-' + value;
  dom.damageNumber.className = 'damage-number show' + (isPlayer ? ' player-dmg' : '');
  setTimeout(function() { dom.damageNumber.className = 'damage-number'; }, 800);
}

// ===== Answer Handling =====
function handleCorrect() {
  stopTimer();
  state.totalCorrect++;
  state.combo++;
  var dmg = calcDamageToEnemy();
  seCorrect();
  showEffect(state.gameMode === 'mining' ? 'DIG!' : 'HIT!', 'hit');
  damageEnemy(dmg);
  dom.comboNum.textContent = state.combo;

  if (state.combo >= 3 && !state.specialReady) {
    state.specialReady = true;
    updateSpecialUI();
    seSpecialReady();
  }

  if (state.enemyHP <= 0) { handleEnemyDefeated(); return; }
  generateProblem();
  startTimer();
  focusInput();
}

function handleWrong() {
  stopTimer();
  state.totalWrong++;
  state.combo = 0;
  state.specialReady = false;
  updateSpecialUI();
  seWrong();
  showEffect('MISS!', 'miss');
  damagePlayer(12);
  dom.comboNum.textContent = 0;

  if (state.playerHP <= 0) { handleGameOver(); return; }

  // Show correct answer overlay for 2 seconds, then advance
  var p = state.currentProblem;
  showCorrectAnswer(p.a + ' \u00D7 ' + p.b + ' = ' + p.answer);
  dom.answerInput.disabled = true;
  setTimeout(function() {
    dom.answerInput.disabled = false;
    generateProblem();
    startTimer();
    focusInput();
  }, 2000);
}

function showCorrectAnswer(text) {
  dom.correctOverlay.textContent = '\u6B63\u89E3: ' + text;
  dom.correctOverlay.className = 'correct-answer-overlay show';
  setTimeout(function() {
    dom.correctOverlay.className = 'correct-answer-overlay';
  }, 2000);
}

function handleEnemyDefeated() {
  state.enemiesDefeated++;
  var target = getTargetForStage(state.stage);
  var isBossKill = target.isBoss;

  seEnemyDown();
  var downText = state.gameMode === 'mining' ? 'MINED!' : (isBossKill ? 'DRAGON SLAIN!!' : 'ENEMY DOWN!');
  showEffect(downText, isBossKill ? 'boss-down' : 'down');
  dom.enemyChar.classList.add('dying');
  healPlayer(15);

  // Drop item
  setTimeout(function() {
    seItemGet();
    addItem(target.item);
    showEffect(target.item.emoji + ' GET!', 'item-get');
  }, 500);

  // Boss defeated = GAME CLEAR
  if (isBossKill) {
    state.isPaused = true;
    setTimeout(function() { handleGameClear(); }, 1500);
    return;
  }

  // Weapon upgrade every 2 defeats
  var shouldUpgrade = (state.enemiesDefeated % 2 === 0) && state.weaponLevel < WEAPONS.length - 1;

  state.isPaused = true;
  setTimeout(function() {
    // Weapon upgrade
    if (shouldUpgrade) {
      state.weaponLevel++;
      seWeaponUp();
      updateWeaponUI();
      showEffect('WEAPON UP!', 'weapon-up');
    }

    state.stage++;
    state.enemyMaxHP = getEnemyMaxHP(state.stage);
    state.enemyHP = state.enemyMaxHP;
    renderEnemy(state.stage);
    updateHPBars();
    dom.stageNum.textContent = state.stage;
    refreshBGM();

    state.isPaused = false;
    generateProblem();
    startTimer();
    focusInput();
  }, 1200);
}

function handleGameClear() {
  state.isGameOver = true;
  stopTimer();
  stopBGM();
  seGameClear();

  // Build item summary
  var itemSummary = '';
  if (state.items.length > 0) {
    var counts = {};
    state.items.forEach(function(item) {
      if (!counts[item.name]) counts[item.name] = { emoji: item.emoji, count: 0 };
      counts[item.name].count++;
    });
    itemSummary = '<br>ITEMS: ';
    for (var name in counts) {
      itemSummary += counts[name].emoji + 'x' + counts[name].count + ' ';
    }
  }

  // Calculate clear rank
  var rank = 'S';
  var accuracy = state.totalCorrect / Math.max(1, state.totalCorrect + state.totalWrong);
  if (accuracy >= 0.95 && state.playerHP >= 60) rank = 'S';
  else if (accuracy >= 0.85) rank = 'A';
  else if (accuracy >= 0.70) rank = 'B';
  else rank = 'C';

  dom.clearStats.innerHTML =
    '<span class="clear-rank rank-' + rank + '">RANK ' + rank + '</span><br><br>' +
    'STAGE: ' + state.stage + '<br>' +
    (state.gameMode === 'mining' ? 'BLOCKS MINED: ' : 'ENEMIES DEFEATED: ') + state.enemiesDefeated + '<br>' +
    'CORRECT: ' + state.totalCorrect + '<br>' +
    'WRONG: ' + state.totalWrong + '<br>' +
    'HP: ' + state.playerHP + '/' + state.playerMaxHP + '<br>' +
    'WEAPON: ' + getCurrentWeapon().emoji + ' ' + getCurrentWeapon().name +
    itemSummary;

  setTimeout(function() { showScreen('clear'); }, 1000);
}

function handleGameOver() {
  state.isGameOver = true;
  stopTimer();
  stopBGM();
  seGameOver();

  // Build item summary for results
  var itemSummary = '';
  if (state.items.length > 0) {
    var counts = {};
    state.items.forEach(function(item) {
      if (!counts[item.name]) counts[item.name] = { emoji: item.emoji, count: 0 };
      counts[item.name].count++;
    });
    itemSummary = '<br>ITEMS: ';
    for (var name in counts) {
      itemSummary += counts[name].emoji + 'x' + counts[name].count + ' ';
    }
  }

  dom.resultStats.innerHTML =
    'STAGE: ' + state.stage + '<br>' +
    (state.gameMode === 'mining' ? 'BLOCKS MINED: ' : 'ENEMIES DEFEATED: ') + state.enemiesDefeated + '<br>' +
    'CORRECT: ' + state.totalCorrect + '<br>' +
    'WRONG: ' + state.totalWrong + '<br>' +
    'WEAPON: ' + getCurrentWeapon().emoji + ' ' + getCurrentWeapon().name +
    itemSummary;
  setTimeout(function() { showScreen('gameover'); }, 800);
}

// ===== Special Attack =====
function useSpecial() {
  if (!state.specialReady || state.isGameOver || state.isPaused) return;
  state.specialReady = false;
  state.combo = 0;
  dom.comboNum.textContent = 0;
  updateSpecialUI();

  var specialDmg = 45 + state.stage * 5;
  seSpecialAttack();
  showEffect('SPECIAL!!', 'special');
  dom.playerChar.classList.add('special-glow');
  document.body.classList.add('bg-flash');

  setTimeout(function() {
    damageEnemy(specialDmg);
    dom.playerChar.classList.remove('special-glow');
    document.body.classList.remove('bg-flash');
    if (state.enemyHP <= 0) handleEnemyDefeated();
  }, 400);
}

function updateSpecialUI() {
  if (state.specialReady) {
    dom.specialNum.textContent = 'READY!';
    dom.specialStatus.classList.add('ready');
    dom.specialBtn.classList.add('ready');
    dom.specialBtn.disabled = false;
  } else {
    dom.specialNum.textContent = Math.min(state.combo, 3) + '/3';
    dom.specialStatus.classList.remove('ready');
    dom.specialBtn.classList.remove('ready');
    dom.specialBtn.disabled = true;
  }
}

// ===== UI =====
function showScreen(name) {
  dom.startScreen.classList.add('hidden');
  dom.gameScreen.classList.add('hidden');
  dom.gameoverScreen.classList.add('hidden');
  dom.clearScreen.classList.add('hidden');
  if (name === 'start')    dom.startScreen.classList.remove('hidden');
  if (name === 'game')     dom.gameScreen.classList.remove('hidden');
  if (name === 'gameover') dom.gameoverScreen.classList.remove('hidden');
  if (name === 'clear')    dom.clearScreen.classList.remove('hidden');
}

function focusInput() {
  var input = dom.answerInput;
  input.value = '';
  // readonly trick: iOS won't show autofill for readonly inputs
  input.setAttribute('readonly', 'readonly');
  setTimeout(function() {
    input.removeAttribute('readonly');
    input.focus();
  }, 60);
}

// ===== Game Init =====
function resetState() {
  state.stage = 1;
  state.playerHP = 100;
  state.playerMaxHP = 100;
  state.enemyMaxHP = getEnemyMaxHP(1);
  state.enemyHP = state.enemyMaxHP;
  state.combo = 0;
  state.specialReady = false;
  state.timeLimit = 15;
  state.remainingTime = 15;
  state.lastProblem = null;
  state.currentProblem = null;
  state.isGameOver = false;
  state.isPaused = false;
  state.enemiesDefeated = 0;
  state.totalCorrect = 0;
  state.totalWrong = 0;
  state.items = [];
  state.weaponLevel = 0;
}

function startGame() {
  // Resume audio from user gesture (click), then start BGM
  resumeAudio().then(function() {
    if (state.bgmOn) startBGM();
  });

  resetState();
  renderEnemy(state.stage);
  updateHPBars();
  dom.stageNum.textContent = state.stage;
  updateSpecialUI();
  dom.comboNum.textContent = 0;
  renderItems();
  updateWeaponUI();

  showScreen('game');
  generateProblem();
  startTimer();
  focusInput();
}

// ===== Submit =====
function submitAnswer() {
  if (state.isGameOver || state.isPaused) return;
  var val = dom.answerInput.value.replace(/[^0-9]/g, '').trim();
  if (val === '') return;
  var num = parseInt(val, 10);
  if (isNaN(num)) { dom.answerInput.value = ''; return; }
  if (num === state.currentProblem.answer) handleCorrect();
  else handleWrong();
}

// ===== Event Listeners =====
dom.startBtn.addEventListener('click', startGame);
dom.retryBtn.addEventListener('click', startGame);
dom.clearRetryBtn.addEventListener('click', startGame);
dom.submitBtn.addEventListener('click', submitAnswer);
dom.specialBtn.addEventListener('click', useSpecial);

// Mode selection
dom.modeBattle.addEventListener('click', function() {
  state.gameMode = 'battle';
  dom.modeBattle.classList.add('selected');
  dom.modeMining.classList.remove('selected');
});
dom.modeMining.addEventListener('click', function() {
  state.gameMode = 'mining';
  dom.modeMining.classList.add('selected');
  dom.modeBattle.classList.remove('selected');
});

// Form submit (Enter key on mobile/desktop)
dom.answerForm.addEventListener('submit', function(e) {
  e.preventDefault();
  submitAnswer();
});

dom.bgmToggle.addEventListener('click', function() {
  resumeAudio().then(function() {
    toggleBGM();
  });
});
dom.volumeSlider.addEventListener('input', function(e) {
  setVolume(e.target.value / 100);
});

// Space key for special (PC)
document.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && state.specialReady && !state.isGameOver && !state.isPaused) {
    e.preventDefault();
    useSpecial();
  }
});

// Prevent zoom on double tap (mobile)
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Keyboard open/close: keep input visible
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', function() {
    if (document.activeElement && document.activeElement.id === 'answer-input') {
      setTimeout(function() {
        document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 100);
    }
  });
}

// ===== Global audio unlock for mobile =====
// iOS Safari requires AudioContext.resume() from a user gesture (touchend/click).
// touchstart alone is NOT reliable on iOS for audio unlock.
function unlockAudio() {
  resumeAudio();
  document.removeEventListener('touchend', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);

// ===== Init =====
renderEnemy(1); // Render initial enemy immediately
showScreen('start');
