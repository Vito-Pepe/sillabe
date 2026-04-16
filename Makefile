.PHONY: up down build update logs shell

# Avvia l'app (o la ricostruisce se gia' in esecuzione)
up:
	docker compose up --build -d

# Ferma l'app
down:
	docker compose down

# Ricostruisce l'immagine senza avviare
build:
	docker compose build

# Aggiorna dal repository e riavvia
update:
	@bash update.sh

# Segui i log in tempo reale
logs:
	docker compose logs -f sillabe

# Shell dentro il container (per debug)
shell:
	docker compose exec sillabe sh
