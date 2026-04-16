'use strict';

const VOCALI = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTI = ['b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
const MESSAGGI = [
  'Bravo! Hai indovinato! 🎉',
  'Fantastico! Sei bravissimo! ⭐',
  'Ottimo lavoro! 🏆',
  'Perfetto! Continua così! 🌟',
  'Sei un campione! 🥇',
  'Straordinario! 🎊',
  'Incredibile! Grandissimo! 🌈',
];
const CONFETTI_COLORS = ['#FF6584','#6C63FF','#48BB78','#F6AD55','#63B3ED','#FC8181','#68D391'];

// ── Stato ──────────────────────────────────────────────────────────────────
let selectedConsonants = [];
let syllables          = [];
let mysterySyllable    = '';
let won                = false;
let italianVoice       = null;

// ── TTS ────────────────────────────────────────────────────────────────────
function initVoices() {
  function load() {
    const voices = window.speechSynthesis.getVoices();
    italianVoice = voices.find(v => v.lang.startsWith('it')) || null;
  }
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'it-IT';
  utt.rate  = 0.82;
  utt.pitch = 1.1;
  if (italianVoice) utt.voice = italianVoice;
  window.speechSynthesis.speak(utt);
}

// ── Setup ──────────────────────────────────────────────────────────────────
function buildConsonantGrid() {
  const grid = document.getElementById('consonant-grid');
  grid.innerHTML = '';
  CONSONANTI.forEach(c => {
    const btn = document.createElement('button');
    btn.className   = 'consonant-btn';
    btn.textContent = c.toUpperCase();
    btn.dataset.letter = c;
    btn.addEventListener('click', () => toggleConsonant(c, btn));
    grid.appendChild(btn);
  });
}

function toggleConsonant(letter, btn) {
  if (selectedConsonants.includes(letter)) {
    // deseleziona
    selectedConsonants = selectedConsonants.filter(c => c !== letter);
    btn.classList.remove('selected');
  } else {
    if (selectedConsonants.length >= 2) return;
    selectedConsonants.push(letter);
    btn.classList.add('selected');
  }
  refreshConsonantGrid();
  refreshSelectedDisplay();
  document.getElementById('play-btn').disabled = selectedConsonants.length !== 2;
}

function refreshConsonantGrid() {
  document.querySelectorAll('.consonant-btn').forEach(btn => {
    const letter = btn.dataset.letter;
    const full   = selectedConsonants.length === 2 && !selectedConsonants.includes(letter);
    btn.classList.toggle('maxed', full);
  });
}

function refreshSelectedDisplay() {
  const c1 = document.getElementById('cons1');
  const c2 = document.getElementById('cons2');
  if (selectedConsonants[0]) {
    c1.textContent = selectedConsonants[0].toUpperCase();
    c1.classList.remove('empty');
  } else {
    c1.textContent = '?';
    c1.classList.add('empty');
  }
  if (selectedConsonants[1]) {
    c2.textContent = selectedConsonants[1].toUpperCase();
    c2.classList.remove('empty');
  } else {
    c2.textContent = '?';
    c2.classList.add('empty');
  }
}

// ── Game start ─────────────────────────────────────────────────────────────
function startGame() {
  // Genera le 10 sillabe
  syllables = [];
  selectedConsonants.forEach(c => {
    VOCALI.forEach(v => syllables.push(c + v));
  });

  // Sillaba misteriosa casuale
  mysterySyllable = syllables[Math.floor(Math.random() * syllables.length)];
  won = false;

  // Costruisce la griglia
  buildSyllableGrid();

  // Reset mystery box
  const icon = document.getElementById('mystery-icon');
  const box  = document.getElementById('mystery-box');
  icon.textContent = '?';
  box.classList.remove('revealed');

  // Reset messaggi
  document.getElementById('message').classList.add('hidden');
  document.getElementById('new-game-btn').classList.add('hidden');

  // Sottotitolo
  document.getElementById('game-subtitle').textContent =
    selectedConsonants.map(c => c.toUpperCase()).join(' + ');

  // Cambia schermata
  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
}

// ── Griglia sillabe ────────────────────────────────────────────────────────
function buildSyllableGrid() {
  const grid = document.getElementById('syllable-grid');
  grid.innerHTML = '';

  syllables.forEach((syl, idx) => {
    const btn = document.createElement('button');
    const row = Math.floor(idx / 5); // 0 = prima consonante, 1 = seconda
    btn.className   = `syllable-btn row-${row}`;
    btn.textContent = syl.toUpperCase();
    btn.dataset.syllable = syl;
    btn.addEventListener('click', () => onSyllableClick(syl, btn));
    grid.appendChild(btn);
  });
}

// ── Logica di gioco ────────────────────────────────────────────────────────
function onMysteryClick() {
  speak(mysterySyllable);
}

function onSyllableClick(syllable, btn) {
  if (won || btn.disabled) return;

  speak(syllable);

  if (syllable === mysterySyllable) {
    won = true;
    btn.classList.add('correct');

    // Rivela la casella misteriosa
    const icon = document.getElementById('mystery-icon');
    const box  = document.getElementById('mystery-box');
    icon.textContent = mysterySyllable.toUpperCase();
    box.classList.add('revealed');
    box.style.animation = 'none'; // ferma il pulse

    showWinMessage();
    launchConfetti();
  } else {
    btn.classList.add('wrong', 'shake');
    btn.disabled = true;
    setTimeout(() => btn.classList.remove('shake'), 500);
  }
}

function showWinMessage() {
  const el  = document.getElementById('message');
  const msg = MESSAGGI[Math.floor(Math.random() * MESSAGGI.length)];
  el.textContent = msg;
  el.classList.remove('hidden');
  // Re-trigger animation
  void el.offsetWidth;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  document.getElementById('new-game-btn').classList.remove('hidden');
}

// ── Confetti ───────────────────────────────────────────────────────────────
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const N = 90;
  for (let i = 0; i < N; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = Math.random() * 9 + 6;
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      width: ${size}px;
      height: ${size * (Math.random() < 0.5 ? 1 : 2.2)}px;
      background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      animation-delay: ${(Math.random() * 0.6).toFixed(2)}s;
      animation-duration: ${(Math.random() * 1.2 + 1.6).toFixed(2)}s;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() < 0.4 ? '50%' : '3px'};
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ── Navigazione ────────────────────────────────────────────────────────────
function backToSetup() {
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('setup-screen').classList.add('active');
}

function newGame() {
  startGame();
}

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  initVoices();
  buildConsonantGrid();

  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('mystery-box').addEventListener('click', onMysteryClick);
  document.getElementById('back-btn').addEventListener('click', backToSetup);
  document.getElementById('new-game-btn').addEventListener('click', newGame);
}

document.addEventListener('DOMContentLoaded', init);
