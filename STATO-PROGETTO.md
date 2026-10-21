# Stato del progetto: app su Raspberry Pi 5 con Docker e Tailscale

Ultimo aggiornamento: 2026-10-21. Serve per riprendere il lavoro in una nuova sessione.

## Obiettivo

Far girare le mie app GitHub in container Docker su un Raspberry Pi 5, raggiungibili sia da casa (LAN) sia da fuori casa **solo tramite Tailscale**, senza aprire porte sul router.

## Stato attuale: funziona tutto

| App | Repo | LAN (http) | Tailscale (https) | Porta locale sul Pi |
|---|---|---|---|---|
| Homepage | `Vito-Pepe/homepage` | `http://192.168.1.22:8081` | `https://vito.<tailnet>.ts.net` (443) | 8081 |
| Sillabe | `Vito-Pepe/sillabe` | `http://192.168.1.22:8080` | `https://vito.<tailnet>.ts.net:8443` | 8080 |

Il nome della tailnet si legge con `tailscale serve status` sul Pi o nel pannello admin Tailscale.

Entrambe le repo hanno il lavoro sul branch `claude/docker-sillabe-raspberry-njmc8b`. **Non è stato fatto il merge su `main`**: il Pi clona e segue questo branch.

## Il Raspberry Pi

- Raspberry Pi OS Lite 64-bit, installazione pulita, collegato in Wi-Fi.
- Hostname `vito`, utente `pepe`, IP in LAN `192.168.1.22` (conviene assegnarlo fisso dal router).
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
3. Sul Pi: `git clone -b <branch> ...`, `docker compose up --build -d`, riga di cron per `update.sh`.
4. Pubblicazione: `sudo tailscale serve --bg --https=<porta> localhost:<porta-locale>`.
5. Una riga in `app/apps.js` della homepage con `lanPort` e `tsPort`.

Attenzione: `tailscale serve` accetta in HTTPS poche porte (da verificare, ma tipicamente 443, 8443 e 10000). Con la terza app le porte finiscono: valutare un reverse proxy locale (es. Caddy o nginx) con un percorso o un sottodominio per app.

## Cose imparate

- La sessione cloud di Claude non può fare SSH sul Pi (VM isolata, rete limitata). Per far eseguire i comandi a Claude serve Claude Code installato sul Mac. Altrimenti si incollano i comandi a mano.
- L'integrazione GitHub di Claude non può creare repo nuove (403): la repo vuota va creata a mano, poi si collega con accesso in scrittura.
- Il cron non deve usare `sudo`: i file di `.git` diventerebbero di root e i pull successivi fallirebbero.
- Sillabe mette in cache CSS e JS per 1 giorno. Visto che homepage e Sillabe hanno condiviso lo stesso indirizzo, la homepage prendeva lo stile di Sillabe: per questo il suo CSS si chiama `home.css`. Dare nomi di file diversi alle app che possono condividere un indirizzo.
- Dopo `usermod -aG docker` serve uscire e rientrare via SSH, altrimenti `docker` richiede `sudo`.
- `tailscale up` stampa un link di login monouso da aprire nel browser.

## Da fare

- [ ] Disattivare la scadenza della chiave per `vito` (pannello Tailscale > Machines > Disable key expiry), altrimenti il Pi esce dalla tailnet dopo circa 180 giorni.
- [ ] Verificare nel pannello Tailscale (DNS) che MagicDNS e HTTPS Certificates siano attivi.
- [ ] Decidere se fare il merge dei branch su `main` (poi far passare il Pi a `main` e non cancellare il branch finché il Pi lo segue).
- [ ] Assegnare un IP fisso al Pi dal router.
- [ ] Rimuovere dal pannello Tailscale i dispositivi vecchi offline (anche un `pihole` di quasi un anno fa).
- [ ] Scegliere la prossima app da aggiungere.

## Per riprendere con Claude

Apri una sessione sulla repo `sillabe` e di' di leggere questo file e `TAILSCALE.md`. Se vuoi che Claude esegua i comandi direttamente sul Pi, usa Claude Code installato sul Mac (stessa rete del Pi) e dagli IP e utente del Pi.
