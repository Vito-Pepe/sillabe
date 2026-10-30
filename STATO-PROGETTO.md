# Stato del progetto: app su Raspberry Pi 5 con Docker e Tailscale

Ultimo aggiornamento: 2026-10-30. Serve per riprendere il lavoro in una nuova sessione.

## Obiettivo

Far girare le mie app GitHub in container Docker su un Raspberry Pi 5, raggiungibili sia da casa (LAN) sia da fuori casa **solo tramite Tailscale**, senza aprire porte sul router.

## Stato attuale: funziona tutto

| App | Repo | LAN (http) | Tailscale (https) | Porta locale sul Pi |
|---|---|---|---|---|
| Homepage | `Vito-Pepe/homepage` | `http://192.168.1.22:8081` | `https://vito.<tailnet>.ts.net` (443) | 8081 |
| Sillabe | `Vito-Pepe/sillabe` | `http://192.168.1.22:8080` | `https://sillabe.<tailnet>.ts.net` | 8080 |
| Parole (app) | `Vito-Pepe/parole` | `http://192.168.1.22:8082` | `https://parole.<tailnet>.ts.net` | 8082 |
| Parole (esercizi pubblici) | `Vito-Pepe/parole` | `http://192.168.1.22:8083` | **Internet**: `https://parole-esercizi.<tailnet>.ts.net/e/<codice>` (funnel da un dispositivo Tailscale separato, servizio `tailscale-public`; prima era `vito...:10000`) | 8083 |
| Giochi della homepage (link pubblici) | `Vito-Pepe/homepage` | – | **Internet**: `https://parole-esercizi.<tailnet>.ts.net/g/<codice>` | 127.0.0.1:8084 |
| Chess | `Vito-Pepe/Chess` | `http://192.168.1.22:8085` | `https://chess.<tailnet>.ts.net` | 8085 |
| Minigiochi | `Vito-Pepe/minigiochi` | `http://192.168.1.22:8087` | `https://minigiochi.<tailnet>.ts.net` | 8087 |
| Minigiochi (link pubblici) | `Vito-Pepe/minigiochi` | – | **Internet**: `https://parole-esercizi.<tailnet>.ts.net/m/<codice>` | 127.0.0.1:8086 |
| onlineEmu (giochi retro) | `Vito-Pepe/onlineEmu` | `http://192.168.1.22:8088` | `https://retro.<tailnet>.ts.net` | 8088 |
| Impostore (gioco) | `Vito-Pepe/impostore` | `http://192.168.1.22:8089` | `https://impostore.<tailnet>.ts.net` | 8089 |
| Impasti e ImpastiPLUS (impasti per la pizza) | `Vito-Pepe/pizzapp` | `http://192.168.1.22:8090` | `https://pizzapp.<tailnet>.ts.net` | 8090 |
| Infernotuffatori (build di Helldivers 2) | `Vito-Pepe/infernotuffatori` | – | `https://infernotuffatori.<tailnet>.ts.net`, anche per un amico (dispositivo condiviso) | 127.0.0.1:8091 |
| Meteo | `Vito-Pepe/meteo` (cartella `~/parole/meteo`) | – | `https://meteo.<tailnet>.ts.net` | 127.0.0.1:8765 |

**Indirizzi HTTPS senza porta**: ogni app (tranne la homepage) ha un suo dispositivo Tailscale, avviato dalla repo `Vito-Pepe/ingressi-https` (un container `tailscale/tailscale` per app, solo tailnet, niente funnel; regole in `serve/<app>.json`). Gli indirizzi `http://vito:<porta>` e `http://192.168.1.22:<porta>` restano come riserva. La homepage aperta in https porta ai nuovi indirizzi; aperta in http usa le porte.

Porte occupate sul Pi: 8080–8091 (8084, 8086 e 8091 solo su `127.0.0.1`). Chess ha anche un container interno `chess-stockfish` (porta 8000, non pubblicata). Prima di scegliere una porta per una nuova app: `ss -ltn | grep ':80'`.

Parole (da fare il deploy sul Pi, vedi `README.md` della repo) è diversa dalle altre: ha un piccolo server Node e un volume Docker `parole_parole-data` con elenco parole, foto, esercizi e codice (predefinito `7777`). Backup e recupero del codice sono nel suo README.

**Parole è l'unica cosa esposta su Internet**, e solo in parte: la logopedista (la mia ragazza) crea esercizi dall'app privata e manda ai pazienti un link. La porta pubblica (8083) mostra solo l'esercizio del link: niente login, niente scritture, niente elenchi. L'app non conserva dati personali dei pazienti: nel nome dell'esercizio non va il nome del paziente e le foto devono essere generiche. Il container è isolato dal firewall del Pi: non può aprire connessioni verso LAN, tailnet, Internet o il Pi stesso (resta solo il DNS interno di Docker). Ulteriore passo possibile: Pi su rete ospiti/VLAN.

Il nome della tailnet si legge con `tailscale serve status` sul Pi o nel pannello admin Tailscale.

**Il Pi segue `main`** in tutte le repo. Flusso di lavoro: le modifiche si fanno su un branch, si apre una pull request verso `main` e la si unisce su GitHub con **"Create a merge commit"** (non squash né rebase). Entro 5 minuti il cron aggiorna il Pi. Per annullare una modifica: pulsante "Revert" sulla PR unita. Il branch `claude/docker-sillabe-raspberry-njmc8b` è quello di lavoro della prima sessione; in parole, `claude/parole-gruppi-esercizi` è già tutto dentro `main` e si può cancellare.

### Giochi (sezione della homepage)

Riquadro **Giochi** nella homepage, pagina `/giochi/`. Elenca da sola i file `.html` in `app/giochi/files/` della repo homepage (nginx genera l'elenco in JSON), con una **barra di ricerca** per nome in cima (ignora maiuscole e accenti). Per aggiungere un gioco della mia ragazza: caricare il file in quella cartella, anche dal browser su GitHub (Add file > Upload files su `main`), ed entro 5 minuti compare. Nome dal `<title>`, icona da `<meta name="icona" content="🐶">`, descrizione da `<meta name="description">`. `memory-esempio.html` è solo un esempio; `puzzle-emoji.html` è un puzzle con le emoji (4 o 9 pezzi, si trascinano con il dito o si toccano due pezzi per scambiarli).

Si possono anche **caricare dalla pagina**: link "Gestisci giochi" in fondo, password `GIOCHI_PASSWORD` nel `.env` della homepage sul Pi. Il gioco compare subito. I giochi caricati stanno solo sul Pi (volume `homepage_giochi-caricati`, da includere nei backup) e si eliminano con la ✕ sul riquadro. Li gestisce il servizio `giochi` (cartella `uploader/` della repo homepage), raggiunto da nginx su `/giochi/api/`.

**Gruppi di giochi (link per i genitori)**: in "Gestisci giochi" si creano gruppi di uno o più giochi, ognuno con un link pubblico `https://parole-esercizi.<tailnet>.ts.net/g/<codice>` (Copia, Modifica, Nuovo link, Elimina). Con più giochi il link apre una pagina di scelta, con uno solo va dritto al gioco. I giochi sono serviti in sandbox, con uno script aggiunto al volo che fa tornare "← Giochi" alla pagina di scelta (o lo nasconde). Lo serve la porta pubblica del servizio `giochi` (`127.0.0.1:8084`) tramite l'ingresso di Parole (percorso `/g/` in `tailscale/serve.json` della repo parole). Indirizzo base in `GIOCHI_PUBLIC_URL` nel `.env` della homepage; gruppi nel volume `homepage_giochi-stato`. Container della homepage isolati dalla LAN con `firewall/giochi-firewall.sh` (bridge `br-giochi`). Non ci sono più link per singolo gioco.

### Minigiochi (app separata)

Repo `minigiochi`, pagina `http://vito:8087`. È una **copia** della sezione Giochi della homepage in un'app a sé, con lo stesso codice e gli stessi vincoli: ricerca, caricamento con password, gruppi con link pubblico, sandbox, container in sola lettura, firewall (`firewall/minigiochi-firewall.sh`, bridge `br-minigiochi`, servizio systemd `minigiochi-firewall`). Giochi della repo in `app/files/`.

Dati **separati** dalla homepage: volumi `minigiochi_giochi-caricati` e `minigiochi_giochi-stato`, `.env` proprio con `GIOCHI_PASSWORD` e `GIOCHI_PUBLIC_URL=https://parole-esercizi.<tailnet>.ts.net/m`. Link pubblici sul percorso `/m/` dell'ingresso di Parole, verso `127.0.0.1:8086`.

Differenze dal codice della homepage: gestione su `/api/` (non `/giochi/api/`), cookie di accesso `minigiochi` (non `giochi`), link pubblici `/m/` (non `/g/`). **Una correzione al codice dei giochi va fatta in tutte e due le repo.**

## Il Raspberry Pi

- Raspberry Pi OS Lite 64-bit, installazione pulita, collegato in Wi-Fi. Il cavo Ethernet è stato provato (funzionava a 1 Gbit/s su `192.168.1.20`) e poi staccato per scelta: se si riattacca, il Pi lo usa da solo.
- Hostname `vito`, utente `pepe`, IP in LAN `192.168.1.22` (fisso, assegnato dal router).
- Accesso: `ssh pepe@192.168.1.22`. Il nome `vito.local` non sempre risolve.
- Installati: Docker + plugin compose (script get.docker.com), Tailscale (script ufficiale), git, cron.
- Tailscale gira sull'host, non in un container. Il Pi compare nella tailnet come `vito` (`100.96.58.127`).
- Raspberry Pi Connect non attivato (non serve).

## Come funziona

1. Ogni app è un sito statico servito da nginx in un container (`docker compose`), con la porta pubblicata su tutte le interfacce, quindi raggiungibile dalla LAN.
2. Il `tailscale serve` del Pi pubblica solo la homepage: `443 -> localhost:8081` (`https://vito.<tailnet>.ts.net`). Le altre app hanno un dispositivo Tailscale ciascuna (repo `ingressi-https`): `https://<app>.<tailnet>.ts.net -> localhost:<porta>`. Le vecchie regole `8443` (meteo) e `10000` (Sillabe) sul Pi sono state spente. Funziona solo per i dispositivi autenticati sulla tailnet, da qualunque rete.
3. Ogni repo ha uno `update.sh` su cron ogni 5 minuti (senza `sudo`): fa `git fetch`, e solo se ci sono commit nuovi sul branch corrente fa pull, rebuild e riavvio.
4. La homepage legge l'elenco delle app da `app/apps.js` e costruisce i link: `http://<host>:<lanPort>` in LAN, `https://<host>:<tsPort>` via Tailscale.

Guide dettagliate: `TAILSCALE.md` e `DEPLOY.txt` in questa repo, `README.md` nella repo homepage.

## Comandi di riferimento (sul Pi)

```bash
# Stato
docker ps
tailscale status
tailscale serve status
crontab -l

# Log degli aggiornamenti automatici
tail -f ~/sillabe/update.log
tail -f ~/homepage/update.log
tail -f ~/minigiochi/update.log

# Aggiornare subito a mano (stesso comando in ogni repo: parole, Chess, minigiochi...)
cd ~/sillabe && ./update.sh
cd ~/homepage && ./update.sh

# Dopo una modifica a tailscale/serve.json di parole (letto solo all'avvio)
cd ~/parole && docker compose up -d --force-recreate tailscale-public

# Firewall dei container esposti
sudo parole-firewall.sh status
sudo giochi-firewall.sh status
sudo minigiochi-firewall.sh status

# Log di un container
cd ~/sillabe && docker compose logs --tail 30 sillabe
```

### onlineEmu (giochi retro)

Repo `onlineEmu`, pagina `http://vito:8088` o `https://retro.<tailnet>.ts.net`. È **RomM** (immagine `rommapp/romm`, versione fissata nel compose) con l'emulatore **EmulatorJS** integrato: il Pi conserva giochi, copertine e salvataggi, il gioco gira nel browser del dispositivo (scelta "opzione C": niente streaming, nessuna latenza). Per ora Game Boy Advance; la PS1 più avanti, quando ci sarà il BIOS estratto dalla PS1 di casa (con lo streaming dal Pi come possibile aggiunta solo per la PS1).

Database MariaDB (container `onlineemu-db-1`, volume `onlineemu_db-data`), segreti generati sul Pi nel `.env`, giochi e salvataggi nella cartella `~/onlineEmu/dati/` (fuori da git). Account amministratore creato al primo accesso. Su iPhone: "Aggiungi alla schermata Home". Istruzioni nel README della repo.

### Impostore (gioco)

Repo `impostore`, pagina `https://impostore.<tailnet>.ts.net` o `http://vito:8089`, riquadro **Impostore** nella homepage. Il gioco dell'impostore con un telefono solo: si scrivono i nomi, il telefono passa di mano in mano, tutti leggono la parola segreta (con la categoria) tranne l'impostore, che vede in rosso "Sei l'impostore" e un indizio; la categoria gli si mostra solo con l'interruttore "Categoria per l'impostore" (spento di base: insieme all'indizio a volte svela la parola); poi giro di parole, voto e rivelazione. Pagina statica (nginx, container in sola lettura): tutto gira nel browser, niente dati sul Pi, niente cookie. Parole e indizi in `app/parole-impostore.js` (una riga per parola, si modificano anche da GitHub).

### Impasti e ImpastiPLUS (repo pizzapp)

Repo `pizzapp`, pagina `https://pizzapp.<tailnet>.ts.net` o `http://vito:8090`, riquadro **Impasti** nella homepage. La prima pagina fa scegliere tra due app, nello stesso container: **Impasti** (`/impasti/`) e **ImpastiPLUS** (`/impastiplus/`). I vecchi indirizzi `/#/...` rimandano a `/impasti/`.

**Impasti**: calcolatore e diario degli impasti per la pizza, ispirato alle funzioni dell'app Android "Pizzapp": codice, testi e grafica sono nostri. Stili Facile, Verace, Biga, Teglia e Personalizzata; dose di lievito da una curva in "ore a 20 °C" (il frigo conta circa un quinto), modificabile in Impostazioni; pianificazione dall'ora di cena; in ogni stile si possono dare solo le ore dall'impasto al pasto, e l'app divide le fasi (puntata, frigo, appretto), calcola il lievito e dà il programma; diario con cotture, voti e consigli; farine anche dal codice a barre (Open Food Facts, la fotocamera funziona solo in HTTPS); lievito madre; statistiche; condivisione come immagine; esporta/importa. Lasciati fuori: community, login, pubblicità e (per ora) i promemoria. Un interruttore (Altro → Impostazioni, e sotto le dosi) passa dalla curva di Impasti al modello del lievito di PizzApp, con un ritocco da −50% a +50%.

**ImpastiPLUS**: le funzioni della seconda app Android, PizzApp 1.9.8.0 (`fisico.pizzapp`), tranne la pubblicità. Panielli anche di due misure, Verace o Teglia, fino a 6 farine, acqua, sale e grassi, temperatura ambiente e frigo, 5 lieviti (fresco, secco istantaneo e attivo, madre solido e liquido), pasta di riporto, poolish, biga, autolisi, scarto. I campi si accendono in Impostazioni. Ricette con nome, nota e foto; utilità (temperatura dell'acqua, W, impasto per teglia) e guida. Il modello del lievito è quello di PizzApp, ricavato dalla APK per uso personale e riscritto da zero (`app/comune/lievito-pizzapp.js`): il codice di PizzApp non è nella repo.

Server Node senza dipendenze, dati in un file JSON nel volume `pizzapp_dati` con un backup al giorno, foto di ImpastiPLUS nella cartella `foto/` dello stesso volume. Niente password, come le altre app di casa.

### Infernotuffatori (build di Helldivers 2)

Repo `infernotuffatori`, pagina `https://infernotuffatori.<tailnet>.ts.net`, riquadro **Infernotuffatori** nella homepage (solo con la homepage in https: in LAN non c'è). Fa la parte "costruisci e consulta le build" del builder di democracy-hub.net:
- elenco delle build di tutti, per fazione, con riordino trascinando;
- costruttore con la scelta ordinata per efficacia o per quanto alza il punteggio della build, e i **consigli** pezzo per pezzo ("Metti", "Completa i posti vuoti");
- **build migliore** per ogni fazione: la potenza totale più alta tra le build che si possono portare (uno zaino, un'arma di supporto e un veicolo al massimo; passiva e peso di un'armatura vera), da cambiare e salvare;
- pagina della build con l'analisi: prestazioni, potenza, soglie, distanza, profilo, strutture;
- importazione dei link di condivisione di democracy-hub;
- pagina Novità.

**Catalogo e metriche**:
- Il catalogo (armi, stratagemmi, passive, potenziamenti, nemici, strutture) viene dalla wiki di Helldivers 2 (helldivers.wiki.gg, CC BY-NC-SA 4.0).
- Il server lo **aggiorna da solo una volta al giorno**, oppure a mano con "Aggiorna adesso". Le modifiche (armi nuove, danni cambiati) finiscono in Novità; se la wiki non risponde resta il catalogo di prima.
- Le metriche sono **nostre**, calcolate dai dati del gioco (`app/comune/metriche.js`): dei punteggi di democracy-hub non si usa niente.

**Chi può fare cosa**:
- Si condivide con un **amico** dandogli solo il dispositivo `infernotuffatori` (Machines → Share), non la tailnet.
- Chi entra è riconosciuto da `tailscale serve` (intestazioni `Tailscale-User-*`): niente password, ognuno modifica solo le sue build; gli amministratori (`AMMINISTRATORI` nel `.env`) tutte.
- Per questo la porta è solo su `127.0.0.1`, e l'ingresso di `ingressi-https` ha una rete sua invece di quella del Pi (vedi "Cose imparate").

**Wiki** (voce del menu): tutte le informazioni del gioco, con una ricerca.
- Nemici con l'anatomia completa, gli attacchi, i consigli e le armi migliori contro ognuno.
- Armi e stratagemmi con il grado vero di perforazione, anche quelli che il gioco non mostra, e come vanno contro ogni nemico.
- Tutte le armature con protezione e danno subito per parte del corpo; elmi e mantelli.
- Una guida in italiano alle meccaniche (perforazione e corazza, danno durevole, esplosioni, effetti, stordimento, armatura, difficoltà), con tabelle fatte dai dati.
- I testi delle pagine restano in inglese come sulla wiki e si aggiornano con il catalogo; le armature arrivano dalle tabelle Cargo della wiki.

**Ordini** (voce del menu): il Major Order in corso, aggiornato ogni 30 minuti. Il Personal Order no, per scelta (il gioco lo dà solo con l'account di un giocatore).
- Obiettivi in italiano con percentuale, numeri e quanto manca; pianeti coinvolti (chi li tiene, liberazione, difesa, Helldiver presenti); ricompensa e scadenza.
- Ritmo delle ultime ore e stima se si finisce in tempo (storico nel volume, `ordini/`).
- Fonte: l'API del gioco, senza account.

**Dati**: server Node senza dipendenze, dati nel volume `infernotuffatori_dati` con un backup al giorno.

## Aggiungere una nuova app

1. Nuova repo con Dockerfile, `docker-compose.yml`, `nginx.conf`, `update.sh` (copiarli da `homepage`).
2. Porta locale libera: oggi 8080–8091 sono occupate, quindi dalla 8092 in su (verificare con `ss -ltn | grep ':80'`).
3. Sul Pi: `git clone https://github.com/Vito-Pepe/<repo>.git` (segue `main`), `docker compose up --build -d`, riga di cron per `update.sh`.
4. Indirizzo HTTPS senza porta: nella repo `ingressi-https` un file `serve/<nome>.json` e un servizio nel compose (istruzioni nel suo README); al primo avvio serve una auth key Tailscale, poi Disable key expiry sul nuovo dispositivo. **Non** usare `tailscale serve` sul Pi: sostituirebbe le regole esistenti. Un dispositivo da condividere con persone fuori dalla tailnet va su una rete sua, non su quella del Pi (come `infernotuffatori`).
5. Una riga in `app/apps.js` della homepage con `lanPort` e `tsHost` (il nome del dispositivo).

## Cose imparate

- La sessione cloud di Claude non può fare SSH sul Pi (VM isolata, rete limitata). Per far eseguire i comandi a Claude serve Claude Code installato sul Mac. Altrimenti si incollano i comandi a mano.
- L'integrazione GitHub di Claude non può creare repo nuove (403): la repo vuota va creata a mano, poi si collega con accesso in scrittura.
- Il cron non deve usare `sudo`: i file di `.git` diventerebbero di root e i pull successivi fallirebbero.
- Sillabe mette in cache CSS e JS per 1 giorno. Visto che homepage e Sillabe hanno condiviso lo stesso indirizzo, la homepage prendeva lo stile di Sillabe: per questo il suo CSS si chiama `home.css`. Dare nomi di file diversi alle app che possono condividere un indirizzo.
- **HSTS vale per tutto il nome host, porte comprese.** Un header `Strict-Transport-Security` su una porta (es. gli esercizi pubblici su :10000) fa aprire in https anche le altre app sullo stesso host che usano http (Parole su :8082), e Safari smette di caricarle. Non attivare HSTS su questo host. Se capita, il server manda `max-age=0` e il browser dimentica la regola alla prossima visita.
- **iPhone con Relay privato di iCloud attivo**: le app private via Tailscale (`https://vito.<tailnet>.ts.net`, `:8443`) danno "connessione sicura non riuscita", in Safari e anche in Chrome. Il Relay risolve i nomi per tutte le app scavalcando il DNS di Tailscale, e da quando c'è il funnel il nome esiste anche su Internet, dove la porta 443 non è pubblicata. Soluzione: disattivare il Relay (anche solo per la rete cellulare o per una Wi-Fi), oppure aprire la homepage con il **nome breve `http://vito:8081`** (o `http://100.96.58.127:8081`), che non passa dal Relay: da lì i riquadri portano a `http://vito:8080` e `http://vito:8082`. Spostare il funnel su `parole-esercizi` non è bastato: Tailscale continua a pubblicare `vito` su Internet (indirizzi `185.40.234.x`) anche senza funnel attivo e dopo il riavvio di tailscaled. Da riverificare dopo qualche ora con `curl -s "https://dns.google/resolve?name=vito.<tailnet>.ts.net&type=A"`; se resta, togliere a `vito` il permesso funnel nelle regole del pannello (tag su `parole-esercizi`). I link pubblici dei pazienti non sono toccati.
- Il kernel del Pi non applica i limiti di memoria dei container ("No memory limit support"): `mem_limit` nel compose di Parole non ha effetto finché non si aggiunge `cgroup_enable=memory cgroup_memory=1` a `/boot/firmware/cmdline.txt` (una sola riga) e si riavvia. Opzionale.
- Dopo `usermod -aG docker` serve uscire e rientrare via SSH, altrimenti `docker` richiede `sudo`.
- `tailscale up` stampa un link di login monouso da aprire nel browser.
- **`tailscale serve` su una porta già usata sostituisce la regola precedente.** Il 2026-10-23 la 443 è finita su Sillabe e la 8443 su `127.0.0.1:8765`, e la homepage non si apriva più: rimesso `443 -> 8081` e spostato Sillabe sulla 10000. Prima di aggiungere un'app controllare sempre `tailscale serve status`.
- **I cookie non distinguono le porte**: due app sullo stesso host (`vito:8081` e `vito:8087`) vedono gli stessi cookie. Se due app usano un cookie con lo stesso nome, entrare in una fa uscire dall'altra: per questo Minigiochi usa il cookie `minigiochi` e la homepage `giochi`.
- Un `curl` lanciato subito dopo `docker compose up` può dare "Connection reset by peer": nginx non è ancora pronto. Basta riprovare dopo qualche secondo.
- L'avviso nginx `duplicate MIME type "text/html"` è innocuo (l'HTML è già compresso di default).
- **Termius può infilare codici invisibili nei file** (`\x1b]133;C`, i suoi segni di inizio comando) quando un comando scrive con `{ echo ...; } >> file`. Con un `.env` così `docker compose` dà `unexpected character "\x1b"`. Meglio scrivere con `printf ... > file` e pulire con `sed -i 's/\x1b\][^\x07]*\x07//g' file`; controllo: `cut -d= -f1 .env | cat -A`.
- **Una auth key aggiunta al `.env` vale solo ricreando il container** (`docker compose up -d --force-recreate <servizio>`): con un semplice riavvio il container di Tailscale resta "Logged out" e propone un link di login che cambia a ogni riavvio.
- **I giochi nel browser (onlineEmu) su iPhone vanno aperti in HTTPS**: da `http://192.168.1.22:8088` il GBA andava a circa 25 fps con l'audio distorto, da `https://retro.<tailnet>.ts.net` va fluido (in http Safari disattiva alcune funzioni usate dall'emulatore).
- Una repo nuova creata privata non si clona sul Pi senza credenziali: renderla pubblica (Settings > Danger Zone > Change visibility), come le altre.
- **Nel comando `read -rsp "Incolla la auth key: " K ...` la frase tra virgolette va lasciata com'è**: è il testo che il terminale mostra. La chiave si incolla dopo, quando compare la richiesta (non si vede niente mentre la si incolla). Il 2026-10-27 la chiave era stata scritta al posto della frase: è comparsa sullo schermo e `read` ha preso come valore la riga incollata dopo, finita nel `.env`. Per questo il comando con `read` va dato da solo, in un blocco separato. Una chiave finita sullo schermo o in chat va revocata e sostituita.
- **I dispositivi di `ingressi-https` sulla rete del Pi (`network_mode: host`) non vanno mai condivisi con altri.** In modalità utente Tailscale gira ogni connessione all'IP del dispositivo, su una porta che `serve` non gestisce, al `127.0.0.1` della stessa porta: con la rete del Pi, da quel dispositivo si arriva a tutte le porte del Pi (SSH, tutte le app, anche quelle solo su `127.0.0.1`). Visto il 2026-10-27 nel codice di Tailscale (`wgengine/netstack`) preparando la condivisione di Infernotuffatori con un amico. Per questo `infernotuffatori` ha una rete Docker sua insieme solo all'app (`ingresso-infernotuffatori`): provato con Docker, dentro il container di Tailscale non c'è niente in ascolto oltre al DNS di Docker.

## Da fare

- [ ] Disattivare la scadenza della chiave per `vito` (pannello Tailscale > Machines > Disable key expiry), altrimenti il Pi esce dalla tailnet dopo circa 180 giorni.
- [ ] Verificare nel pannello Tailscale (DNS) che MagicDNS e HTTPS Certificates siano attivi.
- [x] Branch uniti in `main` in tutte e tre le repo (PR #1) e Pi passato a seguire `main`.
- [x] Assegnare un IP fisso al Pi dal router (fatto).
- [ ] Rimuovere dal pannello Tailscale i dispositivi vecchi offline (anche un `pihole` di quasi un anno fa).
- [x] Deploy di Parole sul Pi e attivazione di `tailscale funnel` (fatto, link provato da fuori casa).
- [x] Isolamento di rete di Parole installato (servizio `parole-firewall`, verificato: connessioni verso la LAN bloccate, regole presenti dopo il riavvio). I blocchi verso `224.0.0.251` nel log sono gli annunci mDNS del Pi stesso: innocui.
- [ ] **Parole ha il login disattivato** (`DISABLE_LOGIN=1` nel file `~/parole/.env` sul Pi, aggiunto temporaneamente). Per rimetterlo: `docker run --rm -v parole_parole-data:/data alpine rm /data/settings.json`, `sed -i '/^DISABLE_LOGIN/d' ~/parole/.env`, `docker compose up -d` (il codice torna `7777`).
- [ ] (Opzionale) Attivare il limite di memoria dei container, vedi sopra.
- [ ] Revisione di sicurezza dedicata del server di Parole prima di un uso esteso.
- [x] Esercizi pubblici passati al dispositivo separato `parole-esercizi` (servizio `tailscale-public`, `COMPOSE_PROFILES=public` nel `.env` di parole). Funnel su `vito` spento, key expiry disattivata, link nuovi provati da rete mobile senza Tailscale.
- [ ] Rimandare ai pazienti i link nuovi (`https://parole-esercizi.<tailnet>.ts.net/e/...`): quelli vecchi su `vito...:10000` non funzionano più.
- [ ] Verificare che con il Relay privato acceso la homepage via Tailscale (`https://vito.<tailnet>.ts.net`) funzioni.
- [x] Tolto il doppione della riga di aggiornamento di parole nel crontab.
- [x] **Gruppi di esercizi** di Parole adottati: più esercizi sotto un unico link, con pagina di scelta e titolo per il bambino. Sono in `main`. Per tornare indietro: revert del commit `febaf42` nella repo parole (i gruppi stanno in `groups.json`, ignorato dalla versione senza gruppi).
- [x] Aggiunte Chess (porta 8085) e Minigiochi (porta 8087, firewall verificato, link `/m/` provato da rete mobile).
- [x] Indirizzi HTTPS senza porta per tutte le app (repo `ingressi-https`), provati dal telefono.
- [ ] Disable key expiry su `sillabe`, `parole`, `minigiochi`, `chess`, `meteo` nel pannello Tailscale, e revocare la auth key riutilizzabile usata per crearli.
- [x] onlineEmu installata sul Pi, dispositivo `retro` attivo (`https://retro.<tailnet>.ts.net`), primo gioco GBA provato da iPhone in HTTPS: fluido.
- [ ] onlineEmu: verificare Disable key expiry su `retro`, chiave revocata e `TS_AUTHKEY` tolta dal `.env` di `ingressi-https`.
- [ ] onlineEmu (facoltativo): chiudere la porta 8088 alla LAN (`127.0.0.1:8088`) per lasciarla solo via Tailscale.
- [ ] onlineEmu: estrarre il BIOS della PS1 e aggiungere la PS1.
- [x] Impostore installata sul Pi (porta 8089, riga di cron presente), dispositivo `impostore` di `ingressi-https` avviato (`Startup complete`), riquadro nella homepage.
- [ ] Impostore: verificare Disable key expiry su `impostore`, revoca delle due chiavi usate il 2026-10-27 (sono finite in chat) e `TS_AUTHKEY` tolta dal `.env` di `ingressi-https`. Provata dal telefono: funziona.
- [x] Impasti installata sul Pi e provata ("funziona").
- [ ] Impasti: verificare Disable key expiry su `pizzapp`, chiave revocata e `TS_AUTHKEY` tolta dal `.env` di `ingressi-https`.
- [ ] ImpastiPLUS: confrontare 3-4 casi con PizzApp vera (stessi campi) per conferma; provare la foto da iPhone.
- [ ] Impasti (facoltativo): tarare la curva di Impasti sui risultati del modello PizzApp.
- [ ] Impasti (più avanti): promemoria delle fasi della timeline.
- [x] Infernotuffatori installata sul Pi e provata ("funziona"): ingresso con rete sua, Disable key expiry su `infernotuffatori`, chiave revocata e `TS_AUTHKEY` tolta dal `.env` di `ingressi-https`. Dispositivo condiviso con l'amico.
- [ ] Infernotuffatori: controllare che le build dell'amico portino il suo nome (identità dal dispositivo condiviso).
- [ ] Meteo: `CLAUDE.md` e `update.sh` aggiunti alla repo (PR meteo #2). Sul Pi: `git pull` in `~/parole/meteo` e riga di cron.
- [ ] Scegliere la prossima app da aggiungere (dalla porta 8092).

## Per riprendere con Claude

Apri una sessione sulla repo `sillabe` e di' di leggere questo file e `TAILSCALE.md`. Per un **progetto nuovo** da far girare sul Pi (anche in una sessione su un'altra repo), fai leggere prima `INFRASTRUTTURA-PI.md`: elenca porte, nomi, reti, volumi, dispositivi Tailscale e percorsi pubblici già occupati, con la checklist per non creare conflitti. Link: `https://raw.githubusercontent.com/Vito-Pepe/sillabe/main/INFRASTRUTTURA-PI.md`. Se vuoi che Claude esegua i comandi direttamente sul Pi, usa Claude Code installato sul Mac (stessa rete del Pi) e dagli IP e utente del Pi.
