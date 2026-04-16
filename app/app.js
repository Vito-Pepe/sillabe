'use strict';

// ── Costanti ───────────────────────────────────────────────────────────────
// Le cinque vocali italiane usate per costruire tutte le sillabe possibili
const VOCALI = ['a', 'e', 'i', 'o', 'u'];

// Consonanti disponibili nella griglia di selezione
const CONSONANTI = ['b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];

// Fonemi italiani: combinazioni di più lettere che producono un unico suono.
// Trattati come una singola unità selezionabile, al pari delle consonanti.
const FONEMI = ['gi'];

// Messaggi di congratulazioni mostrati a rotazione casuale quando il bambino indovina
const MESSAGGI = [
  'Bravo! Hai indovinato! 🎉',
  'Fantastico! Sei bravissimo! ⭐',
  'Ottimo lavoro! 🏆',
  'Perfetto! Continua così! 🌟',
  'Sei un campione! 🥇',
  'Straordinario! 🎊',
  'Incredibile! Grandissimo! 🌈',
];

// Palette di colori usata per i coriandoli dell'animazione di vittoria
const CONFETTI_COLORS = ['#FF6584','#6C63FF','#48BB78','#F6AD55','#63B3ED','#FC8181','#68D391'];

// ── Stato dell'applicazione ────────────────────────────────────────────────
// Le due consonanti scelte dal giocatore nella schermata di setup (max 2)
let selectedConsonants = [];

// Array con le 10 sillabe generate (2 basi × 5 vocali)
let syllables          = [];

// La sillaba segreta che il giocatore deve indovinare
let mysterySyllable    = '';

// Flag che diventa true quando il giocatore ha indovinato, blocca ulteriori click
let won                = false;

// Riferimento alla voce italiana della Web Speech API, caricato in modo asincrono
let italianVoice       = null;

// ── Sintesi vocale (TTS) ───────────────────────────────────────────────────

/**
 * Cerca e memorizza la voce italiana tra quelle disponibili nel browser.
 * Le voci vengono caricate in modo asincrono, quindi si tenta subito (load())
 * e si registra anche il callback onvoiceschanged per quando arrivano in ritardo.
 */
function initVoices() {
  function load() {
    const voices = window.speechSynthesis.getVoices();
    // Cerca la prima voce che inizia con 'it' (es. it-IT, it-CH…)
    italianVoice = voices.find(v => v.lang.startsWith('it')) || null;
  }
  load();
  // Chrome carica le voci in modo asincrono: questo evento si attiva quando sono pronte
  window.speechSynthesis.onvoiceschanged = load;
}

/**
 * Pronuncia il testo passato usando la sintesi vocale del browser.
 * Cancella eventuale audio in corso prima di iniziare, per evitare sovrapposizioni.
 * @param {string} text - La sillaba (o parola) da pronunciare
 */
function speak(text) {
  if (!window.speechSynthesis) return; // browser senza supporto TTS

  window.speechSynthesis.cancel(); // interrompe qualsiasi pronuncia precedente

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'it-IT'; // forza la lingua italiana anche se la voce non è stata trovata
  utt.rate  = 0.82;    // leggermente più lento del normale, più comprensibile per i bambini
  utt.pitch = 1.1;     // tono leggermente più acuto, più coinvolgente per i piccoli
  if (italianVoice) utt.voice = italianVoice; // usa la voce italiana se disponibile
  window.speechSynthesis.speak(utt);
}

// ── Generazione sillabe ────────────────────────────────────────────────────

/**
 * Dato un elemento base (consonante singola o fonema), restituisce le 5 sillabe
 * ottenute combinandolo con le vocali.
 *
 * Caso normale (consonante):  "b" → ["ba","be","bi","bo","bu"]
 * Caso fonema con vocale finale: "gi" termina con "i", quindi:
 *   "gi"+"i" → "gi" (evita "gii"), tutte le altre → "gia","gie","gio","giu"
 *
 * Regola generale: se la base termina già con la vocale corrente, non la appende.
 * @param {string} base - Consonante (es. "b") o fonema (es. "gi")
 * @returns {string[]} Array di 5 sillabe
 */
function buildSyllables(base) {
  return VOCALI.map(v => base.endsWith(v) ? base : base + v);
}

// ── Schermata di setup ─────────────────────────────────────────────────────

/**
 * Costruisce dinamicamente la griglia dei pulsanti consonante.
 * Svuota il contenitore e ricrea tutti i bottoni da CONSONANTI,
 * collegando a ciascuno il listener per toggleConsonant.
 */
function buildConsonantGrid() {
  const grid = document.getElementById('consonant-grid');
  grid.innerHTML = ''; // pulizia preventiva

  CONSONANTI.forEach(c => {
    const btn = document.createElement('button');
    btn.className   = 'consonant-btn';
    btn.textContent = c.toUpperCase(); // visualizza la lettera maiuscola
    btn.dataset.letter = c;            // salva la lettera minuscola nel dataset per il confronto
    btn.addEventListener('click', () => toggleConsonant(c, btn));
    grid.appendChild(btn);
  });
}

/**
 * Costruisce la griglia dei pulsanti fonema (es. "GI").
 * I fonemi condividono la stessa logica di selezione delle consonanti:
 * cliccando un fonema si chiama toggleConsonant() con la stringa multi-carattere.
 */
function buildFonemiGrid() {
  const grid = document.getElementById('fonemi-grid');
  grid.innerHTML = '';
  FONEMI.forEach(f => {
    const btn = document.createElement('button');
    btn.className      = 'fonema-btn';
    btn.textContent    = f.toUpperCase(); // es. "GI"
    btn.dataset.letter = f;              // stringa usata da toggleConsonant e refreshConsonantGrid
    btn.addEventListener('click', () => toggleConsonant(f, btn));
    grid.appendChild(btn);
  });
}

/**
 * Seleziona o deseleziona una consonante (o fonema) quando l'utente clicca il suo bottone.
 * Non permette di selezionare più di 2 elementi contemporaneamente.
 * Dopo ogni modifica aggiorna entrambe le griglie e il display delle scelte.
 * @param {string} letter - La consonante/fonema cliccata (es. "b" o "gi")
 * @param {HTMLElement} btn - Il bottone corrispondente nel DOM
 */
function toggleConsonant(letter, btn) {
  if (selectedConsonants.includes(letter)) {
    // Già selezionata → deseleziona rimuovendola dall'array e dal CSS
    selectedConsonants = selectedConsonants.filter(c => c !== letter);
    btn.classList.remove('selected');
  } else {
    if (selectedConsonants.length >= 2) return; // già 2 scelte, ignora
    selectedConsonants.push(letter);
    btn.classList.add('selected');
  }
  refreshConsonantGrid();
  refreshSelectedDisplay();
  // Il pulsante "Gioca!" è attivo solo quando sono selezionate esattamente 2 consonanti
  document.getElementById('play-btn').disabled = selectedConsonants.length !== 2;
}

/**
 * Aggiorna l'aspetto visivo della griglia consonanti:
 * se sono già state scelte 2 consonanti, le rimanenti appaiono sbiadite
 * (classe 'maxed') e non sono cliccabili.
 */
function refreshConsonantGrid() {
  // Aggiorna sia i bottoni consonante che quelli fonema con la stessa logica
  document.querySelectorAll('.consonant-btn, .fonema-btn').forEach(btn => {
    const letter = btn.dataset.letter;
    // 'full' è true se la selezione è completa E questo elemento non fa parte di essa
    const full   = selectedConsonants.length === 2 && !selectedConsonants.includes(letter);
    btn.classList.toggle('maxed', full);
  });
}

/**
 * Aggiorna le due caselle in alto che mostrano le consonanti selezionate.
 * Se una consonante non è ancora stata scelta, mostra '?' con stile 'empty'.
 */
function refreshSelectedDisplay() {
  const c1 = document.getElementById('cons1');
  const c2 = document.getElementById('cons2');

  if (selectedConsonants[0]) {
    c1.textContent = selectedConsonants[0].toUpperCase();
    c1.classList.remove('empty');
  } else {
    c1.textContent = '?';
    c1.classList.add('empty'); // stile semi-trasparente per slot vuoto
  }

  if (selectedConsonants[1]) {
    c2.textContent = selectedConsonants[1].toUpperCase();
    c2.classList.remove('empty');
  } else {
    c2.textContent = '?';
    c2.classList.add('empty');
  }
}

// ── Avvio della partita ────────────────────────────────────────────────────

/**
 * Avvia una nuova partita con le consonanti attualmente selezionate.
 * Genera le 10 sillabe (2 consonanti × 5 vocali), sceglie casualmente
 * quella misteriosa, resetta lo stato della UI e mostra la schermata di gioco.
 */
function startGame() {
  // Genera le 10 sillabe usando buildSyllables(), che gestisce sia le consonanti
  // semplici (b+a=ba) sia i fonemi (gi+i=gi invece di gii, gi+a=gia, ecc.)
  // es. B + GI → ba,be,bi,bo,bu, gia,gie,gi,gio,giu
  syllables = selectedConsonants.flatMap(c => buildSyllables(c));

  // Sceglie casualmente la sillaba da indovinare tra le 10 generate
  mysterySyllable = syllables[Math.floor(Math.random() * syllables.length)];
  won = false;

  // Costruisce la griglia di bottoni sillaba nel DOM
  buildSyllableGrid();

  // Riporta la mystery box allo stato iniziale (punto interrogativo, no revealed)
  const icon = document.getElementById('mystery-icon');
  const box  = document.getElementById('mystery-box');
  icon.textContent = '?';
  box.classList.remove('revealed');

  // Nasconde messaggio di vittoria e bottone "Ancora!" residui dalla partita precedente
  document.getElementById('message').classList.add('hidden');
  document.getElementById('new-game-btn').classList.add('hidden');

  // Mostra le due consonanti usate nella barra superiore del gioco (es. "B + M")
  document.getElementById('game-subtitle').textContent =
    selectedConsonants.map(c => c.toUpperCase()).join(' + ');

  // Passa dalla schermata di setup a quella di gioco
  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
}

// ── Griglia delle sillabe ──────────────────────────────────────────────────

/**
 * Costruisce la griglia 5×2 di bottoni sillaba nel DOM.
 * Le prime 5 sillabe (indici 0-4) appartengono alla prima consonante → riga 0 (sfondo azzurro).
 * Le seconde 5 (indici 5-9) appartengono alla seconda consonante → riga 1 (sfondo rosa).
 * La classe CSS row-0/row-1 determina il colore del bottone.
 */
function buildSyllableGrid() {
  const grid = document.getElementById('syllable-grid');
  grid.innerHTML = ''; // svuota la griglia precedente

  syllables.forEach((syl, idx) => {
    const btn = document.createElement('button');
    const row = Math.floor(idx / 5); // 0 per le prime 5 sillabe, 1 per le seconde 5
    btn.className   = `syllable-btn row-${row}`;
    btn.textContent = syl.toUpperCase(); // visualizza la sillaba in maiuscolo
    btn.dataset.syllable = syl;
    btn.addEventListener('click', () => onSyllableClick(syl, btn));
    grid.appendChild(btn);
  });
}

// ── Logica di gioco ────────────────────────────────────────────────────────

/**
 * Chiamato quando il giocatore clicca la mystery box:
 * fa pronunciare ad alta voce la sillaba misteriosa.
 */
function onMysteryClick() {
  speak(mysterySyllable);
}

/**
 * Gestisce il click su un bottone sillaba.
 * - Se il gioco è già vinto o il bottone è disabilitato, ignora.
 * - Pronuncia sempre la sillaba cliccata (feedback audio).
 * - Se è quella giusta: festeggia con animazione, confetti e messaggio.
 * - Se è sbagliata: scuote il bottone, lo disabilita e lo sbiadisce.
 * @param {string} syllable - La sillaba del bottone cliccato
 * @param {HTMLElement} btn - Il bottone DOM corrispondente
 */
function onSyllableClick(syllable, btn) {
  if (won || btn.disabled) return; // blocca click multipli e click post-vittoria

  speak(syllable); // pronuncia la sillaba cliccata così il bambino sente cosa ha scelto

  if (syllable === mysterySyllable) {
    // ── RISPOSTA CORRETTA ──
    won = true;
    btn.classList.add('correct'); // evidenzia in verde

    // Rivela la mystery box mostrando la sillaba e colorandola di verde
    const icon = document.getElementById('mystery-icon');
    const box  = document.getElementById('mystery-box');
    icon.textContent = mysterySyllable.toUpperCase();
    box.classList.add('revealed');
    box.style.animation = 'none'; // ferma l'animazione di pulse continua

    showWinMessage();  // mostra il messaggio di congratulazioni
    launchConfetti();  // lancia l'animazione dei coriandoli
  } else {
    // ── RISPOSTA SBAGLIATA ──
    btn.classList.add('wrong', 'shake'); // aggiunge stile sbiadito + animazione tremolio
    btn.disabled = true;                 // impedisce di cliccarla di nuovo
    // Rimuove solo la classe 'shake' dopo 500ms (la durata dell'animazione CSS),
    // ma mantiene 'wrong' e disabled per tutta la partita
    setTimeout(() => btn.classList.remove('shake'), 500);
  }
}

/**
 * Mostra il pannello di vittoria con un messaggio casuale tra quelli in MESSAGGI.
 * Usa un trucco DOM (void el.offsetWidth) per forzare il browser a ri-applicare
 * l'animazione CSS 'celebrate' anche se il pannello era già visibile.
 */
function showWinMessage() {
  const el  = document.getElementById('message');
  const msg = MESSAGGI[Math.floor(Math.random() * MESSAGGI.length)];
  el.textContent = msg;
  el.classList.remove('hidden');

  // Forza il reflow del browser per poter riavviare l'animazione CSS da zero
  void el.offsetWidth;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = ''; // riattiva l'animazione 'celebrate' definita nel CSS

  // Mostra il bottone per giocare un'altra partita con le stesse consonanti
  document.getElementById('new-game-btn').classList.remove('hidden');
}

// ── Animazione coriandoli ──────────────────────────────────────────────────

/**
 * Crea 90 elementi coriandolo e li inserisce nel contenitore fisso #confetti-container.
 * Ogni coriandolo ha proprietà casuali: posizione orizzontale, dimensione, colore,
 * ritardo di animazione, durata, rotazione iniziale e forma (quadrato o cerchio).
 * Dopo 3,5 secondi ogni elemento viene rimosso dal DOM per pulizia.
 */
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const N = 90; // numero di coriandoli

  for (let i = 0; i < N; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';

    const size = Math.random() * 9 + 6; // dimensione tra 6px e 15px

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
    // 50% dei coriandoli è quadrato, 50% è rettangolare (altezza 2.2×)
    // 40% dei coriandoli è circolare (border-radius 50%), 60% è rettangolare arrotondato

    container.appendChild(el);

    // Rimuove il coriandolo dal DOM dopo che l'animazione è completata
    setTimeout(() => el.remove(), 3500);
  }
}

// ── Navigazione tra schermate ──────────────────────────────────────────────

/**
 * Torna alla schermata di selezione consonanti.
 * Non resetta le consonanti già scelte: il giocatore le ritrova selezionate.
 */
function backToSetup() {
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('setup-screen').classList.add('active');
}

/**
 * Inizia una nuova partita con le stesse consonanti già selezionate.
 * Equivale a chiamare startGame() direttamente.
 */
function newGame() {
  startGame();
}

// ── Inizializzazione ───────────────────────────────────────────────────────

/**
 * Punto di ingresso principale: eseguito quando il DOM è completamente caricato.
 * Inizializza le voci TTS, costruisce la griglia consonanti e collega
 * tutti i listener permanenti (i listener dei singoli bottoni dinamici
 * vengono aggiunti dentro buildConsonantGrid e buildSyllableGrid).
 */
function init() {
  initVoices();        // carica la voce italiana per la sintesi vocale
  buildConsonantGrid(); // costruisce la griglia dei bottoni consonante
  buildFonemiGrid();    // costruisce la griglia dei bottoni fonema (es. "GI")

  // Listener sui bottoni fissi dell'HTML (non quelli creati dinamicamente)
  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('mystery-box').addEventListener('click', onMysteryClick);
  document.getElementById('back-btn').addEventListener('click', backToSetup);
  document.getElementById('new-game-btn').addEventListener('click', newGame);
}

// Avvia l'app solo dopo che il browser ha finito di costruire il DOM
document.addEventListener('DOMContentLoaded', init);
