# Stato del progetto: app su Raspberry Pi 5 con Docker e Tailscale

Ultimo aggiornamento: 2026-10-21. Serve per riprendere il lavoro in una nuova sessione.

## Obiettivo

Far girare le mie app GitHub in container Docker su un Raspberry Pi 5, raggiungibili sia da casa (LAN) sia da fuori casa **solo tramite Tailscale**, senza aprire porte sul router.

## Stato attuale: funziona tutto

| App | Repo | LAN (http) | Tailscale (https) | Porta locale sul Pi |
|---|---|---|---|---|
| Homepage | `Vito-Pepe/homepage` | `http://192.168.1.22:8081` | `https://vito.<tailnet>.ts.net` (443) | 8081 |
| Sillabe | `Vito-Pepe/sillabe` | `http://192.168.1.22:8080` | `https://vito.<tailnet>.ts.net:8443` | 8080 |
| Parole (app) | `Vito-Pepe/parole` | `http://192.168.1.22:8082` | `http://vito.<tailnet>.ts.net:8082` (http, cifrato da Tailscale) | 8082 |
| Parole (esercizi pubblici) | `Vito-Pepe/parole` | `http://192.168.1.22:8083` | **Internet**: `https://parole-esercizi.<tailnet>.ts.net/e/<codice>` (funnel da un dispositivo Tailscale separato, servizio `tailscale-public`; prima era `vito...:10000`) | 8083 |

Parole (da fare il deploy sul Pi, vedi `README.md` della repo) è diversa dalle altre: ha un piccolo server Node e un volume Docker `parole_parole-data` con elenco parole, foto, esercizi e codice (predefinito `7777`). Backup e recupero del codice sono nel suo README.

**Parole è l'unica cosa esposta su Internet**, e solo in parte: la logopedista (la mia ragazza) crea esercizi dall'app privata e manda ai pazienti un link. La porta pubblica (8083) mostra solo l'esercizio del link: niente login, niente scritture, niente elenchi. L'app non conserva dati personali dei pazienti: nel nome dell'esercizio non va il nome del paziente e le foto devono essere generiche. Il container è isolato dal firewall del Pi: non può aprire connessioni verso LAN, tailnet, Internet o il Pi stesso (resta solo il DNS interno di Docker). Ulteriore passo possibile: Pi su rete ospiti/VLAN.

Il nome della tailnet si legge con `tailscale serve status` sul Pi o nel pannello admin Tailscale.

**Il Pi segue `main`** in tutte e tre le repo. Flusso di lavoro: le modifiche si fanno su un branch, si apre una pull request verso `main` e la si unisce su GitHub con **"Create a merge commit"** (non squash né rebase). Entro 5 minuti il cron aggiorna il Pi. Per annullare una modifica: pulsante "Revert" sulla PR unita. Il branch `claude/docker-sillabe-raspberry-njmc8b` è quello di lavoro della prima sessione; in parole, `claude/parole-gruppi-esercizi` è già tutto dentro `main` e si può cancellare.

## Il Raspberry Pi

- Raspberry Pi OS Lite 64-bit, installazione pulita, collegato in Wi-Fi.
- Hostname `vito`, utente `pepe`, IP in LAN `192.168.1.22` (fisso, assegnato dal router).
- Accesso: `ssh pepe@192.168.1.22`. Il nome `vito.local` non sempre risolve.
- Installati: Docker + plugin compose (script get.docker.com), Tailscale (script ufficiale), git, cron.
- Tailscale gira sull'host, non in un container. Il Pi compare nella tailnet come `vito` (`100.96.58.127`).
- Raspberry Pi Connect non attivato (non serve).

## Come funziona

1. Ogni app è un sito statico servito da nginx in un container (`docker compose`), con la porta pubblicata su tutte le interfacce, quindi raggiungibile dalla LAN.
2. `tailscale serve` pubblica le porte locali sulla tailnet in HTTPS: `443 -> localhost:8081` (homepage) e `8443 -> localhost:8080` (Sillabe). Funziona solo per i dispositivi autenticati sulla tailnet, da qualunque rete.
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

# Aggiornare subito a mano
cd ~/sillabe && ./update.sh
cd ~/homepage && ./update.sh

# Log di un container
cd ~/sillabe && docker compose logs --tail 30 sillabe
```

## Aggiungere una nuova app

1. Nuova repo con Dockerfile, `docker-compose.yml`, `nginx.conf`, `update.sh` (copiarli da `homepage`).
2. Porta locale libera diversa da 8080 e 8081 (es. 8082).
3. Sul Pi: `git clone https://github.com/Vito-Pepe/<repo>.git` (segue `main`), `docker compose up --build -d`, riga di cron per `update.sh`.
4. Pubblicazione: `sudo tailscale serve --bg --https=<porta> localhost:<porta-locale>`.
5. Una riga in `app/apps.js` della homepage con `lanPort` e `tsPort`.

Attenzione: `tailscale serve` accetta in HTTPS poche porte (da verificare, ma tipicamente 443, 8443 e 10000). Con Parole sono tutte usate: per la quarta app serve un reverse proxy locale (es. Caddy o nginx) con un percorso o un sottodominio per app.

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
- [ ] Scegliere la prossima app da aggiungere.

## Per riprendere con Claude

Apri una sessione sulla repo `sillabe` e di' di leggere questo file e `TAILSCALE.md`. Se vuoi che Claude esegua i comandi direttamente sul Pi, usa Claude Code installato sul Mac (stessa rete del Pi) e dagli IP e utente del Pi.
