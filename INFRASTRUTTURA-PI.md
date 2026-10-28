# Infrastruttura del Raspberry Pi: cosa è già occupato

Ultimo aggiornamento: 2026-10-27.

> **Per una nuova sessione di Claude (o chiunque aggiunga un progetto al Pi): leggi tutto questo file prima di scegliere porte, nomi o configurazioni.**
> Sul Pi girano già diverse app. Porte, nomi di container, reti, volumi, nomi Tailscale, percorsi pubblici e cookie elencati qui sotto **sono occupati**: non darli per liberi. In caso di dubbio non indovinare, ma chiedi all'utente di lanciare i comandi della sezione 9 e lavora sul loro output.
> Questo file può essere rimasto indietro rispetto al Pi: lo stato vero è quello che dicono quei comandi.

**Ogni sessione che aggiunge, cambia o toglie qualcosa di infrastrutturale sul Pi aggiorna questo file con una PR sulla repo `Vito-Pepe/sillabe`, nello stesso lavoro.** Come viene letto in automatico: sezione 11.

Storia e dettagli del progetto: `STATO-PROGETTO.md` (stessa repo). Link diretto a questo file: `https://raw.githubusercontent.com/Vito-Pepe/sillabe/main/INFRASTRUTTURA-PI.md`.

---

## 1. La macchina

| | |
|---|---|
| Hardware | Raspberry Pi 5, **solo Wi-Fi** (il cavo Ethernet è stato provato e poi staccato) |
| Sistema | Raspberry Pi OS Lite 64-bit (arm64): le immagini Docker devono essere multi-arch o arm64 |
| Hostname | `vito` |
| Utente | `pepe` (nel gruppo `docker`: `docker` senza `sudo`) |
| IP in LAN | **`192.168.1.22`** sul Wi-Fi (`wlan0`, fisso dal router). Rete gestita da NetworkManager con netplan (`nmcli device status`). La connessione via cavo (`eth0`, MAC `2c:cf:67:63:4f:f6`) resta configurata: se si riattacca il cavo il Pi la preferisce da solo e prende `192.168.1.20` in automatico (non prenotato nel router) |
| IP Tailscale | `100.96.58.127` |
| Tailscale | installato **sull'host** (non in un container), dispositivo `vito` |
| Docker | Docker Engine + plugin compose (`docker compose`, non `docker-compose`) |
| Limiti di memoria | **non applicati**: il kernel non ha il cgroup memory attivo, `mem_limit` nel compose dà solo un avviso |

**Accesso:** l'utente lavora via SSH, anche da iPhone con Termius, verso `100.96.58.127` (Tailscale) o `192.168.1.22` (Wi-Fi). **Claude non può fare SSH sul Pi** da una sessione cloud: prepara i comandi e l'utente li incolla. Comandi a blocchi, uno per passaggio, con l'output atteso.

---

## 2. Porte occupate sul Pi (host)

| Porta | Interfaccia | Chi | Note |
|---|---|---|---|
| 22 | tutte | SSH | |
| 8080 | 0.0.0.0 | Sillabe (nginx) | |
| 8081 | 0.0.0.0 | Homepage (nginx) | |
| 8082 | 0.0.0.0 | Parole, app privata (Node) | |
| 8083 | 0.0.0.0 | Parole, esercizi pubblici (Node) | esce su Internet dal funnel di `parole-esercizi` |
| 8084 | 127.0.0.1 | Homepage, servizio `giochi` (link pubblici) | esce su Internet dal funnel, percorso `/g/` |
| 8085 | 0.0.0.0 | Chess (`chess-web`) | |
| 8086 | 127.0.0.1 | Minigiochi, servizio `giochi` (link pubblici) | esce su Internet dal funnel, percorso `/m/` |
| 8087 | 0.0.0.0 | Minigiochi (nginx) | |
| 8088 | 0.0.0.0 | onlineEmu (RomM, giochi retro) | |
| 8089 | 0.0.0.0 | Impostore (nginx) | |
| 8090 | 0.0.0.0 | Impasti e ImpastiPLUS, repo `pizzapp` (Node) | |
| 8091 | 127.0.0.1 | Infernotuffatori (Node) | solo per le prove dal Pi: l'ingresso HTTPS arriva all'app dalla rete Docker `ingresso-infernotuffatori` (sezione 5) |
| 8765 | 127.0.0.1 | Meteo | app aggiunta fuori da queste sessioni (cartella `~/parole/meteo`) |
| 41641/udp | tutte | Tailscale dell'host | i container Tailscale usano `--port=0` (porta UDP casuale) |

Porte **interne** ai container, non pubblicate sull'host: `3000` e `3001` dei servizi Node, `8000` di `chess-stockfish`, `3306` di `onlineemu-db-1` (MariaDB), `6379` di Valkey dentro `onlineemu-romm-1`. Dentro un container nuovo si può usare qualsiasi porta; conta solo quella pubblicata sull'host.

**Prima porta libera consigliata per un'app nuova: 8092**, poi 8093, ... Verificare sempre prima (sezione 9).

**Regola:** pubblica su `0.0.0.0` solo ciò che deve essere raggiungibile dalla LAN; ciò che serve solo a un proxy sul Pi (Tailscale, funnel) va su `127.0.0.1:<porta>`.

---

## 3. App, repo, cartelle e indirizzi

Tutte le repo sono **pubbliche** su GitHub sotto `Vito-Pepe`, clonate in `~/<nome>` sul Pi, che segue `main`.

| App | Repo | Cartella sul Pi | Progetto compose | LAN | Tailnet (HTTPS, senza porta) |
|---|---|---|---|---|---|
| Homepage (+ sezione Giochi) | `homepage` | `~/homepage` | `homepage` | `http://192.168.1.22:8081` | `https://vito.<tailnet>.ts.net` |
| Sillabe | `sillabe` | `~/sillabe` | `sillabe` | `:8080` | `https://sillabe.<tailnet>.ts.net` |
| Parole | `parole` | `~/parole` | `parole` | `:8082` | `https://parole.<tailnet>.ts.net` |
| Chess | `Chess` | `~/Chess` | `chess` | `:8085` | `https://chess.<tailnet>.ts.net` |
| Minigiochi | `minigiochi` | `~/minigiochi` | `minigiochi` | `:8087` | `https://minigiochi.<tailnet>.ts.net` |
| onlineEmu (giochi retro, RomM) | `onlineEmu` | `~/onlineEmu` | `onlineemu` | `:8088` | `https://retro.<tailnet>.ts.net` |
| Impostore (gioco) | `impostore` | `~/impostore` | `impostore` | `:8089` | `https://impostore.<tailnet>.ts.net` |
| Impasti e ImpastiPLUS (impasti per la pizza, pagina di scelta in `/`) | `pizzapp` | `~/pizzapp` | `pizzapp` | `:8090` | `https://pizzapp.<tailnet>.ts.net` |
| Infernotuffatori (build di Helldivers 2, **condivisa con un amico**) | `infernotuffatori` | `~/infernotuffatori` | `infernotuffatori` | – (solo `127.0.0.1`) | `https://infernotuffatori.<tailnet>.ts.net` |
| Meteo | ? (non gestita qui) | `~/parole/meteo` | ? | – | `https://meteo.<tailnet>.ts.net` |
| Ingressi HTTPS | `ingressi-https` | `~/ingressi-https` | `ingressi-https` | – | (crea gli indirizzi qui sopra) |

`<tailnet>` è il nome della tailnet dell'utente (si legge con `tailscale status` o nel pannello Tailscale). Gli indirizzi `http://vito:<porta>` (nome breve) funzionano dalla tailnet come riserva.

**Il nome della cartella decide il nome del progetto compose**, e quindi i nomi di container (`<progetto>-<servizio>-1`), reti (`<progetto>_default`) e volumi (`<progetto>_<volume>`). Un progetto nuovo deve avere una cartella con un nome **non** in questa tabella, altrimenti `docker compose` lo mescola con quello esistente.

### Container in esecuzione

```
sillabe-sillabe-1
homepage-homepage-1, homepage-giochi-1
parole-parole-1, parole-tailscale-public-1
chess-web-1, chess-stockfish-1
minigiochi-minigiochi-1, minigiochi-giochi-1
onlineemu-romm-1, onlineemu-db-1
impostore-impostore-1
pizzapp-pizzapp-1
infernotuffatori-infernotuffatori-1
ingressi-https-{sillabe,parole,minigiochi,chess,meteo,retro,impostore,pizzapp,infernotuffatori}-1
```

---

## 4. Tailscale

### Dispositivi (nomi già presi nella tailnet)

| Nome | Cos'è | Cosa espone |
|---|---|---|
| `vito` | il Pi (Tailscale sull'host) | `tailscale serve` **solo** `443 -> http://127.0.0.1:8081` (homepage). Niente funnel |
| `parole-esercizi` | container `parole-tailscale-public-1` (repo parole) | **funnel su Internet**, vedi sotto |
| `sillabe`, `parole`, `minigiochi`, `chess`, `meteo`, `retro`, `impostore`, `pizzapp` | container di `ingressi-https` (`network_mode: host`) | solo tailnet, `443 -> 127.0.0.1:<porta dell'app>` |
| `infernotuffatori` | container di `ingressi-https` con **rete sua** (`ingresso-infernotuffatori`, niente `network_mode: host`) | **condiviso con un amico** (Machines → Share); `443 -> http://infernotuffatori-app:3000`. L'app riconosce chi entra dalle intestazioni `Tailscale-User-*` di `tailscale serve` |

Un nome nuovo (es. `nuovaapp`) non deve coincidere con questi; se è già preso Tailscale aggiunge un numero (`parole-1`), da evitare.

### Regole importanti

- **Non lanciare `tailscale serve` sull'host per una nuova app.** Un `tailscale serve --https=<porta>` su una porta già usata **sostituisce** la regola esistente: è già successo che la homepage sparisse dalla 443. Il modo giusto per dare a un'app un indirizzo HTTPS senza porta è la repo `ingressi-https` (sezione 8).
- Le vecchie regole `8443` (Meteo) e `10000` (Sillabe) sull'host sono state sostituite da `ingressi-https` e vanno spente o sono già spente: `tailscale serve status` deve mostrare solo la 443.
- I container Tailscale girano in **modalità utente** (`TS_USERSPACE=true`) con `network_mode: host` e `TS_TAILSCALED_EXTRA_ARGS=--port=0`, per non scontrarsi con il Tailscale dell'host. Identità nel volume: la auth key serve solo al primo avvio, poi si toglie dal `.env` e si revoca. Su ogni nuovo dispositivo: **Disable key expiry** nel pannello.
- **Mai condividere (Machines → Share) un dispositivo in `network_mode: host`.** In modalità utente Tailscale gira ogni connessione all'IP del dispositivo, su una porta che `serve` non gestisce, a `127.0.0.1:<stessa porta>` (`wgengine/netstack` di Tailscale), e con `network_mode: host` quel `127.0.0.1` è il Pi. Da ognuno di quei dispositivi si arriva quindi a **tutte** le porte del Pi: SSH, ogni app, anche quelle solo su `127.0.0.1` (e Parole ha il login disattivato). Per i propri dispositivi non cambia niente; per chi riceve una condivisione sì. Un dispositivo da condividere ha una rete Docker sua insieme solo all'app, come `infernotuffatori` (README di `ingressi-https`, sezione "Dispositivi da condividere").
- **HSTS vietato** su questi nomi: un header `Strict-Transport-Security` vale per tutto il nome host, porte comprese, e rompe le app in http. Il lato pubblico di Parole manda `max-age=0` apposta.
- iPhone con **Relay privato di iCloud**: può non risolvere i nomi `*.ts.net`. Riserva: `http://vito:<porta>`.

### Ingresso pubblico (Internet): `parole-esercizi`

Unico punto esposto su Internet. Funnel sulla 443, configurato in `parole/tailscale/serve.json`:

| Percorso | Va a | Cosa |
|---|---|---|
| `/` (tutto il resto) | `127.0.0.1:8083` | esercizi pubblici di Parole (`/e/<codice>`, `/api/e/...`, `/img/...`) |
| `/g/` | `127.0.0.1:8084` | gruppi di giochi della homepage |
| `/m/` | `127.0.0.1:8086` | gruppi di Minigiochi |

Percorsi **occupati**: `/`, `/e/`, `/api/`, `/img/`, `/g/`, `/m/`. Una nuova parte pubblica prende un prefisso nuovo (es. `/x/`), aggiunto a `serve.json` della repo parole. Il file è montato come file singolo e letto all'avvio: dopo il merge serve `cd ~/parole && docker compose up -d --force-recreate tailscale-public`.

Tutto ciò che è pubblico deve: rispondere solo a codici casuali (≥128 bit), non avere login né scritture, non avere elenchi, mandare `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, mai HSTS. Nessun dato personale dei pazienti.

---

## 5. Reti Docker e firewall

Le app con una parte pubblica stanno su reti con **bridge dal nome fisso**, isolate da regole iptables (catene `DOCKER-USER` e `INPUT`): nessuna connessione nuova dal container verso LAN, tailnet, Internet o il Pi stesso. Restano le risposte alle richieste in arrivo e il traffico tra container dello stesso bridge.

| Bridge | Rete compose | Repo | Script (`/usr/local/sbin/`) | Servizio systemd |
|---|---|---|---|---|
| `br-parole` | `parole-net` | parole | `parole-firewall.sh` | `parole-firewall.service` |
| `br-giochi` | `giochi-net` | homepage | `giochi-firewall.sh` | `giochi-firewall.service` |
| `br-minigiochi` | `giochi-net` | minigiochi | `minigiochi-firewall.sh` | `minigiochi-firewall.service` |

Gli altri progetti (sillabe, chess, onlineemu, impostore, pizzapp, infernotuffatori) usano la rete predefinita del loro progetto. Impasti (`pizzapp`) esce su Internet solo per leggere le farine dal codice a barre su `world.openfoodfacts.org`; non riceve niente da Internet. Infernotuffatori esce su Internet una volta al giorno per aggiornare il catalogo dalla wiki di Helldivers 2 (`helldivers.wiki.gg`) e le icone degli stratagemmi e i nomi dei pianeti (`raw.githubusercontent.com`), e ogni 30 minuti per gli ordini di gioco: l'API del gioco (`api.live.prod.thehelldiversgame.com`, senza account) e DiveHarder (`api.diveharder.com`, Personal Order); solo letture, non riceve niente da Internet.

| Rete | Chi la crea | Chi la usa | A cosa serve |
|---|---|---|---|
| `ingresso-infernotuffatori` | `ingressi-https` (servizio `infernotuffatori`, nome fisso, bridge e sottorete automatici) | `infernotuffatori` (`external: true`, alias `infernotuffatori-app`) | l'ingresso HTTPS condiviso con l'amico arriva all'app senza usare la rete del Pi (sezione 4). Va creata prima di avviare l'app |

Le sottoreti le assegna Docker in automatico (`172.x`): **non fissare sottoreti a mano**, si rischia di scontrarsi con quelle esistenti.

Per un'app nuova con una parte pubblica: copiare lo schema di `minigiochi/firewall/`, con un bridge nuovo (nome di **massimo 15 caratteri**, non in tabella) e script e servizio con nomi nuovi. Verifica: `docker compose exec <servizio> wget -q -T 3 -O /dev/null http://192.168.1.1 && echo RAGGIUNTO || echo BLOCCATO` deve dire `BLOCCATO`. Le regole valgono per nome di bridge: per servizi su `network_mode: host` (container Tailscale) non si applicano.

---

## 6. Volumi Docker (dati da non perdere)

| Volume | Contenuto |
|---|---|
| `parole_parole-data` | parole, foto, esercizi, gruppi, impostazioni di Parole |
| `parole_tailscale-public-state` | identità del dispositivo `parole-esercizi` |
| `homepage_giochi-caricati`, `homepage_giochi-stato` | giochi caricati e gruppi della homepage |
| `minigiochi_giochi-caricati`, `minigiochi_giochi-stato` | giochi caricati e gruppi di Minigiochi |
| `onlineemu_db-data` | database di RomM (onlineEmu): libreria, utenti, salvataggi registrati |
| `onlineemu_cache` | cache di RomM, si può ricreare |
| cartella `~/onlineEmu/dati/` (bind mount, non un volume) | giochi, BIOS, salvataggi, copertine di onlineEmu: da includere nei backup |
| `pizzapp_dati` | ricette di Impasti e ImpastiPLUS, farine, lievito madre e impostazioni (`impasti.json`), con una copia al giorno in `backup/` (ultime 14); foto delle ricette di ImpastiPLUS in `foto/` (non sono in `impasti.json`: per salvarle serve il backup con tar del volume) |
| `infernotuffatori_dati` | build di Infernotuffatori (`build.json`, con una copia al giorno in `backup/`, ultime 14), catalogo aggiornato dalla wiki con le icone (`catalogo/`) e ordini di gioco con il loro storico (`ordini/`) |
| `ingressi-https_<app>-state` (9) | identità dei dispositivi Tailscale per app |
| volumi di Chess e Meteo | non gestiti qui |

Mai `docker compose down -v` né `docker volume prune` su questo Pi. Gli `update.sh` fanno solo `docker image prune -f` (immagini, non volumi).

---

## 7. Aggiornamenti automatici e flusso di lavoro

- Il Pi segue **`main`** in tutte le repo. Si lavora su un branch, si apre una PR verso `main`, l'utente la unisce su GitHub con **"Create a merge commit"** e **non cancella il branch**. Quando chiedi di unire una PR, dai il **link diretto** e verifica prima che sia ancora aperta.
- Ogni repo ha un `update.sh`: `git fetch`, e solo se ci sono commit nuovi `git pull --ff-only` + `docker compose up -d --build` (+ `docker image prune -f`). Gira da cron ogni 5 minuti, **senza `sudo`** (con sudo `.git` diventa di root e i pull si rompono).
- Crontab dell'utente `pepe` (le due righe di `ingressi-https` vanno aggiunte a mano dopo l'installazione: controllare con `crontab -l`):

  ```
  */5 * * * * cd /home/pepe/sillabe && ./update.sh >> /home/pepe/sillabe/update.log 2>&1
  */5 * * * * cd /home/pepe/homepage && ./update.sh >> /home/pepe/homepage/update.log 2>&1
  */5 * * * * cd /home/pepe/parole && ./update.sh >> /home/pepe/parole/update.log 2>&1
  30 4 * * 1 cd /home/pepe/parole && docker compose pull -q --ignore-buildable && docker compose build --pull -q && docker compose up -d >> /home/pepe/parole/update.log 2>&1
  */5 * * * * cd /home/pepe/Chess && ./update.sh >> /home/pepe/Chess/update.log 2>&1
  */5 * * * * cd /home/pepe/minigiochi && ./update.sh >> /home/pepe/minigiochi/update.log 2>&1
  */5 * * * * cd /home/pepe/ingressi-https && ./update.sh >> /home/pepe/ingressi-https/update.log 2>&1
  */5 * * * * cd /home/pepe/onlineEmu && ./update.sh >> /home/pepe/onlineEmu/update.log 2>&1
  */5 * * * * cd /home/pepe/impostore && ./update.sh >> /home/pepe/impostore/update.log 2>&1
  */5 * * * * cd /home/pepe/pizzapp && ./update.sh >> /home/pepe/pizzapp/update.log 2>&1
  */5 * * * * cd /home/pepe/infernotuffatori && ./update.sh >> /home/pepe/infernotuffatori/update.log 2>&1
  45 4 * * 1 cd /home/pepe/ingressi-https && docker compose pull -q && docker compose up -d >> /home/pepe/ingressi-https/update.log 2>&1
  ```

  Gli orari settimanali già usati: lunedì 4:30 e 4:45. Per un job settimanale nuovo scegliere un altro orario.
- Segreti (password, auth key) solo nel `.env` della repo sul Pi, **mai su git** (`.env` è in `.gitignore`). Per inserirli senza lasciarli nella cronologia: riga che inizia con uno spazio, ` read -rsp "Password: " P && echo "NOME=$P" >> .env && unset P && echo`.
- **Claude non può creare repo su GitHub** (errore 403): l'utente la crea a mano (Public, con "Add a README file" per avere `main`), poi Claude la collega con accesso in scrittura.
- Un file montato singolarmente (`./file:/percorso`) non vede gli aggiornamenti di `git pull`: montare la cartella, o ricreare il container (`--force-recreate`).

---

## 8. Checklist per un progetto nuovo

1. **Nome**: repo, cartella sul Pi e progetto compose con un nome nuovo (non in sezione 3).
2. **Porta**: la prima libera da 8092 in su, dopo averla verificata con `ss -ltn` (sezione 9). Pubblicare `"<porta>:<porta interna>"`, oppure `"127.0.0.1:<porta>:..."` se serve solo a un proxy.
3. **Immagini**: multi-arch o arm64 (es. `nginx:alpine`, `node:22-alpine`).
4. **Sicurezza** (come le altre app): `read_only: true` dove possibile, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, `pids_limit`, `restart: unless-stopped`. Se ha una parte pubblica: bridge con nome fisso e firewall come in sezione 5.
5. **Cookie**: i cookie del browser **non distinguono le porte**, quindi le app su `vito:<porta>` condividono i cookie. Nomi già usati: `s` (Parole, Path `/`), `giochi` (homepage, Path `/giochi/`), `minigiochi` (Minigiochi, Path `/api/`), `romm_session` e `romm_csrftoken` (onlineEmu, Path `/`). Usare un nome nuovo e specifico (es. `nomeapp_sess`).
6. **File statici**: dare nomi propri a CSS e JS (es. `nomeapp.css`), non `style.css` o `app.js`: Sillabe mette in cache CSS e JS per un giorno, e app sullo stesso nome host possono prendersi lo stile a vicenda.
7. **`update.sh`**: copiarlo da `homepage` o `minigiochi`, e aggiungere la riga di cron (sezione 7).
8. **HTTPS senza porta**: nella repo `ingressi-https` aggiungere `serve/<nome>.json` (copiandone uno e cambiando la porta) e un servizio nel compose con `TS_HOSTNAME: <nome>` e il suo volume. Al primo avvio serve una auth key (Reusable o monouso, non Ephemeral), poi Disable key expiry e revoca della chiave. **Mai** `tailscale serve` sull'host. Se il dispositivo andrà condiviso con qualcuno fuori dalla tailnet: rete sua, non `network_mode: host` (sezione 4).
9. **Homepage**: una riga in `homepage/app/apps.js` con `lanPort` e `tsHost: "<nome>"`.
10. **Parte pubblica** (se serve): prefisso nuovo in `parole/tailscale/serve.json` verso `127.0.0.1:<porta>`, poi ricreare `tailscale-public` (sezione 4).
11. **`CLAUDE.md`** nella repo nuova, copiato da una delle repo esistenti (sezione 11).
12. **Aggiornare questo file** (porte, nomi, volumi, cron) con una PR sulla repo `sillabe`, nello stesso lavoro.

---

## 9. Verificare lo stato reale prima di scegliere

Far lanciare all'utente sul Pi e lavorare sull'output, non su questo file:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
sudo ss -ltnup | grep -v '127.0.0.53'
tailscale serve status
docker network ls
docker volume ls
crontab -l
systemctl list-units --all '*firewall*'
```

Note:
- `sudo` chiede la password di `pepe`.
- Una porta è libera solo se **non** compare in `ss`: anche una porta su `127.0.0.1` è occupata.
- `docker compose up` stampa `Your kernel does not support memory limit...`: è normale (sezione 1).
- Subito dopo `docker compose up`, un `curl` può dare "Connection reset by peer": nginx non è ancora pronto, riprovare dopo qualche secondo.
- L'avviso nginx `duplicate MIME type "text/html"` è innocuo.

---

## 10. Cose aperte (da sapere)

- Parole ha il login **disattivato** (`DISABLE_LOGIN=1` nel `~/parole/.env`), in via temporanea.
- `vito` risulta ancora pubblicato nel DNS pubblico (residuo del vecchio funnel). Per toglierlo andrebbe ristretto il permesso funnel con un tag su `parole-esercizi` nelle regole del pannello Tailscale: rimandato dall'utente.
- La cartella `~/parole/meteo` sta dentro la clone di Parole: non dà problemi (non entra nell'immagine, git la ignora), ma un progetto nuovo va messo in `~/<nome>`, non dentro un'altra repo.
- Meteo e Chess non sono stati sviluppati in queste sessioni: per dettagli sulle loro configurazioni guardare le loro repo o chiedere all'utente.

---

## 11. Come le sessioni di Claude leggono e aggiornano questo file

Due livelli, perché nessuna sessione parta senza saperlo:

1. **`CLAUDE.md` in ogni repo del Pi** (sillabe, homepage, parole, minigiochi, ingressi-https, onlineEmu, impostore, pizzapp, infernotuffatori): Claude Code lo legge in automatico. Dice di rispondere in italiano, di leggere questo file prima di toccare l'infrastruttura, di aggiornarlo con una PR e come lavorare con l'utente. Una repo nuova deve averne uno uguale.
2. **Script di setup dell'ambiente cloud** (Claude Code sul web): per le sessioni su repo che non hanno ancora un `CLAUDE.md`. Le istruzioni stanno in **`claude-utente.md`** (questa repo); lo script le scarica a ogni nuova sessione e le mette tra le impostazioni personali di Claude Code (`~/.claude/CLAUDE.md`), così una modifica a `claude-utente.md` vale da sola per le sessioni successive. Nelle impostazioni dell'ambiente (menu dell'ambiente nella barra del titolo della sessione → Edit → **Setup script**) va questa riga; se si usano più ambienti, va messa in ognuno:

```bash
mkdir -p ~/.claude && curl -fsSL https://raw.githubusercontent.com/Vito-Pepe/sillabe/main/claude-utente.md -o ~/.claude/CLAUDE.md || true
```

`|| true`: se il download non riesce, la sessione parte lo stesso (senza istruzioni personali, ma con il `CLAUDE.md` della repo se c'è). Su un Mac con Claude Code installato: copiare `claude-utente.md` in `~/.claude/CLAUDE.md`.

`claude-utente.md` e i `CLAUDE.md` delle repo dicono le stesse cose: se si cambia una regola, cambiarla in tutti.
