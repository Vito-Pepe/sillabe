#!/usr/bin/env bash
# update.sh — aggiorna l'app sul Raspberry Pi
# Uso: ./update.sh
# Prerequisiti: git, docker, docker compose

set -e

echo "==> Pull delle ultime modifiche..."
git pull origin main

echo "==> Rebuild e riavvio del container..."
docker compose up --build -d

echo "==> Pulizia immagini obsolete..."
docker image prune -f

echo ""
echo "Aggiornamento completato. App disponibile su http://localhost"
