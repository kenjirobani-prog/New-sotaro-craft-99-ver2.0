/* ============================================
   Sotaro craft 99 - Game Logic
   九九バトルゲーム (Web Audio API / State管理)
   ============================================ */

// ===== State =====
const state = {
  stage: 1,
  playerHP: 100,
  playerMaxHP: 100,
  enemyHP: 72,       // 60 + stage*12
  enemyMaxHP: 72,
  combo: 0,
  specialReady: false,
  timeLimit: 15,
  remainingTime: 15,
  lastProblem: null,  // {a, b}
  currentProblem: null, // {a, b, answer}
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
  submitBtn:     $('submit-btn'),
  specialBtn:    $('special-btn'),
  resultStats:   $('result-stats'),
};

// ===== Audio Engine (Web Audio API) =====
let audioCtx = null;
let bgmInterval = null;
let masterGain = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = state.volume;
  masterGain.connect(audioCtx.destination);
}

function setVolume(v) {
  state.volume = v;
  if (masterGain) masterGain.gain.value = v;
}

// --- Synth helpers ---
function playTone(freq, duration, type = 'square', vol = 0.3, delay = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

function playNoise(duration, vol = 0.15) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * vol;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(gain);
  gain.connect(masterGain);
  source.start();
}

// --- SE: Correct ---
function seCorrect() {
  playTone(523, 0.1, 'square', 0.25);
  playTone(659, 0.1, 'square', 0.25, 0.08);
  playTone(784, 0.15, 'square', 0.25, 0.16);
}

// --- SE: Wrong ---
function seWrong() {
  playTone(200, 0.15, 'sawtooth', 0.25);
  playTone(150, 0.2, 'sawtooth', 0.25, 0.12);
}

// --- SE: Special Ready ---
function seSpecialReady() {
  playTone(587, 0.1, 'square', 0.3);
  playTone(740, 0.1, 'square', 0.3, 0.1);
  playTone(880, 0.15, 'square', 0.3, 0.2);
  playTone(1175, 0.2, 'triangle', 0.3, 0.3);
}

// --- SE: Special Attack ---
function seSpecialAttack() {
  playTone(440, 0.08, 'square', 0.35);
  playTone(554, 0.08, 'square', 0.35, 0.06);
  playTone(659, 0.08, 'square', 0.35, 0.12);
  playTone(880, 0.1, 'square', 0.35, 0.18);
  playTone(1109, 0.15, 'square', 0.35, 0.25);
  playTone(1318, 0.25, 'triangle', 0.35, 0.32);
  playNoise(0.3, 0.1);
}

// --- SE: Enemy Down ---
function seEnemyDown() {
  playTone(523, 0.12, 'square', 0.3);
  playTone(659, 0.12, 'square', 0.3, 0.1);
  playTone(784, 0.12, 'square', 0.3, 0.2);
  playTone(1047, 0.3, 'square', 0.3, 0.3);
}

// --- SE: Game Over ---
function seGameOver() {
  playTone(392, 0.3, 'sawtooth', 0.25);
  playTone(330, 0.3, 'sawtooth', 0.25, 0.3);
  playTone(262, 0.5, 'sawtooth', 0.25, 0.6);
}

// --- BGM Loop ---
const bgmNotes = [
  // Happy chiptune melody (C major pentatonic with rhythm)
  523, 587, 659, 784, 880, 784, 659, 587,
  523, 659, 784, 880, 1047, 880, 784, 659,
  523, 523, 659, 659, 784, 784, 880, 880,
  784, 659, 523, 587, 659, 784, 659, 523,
];
const bgmBass = [
  262, 262, 330, 330, 392, 392, 440, 440,
  262, 262, 330, 330, 392, 392, 440, 440,
  349, 349, 392, 392, 440, 440, 523, 523,
  349, 330, 262, 262, 330, 392, 330, 262,
];

let bgmStep = 0;

function startBGM() {
  if (!audioCtx || bgmInterval) return;
  bgmStep = 0;
  bgmInterval = setInterval(() => {
    if (!state.bgmOn) return;
    const noteIdx = bgmStep % bgmNotes.length;
    playTone(bgmNotes[noteIdx], 0.12, 'square', 0.08);
    playTone(bgmBass[noteIdx], 0.12, 'triangle', 0.06);
    // Simple drum-like noise on every 4th beat
    if (bgmStep % 4 === 0) {
      playNoise(0.05, 0.04);
    }
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
  if (state.bgmOn) {
    startBGM();
  } else {
    stopBGM();
  }
}

// ===== Timer =====
let timerInterval = null;
const TIMER_TICK = 100; // ms

function getTimeLimitForStage() {
  // 敵5体毎に1秒ずつ減少、下限5秒
  const reduction = Math.floor(state.enemiesDefeated / 5);
  return Math.max(5, 15 - reduction);
}

function startTimer() {
  stopTimer();
  state.timeLimit = getTimeLimitForStage();
  state.remainingTime = state.timeLimit;
  updateTimerUI();

  timerInterval = setInterval(() => {
    if (state.isGameOver || state.isPaused) return;
    state.remainingTime = Math.max(0, state.remainingTime - TIMER_TICK / 1000);
    updateTimerUI();
    if (state.remainingTime <= 0) {
      // Time's up - treat as wrong
      handleWrong();
    }
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
  const pct = (state.remainingTime / state.timeLimit) * 100;
  dom.timerBar.style.width = pct + '%';
  // Color urgency
  if (pct < 25) {
    dom.timeNum.style.color = '#ef4444';
  } else if (pct < 50) {
    dom.timeNum.style.color = '#fbbf24';
  } else {
    dom.timeNum.style.color = '#fff';
  }
}

// ===== Problem Generation =====
function generateProblem() {
  let a, b;
  do {
    a = Math.floor(Math.random() * 9) + 1;
    b = Math.floor(Math.random() * 9) + 1;
  } while (state.lastProblem && state.lastProblem.a === a && state.lastProblem.b === b);

  state.lastProblem = { a, b };
  state.currentProblem = { a, b, answer: a * b };
  dom.questionText.textContent = `${a} × ${b} = ?`;
}

// ===== Damage & Battle =====
function calcDamageToEnemy() {
  const baseDamage = 10;
  const speedBonus = Math.floor((state.remainingTime / state.timeLimit) * 15);
  return baseDamage + speedBonus;
}

function damageEnemy(dmg) {
  state.enemyHP = Math.max(0, state.enemyHP - dmg);
  updateHPBars();
  showDamageNumber(dmg, false);
  // Attack animation
  dom.playerChar.classList.add('attacking');
  dom.enemyChar.classList.add('hit');
  setTimeout(() => {
    dom.playerChar.classList.remove('attacking');
    dom.enemyChar.classList.remove('hit');
  }, 300);
}

function damagePlayer(dmg) {
  state.playerHP = Math.max(0, state.playerHP - dmg);
  updateHPBars();
  showDamageNumber(dmg, true);
  dom.playerChar.classList.add('hit');
  setTimeout(() => {
    dom.playerChar.classList.remove('hit');
  }, 300);
}

function healPlayer(amount) {
  state.playerHP = Math.min(state.playerMaxHP, state.playerHP + amount);
  updateHPBars();
}

function updateHPBars() {
  const playerPct = (state.playerHP / state.playerMaxHP) * 100;
  const enemyPct = (state.enemyHP / state.enemyMaxHP) * 100;
  dom.playerHpBar.style.width = playerPct + '%';
  dom.enemyHpBar.style.width = enemyPct + '%';
  dom.playerHpText.textContent = `${state.playerHP}/${state.playerMaxHP}`;
  dom.enemyHpText.textContent = `${state.enemyHP}/${state.enemyMaxHP}`;
}

// ===== Show Effects =====
function showEffect(text, className) {
  dom.effectText.textContent = text;
  dom.effectText.className = 'effect-text show ' + className;
  setTimeout(() => {
    dom.effectText.className = 'effect-text';
  }, 900);
}

function showDamageNumber(value, isPlayerDmg) {
  dom.damageNumber.textContent = '-' + value;
  dom.damageNumber.className = 'damage-number show' + (isPlayerDmg ? ' player-dmg' : '');
  setTimeout(() => {
    dom.damageNumber.className = 'damage-number';
  }, 800);
}

// ===== Answer Handling =====
function handleCorrect() {
  stopTimer();
  state.totalCorrect++;
  state.combo++;

  const dmg = calcDamageToEnemy();
  seCorrect();
  showEffect('HIT!', 'hit');
  damageEnemy(dmg);

  dom.comboNum.textContent = state.combo;

  // Check special
  if (state.combo >= 3 && !state.specialReady) {
    state.specialReady = true;
    updateSpecialUI();
    seSpecialReady();
  }

  // Check enemy defeated
  if (state.enemyHP <= 0) {
    handleEnemyDefeated();
    return;
  }

  // Next problem
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

  // Check game over
  if (state.playerHP <= 0) {
    handleGameOver();
    return;
  }

  // Next problem
  generateProblem();
  startTimer();
  focusInput();
}

function handleEnemyDefeated() {
  state.enemiesDefeated++;
  seEnemyDown();
  showEffect('ENEMY DOWN!', 'down');
  dom.enemyChar.classList.add('dying');

  // Heal player
  healPlayer(15);

  // Advance stage
  state.isPaused = true;
  setTimeout(() => {
    state.stage++;
    state.enemyMaxHP = 60 + state.stage * 12;
    state.enemyHP = state.enemyMaxHP;
    dom.enemyChar.classList.remove('dying');
    updateHPBars();
    updateStageUI();

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
    `STAGE: ${state.stage}<br>` +
    `ENEMIES DEFEATED: ${state.enemiesDefeated}<br>` +
    `CORRECT: ${state.totalCorrect}<br>` +
    `WRONG: ${state.totalWrong}`;

  setTimeout(() => {
    showScreen('gameover');
  }, 800);
}

// ===== Special Attack =====
function useSpecial() {
  if (!state.specialReady || state.isGameOver || state.isPaused) return;

  state.specialReady = false;
  state.combo = 0;
  dom.comboNum.textContent = 0;
  updateSpecialUI();

  const specialDmg = 45 + state.stage * 5;

  // Effects
  seSpecialAttack();
  showEffect('SPECIAL!!', 'special');
  dom.playerChar.classList.add('special-glow');
  document.body.classList.add('bg-flash');

  setTimeout(() => {
    damageEnemy(specialDmg);
    dom.playerChar.classList.remove('special-glow');
    document.body.classList.remove('bg-flash');

    // Check enemy defeated
    if (state.enemyHP <= 0) {
      handleEnemyDefeated();
    }
  }, 400);
}

function updateSpecialUI() {
  if (state.specialReady) {
    dom.specialNum.textContent = 'READY!';
    dom.specialStatus.classList.add('ready');
    dom.specialBtn.classList.add('ready');
    dom.specialBtn.disabled = false;
  } else {
    const display = Math.min(state.combo, 3);
    dom.specialNum.textContent = display + '/3';
    dom.specialStatus.classList.remove('ready');
    dom.specialBtn.classList.remove('ready');
    dom.specialBtn.disabled = true;
  }
}

// ===== UI Updates =====
function updateStageUI() {
  dom.stageNum.textContent = state.stage;
  dom.enemyLabel.textContent = 'ENEMY ' + state.stage;
  // Change enemy color based on stage
  const hue = (state.stage * 37) % 360;
  const enemyHead = dom.enemyChar.querySelector('.enemy-head');
  const enemyBody = dom.enemyChar.querySelector('.enemy-body');
  const enemyLegs = dom.enemyChar.querySelectorAll('.enemy-leg');
  const color = `hsl(${hue}, 60%, 45%)`;
  const dark = `hsl(${hue}, 60%, 25%)`;
  if (enemyHead) {
    enemyHead.style.background = color;
    enemyHead.style.borderColor = dark;
  }
  if (enemyBody) {
    enemyBody.style.background = color;
    enemyBody.style.borderColor = dark;
  }
  enemyLegs.forEach(l => {
    l.style.background = color;
    l.style.borderColor = dark;
  });
}

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
  // Small delay to prevent keyboard issues on mobile
  setTimeout(() => {
    dom.answerInput.focus();
  }, 50);
}

// ===== Game Init & Start =====
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
  updateHPBars();
  updateStageUI();
  updateSpecialUI();
  dom.comboNum.textContent = 0;
  // Reset enemy appearance
  const enemyHead = dom.enemyChar.querySelector('.enemy-head');
  const enemyBody = dom.enemyChar.querySelector('.enemy-body');
  const enemyLegs = dom.enemyChar.querySelectorAll('.enemy-leg');
  if (enemyHead) {
    enemyHead.style.background = '';
    enemyHead.style.borderColor = '';
  }
  if (enemyBody) {
    enemyBody.style.background = '';
    enemyBody.style.borderColor = '';
  }
  enemyLegs.forEach(l => {
    l.style.background = '';
    l.style.borderColor = '';
  });
  dom.enemyChar.classList.remove('dying');

  showScreen('game');
  generateProblem();
  startTimer();
  focusInput();

  if (state.bgmOn) startBGM();
}

// ===== Submit Answer =====
function submitAnswer() {
  if (state.isGameOver || state.isPaused) return;
  const val = dom.answerInput.value.trim();
  if (val === '') return;

  const num = parseInt(val, 10);
  if (isNaN(num)) {
    dom.answerInput.value = '';
    return;
  }

  if (num === state.currentProblem.answer) {
    handleCorrect();
  } else {
    handleWrong();
  }
}

// ===== Event Listeners =====
dom.startBtn.addEventListener('click', startGame);
dom.retryBtn.addEventListener('click', startGame);
dom.submitBtn.addEventListener('click', submitAnswer);
dom.specialBtn.addEventListener('click', useSpecial);
dom.bgmToggle.addEventListener('click', () => {
  initAudio();
  toggleBGM();
});
dom.volumeSlider.addEventListener('input', (e) => {
  setVolume(e.target.value / 100);
});

dom.answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitAnswer();
  }
});

// Space key for special (PC)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && state.specialReady && !state.isGameOver && !state.isPaused) {
    e.preventDefault();
    useSpecial();
  }
});

// Prevent zoom on double tap (mobile)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Handle visualViewport resize (keyboard open/close)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    // Scroll to keep input visible
    const activeEl = document.activeElement;
    if (activeEl && activeEl.id === 'answer-input') {
      setTimeout(() => {
        activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }
  });
}

// ===== Init =====
showScreen('start');
