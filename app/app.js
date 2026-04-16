'use strict';

// ── Costanti ───────────────────────────────────────────────────────────────
// Le cinque vocali italiane usate per costruire tutte le sillabe possibili
const VOCALI = ['a', 'e', 'i', 'o', 'u'];

// Consonanti disponibili nella griglia di selezione
const CONSONANTI = ['b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];

// Fonemi (digrafi) e le loro sillabe esplicite.
// A differenza delle consonanti singole, dove la sillaba è semplicemente
// consonante+vocale, i fonemi hanno regole ortografiche specifiche in italiano
// e alcuni NON hanno sillabe per tutte e 5 le vocali: includiamo solo
// combinazioni realmente esistenti nella lingua italiana.
// La chiave è l'identificativo usato come data-letter nel DOM e nello stato selezionato.
const FONEMI = {
  // SC produce /ʃ/: per A/O/U serve la "i" di appoggio; tutte e 5 esistono.
  sc: ['scia', 'scie', 'sci', 'scio', 'sciu'],
  // GN produce /ɲ/ con tutte le vocali (gnomo, legna, bagno, agnello, gnu).
  gn: ['gna', 'gne', 'gni', 'gno', 'gnu'],
  // GL produce /ʎ/ davanti a I (e con "i" di appoggio per A/E/O): "gliu" non esiste.
  gl: ['glia', 'glie', 'gli', 'glio'],
  // CH conserva il suono duro /k/ davanti a E e I: "cha/cho/chu" non sono italiani.
  ch: ['che', 'chi'],
  // GH conserva il suono duro /g/ davanti a E e I: "gha/gho/ghu" non esistono.
  gh: ['ghe', 'ghi'],
  // QU produce /kw/: "quu" non esiste in italiano.
  qu: ['qua', 'que', 'qui', 'quo']
};

/**
 * Restituisce le 5 sillabe associate a un elemento selezionato (consonante o fonema).
 * - Per un fonema (es. 'sc') restituisce la lista custom definita in FONEMI.
 * - Per una consonante singola (es. 'b') combina la consonante con le 5 vocali.
 * @param {string} item - Chiave in FONEMI oppure una consonante singola
 * @returns {string[]} Array di 5 sillabe in minuscolo
 */
function syllablesFor(item) {
  if (FONEMI[item]) return FONEMI[item].slice(); // copia per sicurezza
  return VOCALI.map(v => item + v);
}

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

// Array con le 10 sillabe generate (2 consonanti × 5 vocali)
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

// ── Schermata di setup ─────────────────────────────────────────────────────

/**
 * Costruisce dinamicamente la griglia dei pulsanti consonante.
 * Svuota il contenitore e ricrea tutti i bottoni da CONSONANTI,
 * collegando a ciascuno il listener per toggleConsonant.
 */
function buildConsonantGrid() {
  const grid       = document.getElementById('consonant-grid');
  const fonemiGrid = document.getElementById('fonemi-grid');
  grid.innerHTML = '';
  fonemiGrid.innerHTML = '';

  // Griglia principale: consonanti singole
  CONSONANTI.forEach(c => grid.appendChild(makeSelectorButton(c)));

  // Griglia secondaria: fonemi (digrafi)
  Object.keys(FONEMI).forEach(k => fonemiGrid.appendChild(makeSelectorButton(k)));
}

/**
 * Crea un singolo bottone di selezione (consonante o fonema) con stile coerente.
 * Il testo è sempre in maiuscolo per leggibilità, la chiave minuscola viene
 * salvata nel dataset per il confronto con selectedConsonants.
 * @param {string} id - Identificativo minuscolo (es. 'b' o 'sc')
 * @returns {HTMLButtonElement}
 */
function makeSelectorButton(id) {
  const btn = document.createElement('button');
  btn.className   = 'consonant-btn';
  btn.textContent = id.toUpperCase();
  btn.dataset.letter = id;
  btn.addEventListener('click', () => toggleConsonant(id, btn));
  return btn;
}

/**
 * Seleziona o deseleziona una consonante quando l'utente clicca il suo bottone.
 * Non permette di selezionare più di 2 consonanti contemporaneamente.
 * Dopo ogni modifica aggiorna la griglia e il display delle consonanti scelte.
 * @param {string} letter - La consonante cliccata (minuscola)
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
  document.querySelectorAll('.consonant-btn').forEach(btn => {
    const letter = btn.dataset.letter;
    // 'full' è true se la selezione è completa E questa lettera non fa parte di essa
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
  // Genera le 10 sillabe. Per ogni elemento selezionato (consonante o fonema)
  // si ottengono 5 sillabe tramite syllablesFor():
  // - consonante singola 'b' → ba, be, bi, bo, bu
  // - fonema 'sc'           → scia, scie, sci, scio, sciu
  syllables = [];
  selectedConsonants.forEach(item => {
    syllablesFor(item).forEach(s => syllables.push(s));
  });

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
 * Costruisce la griglia dei bottoni sillaba nel DOM, organizzandola in due
 * righe indipendenti: una per ciascuna consonante/fonema selezionato.
 * Questo approccio gestisce correttamente anche i fonemi che non producono
 * tutte e 5 le sillabe (es. GL=4, CH=2, GH=2, QU=4) mantenendo ogni gruppo
 * allineato e visivamente distinto dall'altro tramite le classi row-0/row-1.
 */
function buildSyllableGrid() {
  const grid = document.getElementById('syllable-grid');
  grid.innerHTML = ''; // svuota la griglia precedente

  // Una riga flex per ogni elemento scelto; dentro ogni riga un bottone per
  // ogni sillaba realmente esistente. I colori di sfondo (row-0 azzurro,
  // row-1 rosa) si mantengono coerenti con la consonante di provenienza.
  selectedConsonants.forEach((item, itemIdx) => {
    const row = document.createElement('div');
    row.className = 'syllable-row';

    syllablesFor(item).forEach(syl => {
      const btn = document.createElement('button');
      btn.className   = `syllable-btn row-${itemIdx}`;
      btn.textContent = syl.toUpperCase();
      btn.dataset.syllable = syl;
      btn.addEventListener('click', () => onSyllableClick(syl, btn));
      row.appendChild(btn);
    });

    grid.appendChild(row);
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

  // Listener sui bottoni fissi dell'HTML (non quelli creati dinamicamente)
  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('mystery-box').addEventListener('click', onMysteryClick);
  document.getElementById('back-btn').addEventListener('click', backToSetup);
  document.getElementById('new-game-btn').addEventListener('click', newGame);
}

// Avvia l'app solo dopo che il browser ha finito di costruire il DOM
document.addEventListener('DOMContentLoaded', init);
