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
};

// ===== Enemy Mob Types =====
const MOB_TYPES = [
  {
    minStage: 1,
    name: 'SLIME', cssClass: 'mob-slime',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div>'
  },
  {
    minStage: 3,
    name: 'ZOMBIE', cssClass: 'mob-zombie',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-arms"><div class="enemy-arm"></div><div class="enemy-torso"></div><div class="enemy-arm"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 6,
    name: 'SKELETON', cssClass: 'mob-skeleton',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-arms"><div class="enemy-arm"></div><div class="enemy-torso"></div><div class="enemy-arm"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 10,
    name: 'SPIDER', cssClass: 'mob-spider',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 15,
    name: 'CREEPER', cssClass: 'mob-creeper',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 20,
    name: 'ENDERMAN', cssClass: 'mob-enderman',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div></div><div class="enemy-arms"><div class="enemy-arm"></div><div class="enemy-torso"></div><div class="enemy-arm"></div></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 25,
    name: 'BLAZE', cssClass: 'mob-blaze',
    html: '<div class="enemy-head"><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
  {
    minStage: 30,
    name: 'WITHER', cssClass: 'mob-wither',
    html: '<div class="enemy-head"><div class="enemy-horn"></div><div class="enemy-eye left-eye"></div><div class="enemy-eye right-eye"></div><div class="enemy-mouth"></div></div><div class="enemy-body"></div><div class="enemy-legs"><div class="enemy-leg"></div><div class="enemy-leg"></div></div>'
  },
];

function getMobForStage(stage) {
  let mob = MOB_TYPES[0];
  for (let i = 0; i < MOB_TYPES.length; i++) {
    if (stage >= MOB_TYPES[i].minStage) mob = MOB_TYPES[i];
  }
  return mob;
}

function renderEnemy(stage) {
  const mob = getMobForStage(stage);
  const el = dom.enemyChar;
  // Remove all mob classes
  MOB_TYPES.forEach(function(m) { el.classList.remove(m.cssClass); });
  // Add new mob class and set HTML
  el.classList.remove('dying');
  el.classList.add(mob.cssClass);
  el.innerHTML = mob.html;
  dom.enemyLabel.textContent = mob.name + ' Lv.' + stage;
}

// ===== Audio Engine (Web Audio API) =====
let audioCtx = null;
let bgmInterval = null;
let masterGain = null;

function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return; // AudioContext not supported
    }
    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.volume;
    masterGain.connect(audioCtx.destination);
  }
  // iOS/Android: AudioContext starts 'suspended' until user gesture
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function setVolume(v) {
  state.volume = v;
  if (masterGain) masterGain.gain.value = v;
}

function ensureAudioResumed() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// --- Synth helpers ---
function playTone(freq, duration, type, vol, delay) {
  if (!audioCtx) return;
  ensureAudioResumed();
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
  if (!audioCtx) return;
  ensureAudioResumed();
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
function seGameOver() {
  playTone(392, 0.3, 'sawtooth', 0.25);
  playTone(330, 0.3, 'sawtooth', 0.25, 0.3);
  playTone(262, 0.5, 'sawtooth', 0.25, 0.6);
}

// --- BGM Loop ---
var bgmNotes = [
  523, 587, 659, 784, 880, 784, 659, 587,
  523, 659, 784, 880, 1047, 880, 784, 659,
  523, 523, 659, 659, 784, 784, 880, 880,
  784, 659, 523, 587, 659, 784, 659, 523,
];
var bgmBass = [
  262, 262, 330, 330, 392, 392, 440, 440,
  262, 262, 330, 330, 392, 392, 440, 440,
  349, 349, 392, 392, 440, 440, 523, 523,
  349, 330, 262, 262, 330, 392, 330, 262,
];
var bgmStep = 0;

function startBGM() {
  if (!audioCtx || bgmInterval) return;
  bgmStep = 0;
  bgmInterval = setInterval(function() {
    if (!state.bgmOn) return;
    var idx = bgmStep % bgmNotes.length;
    playTone(bgmNotes[idx], 0.12, 'square', 0.08);
    playTone(bgmBass[idx], 0.12, 'triangle', 0.06);
    if (bgmStep % 4 === 0) playNoise(0.05, 0.04);
    bgmStep++;
  }, 160);
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
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
  var reduction = Math.floor(state.enemiesDefeated / 5);
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
  return baseDamage + speedBonus;
}

function damageEnemy(dmg) {
  state.enemyHP = Math.max(0, state.enemyHP - dmg);
  updateHPBars();
  showDamageNumber(dmg, false);
  dom.playerChar.classList.add('attacking');
  dom.enemyChar.classList.add('hit');
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
  showEffect('HIT!', 'hit');
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
  generateProblem();
  startTimer();
  focusInput();
}

function handleEnemyDefeated() {
  state.enemiesDefeated++;
  seEnemyDown();
  showEffect('ENEMY DOWN!', 'down');
  dom.enemyChar.classList.add('dying');
  healPlayer(15);

  state.isPaused = true;
  setTimeout(function() {
    state.stage++;
    state.enemyMaxHP = 60 + state.stage * 12;
    state.enemyHP = state.enemyMaxHP;
    renderEnemy(state.stage);
    updateHPBars();
    dom.stageNum.textContent = state.stage;

    state.isPaused = false;
    generateProblem();
    startTimer();
    focusInput();
  }, 1200);
}

function handleGameOver() {
  state.isGameOver = true;
  stopTimer();
  stopBGM();
  seGameOver();
  dom.resultStats.innerHTML =
    'STAGE: ' + state.stage + '<br>' +
    'ENEMIES DEFEATED: ' + state.enemiesDefeated + '<br>' +
    'CORRECT: ' + state.totalCorrect + '<br>' +
    'WRONG: ' + state.totalWrong;
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
  if (name === 'start')    dom.startScreen.classList.remove('hidden');
  if (name === 'game')     dom.gameScreen.classList.remove('hidden');
  if (name === 'gameover') dom.gameoverScreen.classList.remove('hidden');
}

function focusInput() {
  dom.answerInput.value = '';
  setTimeout(function() { dom.answerInput.focus(); }, 50);
}

// ===== Game Init =====
function resetState() {
  state.stage = 1;
  state.playerHP = 100;
  state.playerMaxHP = 100;
  state.enemyMaxHP = 60 + 1 * 12;
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
}

function startGame() {
  initAudio();
  resetState();
  renderEnemy(state.stage);
  updateHPBars();
  dom.stageNum.textContent = state.stage;
  updateSpecialUI();
  dom.comboNum.textContent = 0;

  showScreen('game');
  generateProblem();
  startTimer();
  focusInput();

  if (state.bgmOn) startBGM();
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
dom.submitBtn.addEventListener('click', submitAnswer);
dom.specialBtn.addEventListener('click', useSpecial);

// Form submit (Enter key on mobile/desktop)
dom.answerForm.addEventListener('submit', function(e) {
  e.preventDefault();
  submitAnswer();
});

dom.bgmToggle.addEventListener('click', function() {
  initAudio();
  toggleBGM();
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
// iOS Safari requires AudioContext.resume() from a direct user gesture.
// We attach handlers to the first touch/click to unlock audio early.
function unlockAudio() {
  initAudio();
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('touchend', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);

// ===== Init =====
renderEnemy(1); // Render initial enemy immediately
showScreen('start');
