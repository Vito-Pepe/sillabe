# Deploy sicuro su Raspberry Pi 5 via Tailscale

Questa guida copre il bootstrap completo di un Raspberry Pi 5 **appena flashato** e la pubblicazione dell'app Sillabe in modo che sia raggiungibile in due modi contemporaneamente:

- **dalla LAN di casa**, come un qualunque servizio sulla rete locale (`http://IP-DEL-PI:8080`);
- **da remoto tramite Tailscale**, da qualunque rete nel mondo, autenticato con il tuo account (Tailscale è una mesh VPN WireGuard, non limitata alla rete di casa).

Nessuna porta viene aperta sul router: l'accesso da remoto passa solo dalla tailnet, mentre quello da LAN resta comunque limitato ai dispositivi già dentro la tua rete locale.

Tutti i comandi vanno eseguiti **via SSH direttamente sul Raspberry Pi**, aperto tu dal tuo Mac/PC. Questo file non sostituisce `DEPLOY.txt` per le basi di Docker: lo estende con la parte di rete/sicurezza.

## Indice

- A. Bootstrap del Raspberry Pi da zero
- B. Installazione di Tailscale sul Pi
- C. Deploy dell'app Sillabe
- D. Pubblicazione sulla tailnet
- E. Aggiornamento automatico
- F. Pattern ripetibile per altre app
- G. Troubleshooting

---

## A. Bootstrap del Raspberry Pi da zero

Presupposto: hai flashato Raspberry Pi OS **64-bit** con Raspberry Pi Imager e abilitato SSH nelle "Impostazioni avanzate" durante il flashing (oppure con `sudo raspi-config` → Interface Options → SSH, se il Pi ha già un monitor collegato).

Connettiti via SSH dal tuo Mac/PC:

```bash
ssh pi@<IP-DEL-PI>
```

Poi, sul Pi:

```bash
# 1. Aggiorna il sistema
sudo apt update && sudo apt full-upgrade -y

# 2. Installa Docker Engine + plugin compose (script ufficiale)
curl -fsSL https://get.docker.com | sh

# 3. Aggiungi il tuo utente al gruppo docker (evita di scrivere sudo ogni volta)
sudo usermod -aG docker $USER
```

Disconnettiti e riconnettiti via SSH (o esegui `newgrp docker`) perché il nuovo gruppo abbia effetto, poi verifica:

```bash
docker --version
docker compose version
```

## B. Installazione di Tailscale sul Pi

Tailscale va installato **sul sistema operativo del Raspberry Pi** (non in un container): è un servizio di sistema che gira sull'host.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

`tailscale up` stampa un link: aprilo in un browser qualsiasi (anche dal telefono) per autenticare il Pi con il tuo account Tailscale.

Verifica:

```bash
tailscale status
tailscale ip -4
```

`tailscale ip -4` ti mostra l'IP del Pi sulla tailnet, e `tailscale status` mostra anche il nome MagicDNS della macchina (es. `raspberrypi`).

Nel pannello admin di Tailscale (https://login.tailscale.com/admin), se non sono già attivi:
- Abilita **MagicDNS**
- Abilita **HTTPS Certificates**

Servono per pubblicare l'app con HTTPS automatico al passo D.

## C. Deploy dell'app Sillabe

Clona la repo sul Pi:

```bash
git clone https://github.com/Vito-Pepe/sillabe.git
cd sillabe
```

Avvia il container (già configurato in `docker-compose.yml` per ascoltare sulla porta `8080` di tutte le interfacce):

```bash
docker compose up --build -d
# oppure: make up
```

Verifica che risponda in locale:

```bash
curl -I http://127.0.0.1:8080
```

Dovresti vedere `HTTP/1.1 200 OK`. A questo punto l'app è già raggiungibile anche da un altro dispositivo sulla LAN, su `http://IP-DEL-PI:8080` — la pubblicazione su Tailscale al passo D aggiunge l'accesso da remoto, non sostituisce quello locale.

## D. Pubblicazione sulla tailnet

```bash
sudo tailscale serve --bg --https=443 localhost:8080
```

- `--bg` rende la pubblicazione persistente in background (sopravvive alla chiusura della sessione SSH).
- `--https=443` pubblica il servizio con HTTPS automatico, usando i certificati Tailscale.

Verifica:

```bash
tailscale serve status
```

Accedi da qualunque dispositivo collegato alla tua tailnet (telefono, laptop, da casa o in giro):

```
https://<nome-macchina>.<nome-tailnet>.ts.net
```

Il nome esatto lo trovi nell'output di `tailscale status` o nel pannello admin.

**Riepilogo accesso**: da questo punto l'app è raggiungibile in due modi paralleli — `http://IP-DEL-PI:8080` per chi è già sulla tua LAN, e `https://<nome-macchina>.<nome-tailnet>.ts.net` per chi è autenticato sulla tua tailnet da qualunque altra rete. Nessuna porta è comunque aperta sul router: l'accesso da fuori casa passa solo da Tailscale.

## E. Aggiornamento automatico

Lo script `update.sh` nella repo controlla se ci sono commit nuovi sul branch attualmente in uso sul Pi (quello con cui hai clonato) prima di fare qualunque cosa: se non c'è nulla di nuovo esce subito senza toccare il container, altrimenti fa pull, rebuild e riavvio. Questo lo rende sicuro da eseguire periodicamente via cron, oltre che a mano con `./update.sh` o `make update`.

Per farlo girare automaticamente ogni volta che pushi sul branch, apri il crontab del tuo utente sul Pi:

```bash
crontab -e
```

e aggiungi una riga (esempio: controllo ogni 5 minuti — sostituisci `<utente>` con il tuo utente, es. `pi`):

```
*/5 * * * * cd /home/<utente>/sillabe && ./update.sh >> /home/<utente>/sillabe/update.log 2>&1
```

Verifica che cron esegua il job:

```bash
grep CRON /var/log/syslog
# oppure, su sistemi con journald:
journalctl -u cron
```

Consulta il log degli aggiornamenti automatici:

```bash
tail -f /home/<utente>/sillabe/update.log
```

Alternativa più "system" (opzionale, non necessaria): un systemd timer al posto di cron. Cron resta la scelta di default qui perché è già disponibile su Raspberry Pi OS senza dipendenze aggiuntive ed è coerente con la semplicità del resto del progetto.

## F. Pattern ripetibile per altre app

Per ogni nuova app della tua GitHub org che vuoi containerizzare sullo stesso Raspberry Pi:

1. Clona la repo in una cartella propria (es. `~/nome-app`).
2. Nel suo `docker-compose.yml`, lega la porta a `<porta-locale>:<porta-interna>`, scegliendo una porta locale libera diversa da `8080` (es. `8081`, `8082`, ...) — così è già raggiungibile anche dalla LAN, come sillabe.
3. Pubblica con un comando `tailscale serve` dedicato per l'accesso da remoto (Tailscale supporta più mapping — porte HTTPS diverse o path diversi sullo stesso hostname).

Non serve installare Tailscale più volte né usare un container sidecar per app: una singola installazione di Tailscale sul Pi (fatta al passo B) basta per tutte le app che ci farai girare.

## G. Troubleshooting

**`curl -I http://127.0.0.1:8080` non risponde**
Controlla prima Docker, non Tailscale:
```bash
docker ps
docker compose logs -f sillabe
```

**Il nome MagicDNS non risolve da un altro dispositivo**
Verifica che anche quel dispositivo sia loggato sulla stessa tailnet (`tailscale status` su quel device) e che MagicDNS sia abilitato nel pannello admin Tailscale.

**Dopo un riavvio del Pi**
Docker e Tailscale ripartono da soli come servizi di sistema (systemd), ma conviene verificare:
```bash
docker ps
tailscale serve status
```
Se `tailscale serve` non risulta più attivo, ripeti il comando del passo D (con `--bg` dovrebbe persistere ai riavvii, ma è buona norma controllare dopo un aggiornamento di sistema).
