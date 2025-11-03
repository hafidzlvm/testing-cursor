.PHONY: up down restart logs ps backup restore clean shell

# Start database services
up:
	docker-compose up -d

# Stop database services
down:
	docker-compose stop

# Stop and remove containers
down-clean:
	docker-compose down

# Stop and remove containers + volumes (WARNING: Deletes all data!)
down-volumes:
	docker-compose down -v

# Restart services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f postgres

# Check service status
ps:
	docker-compose ps

# Connect to database shell
shell:
	docker exec -it omnichannel-postgres psql -U omnichannel -d omnichannel

# Backup database
backup:
	docker exec omnichannel-postgres pg_dump -U omnichannel omnichannel > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backup_$(shell date +%Y%m%d_%H%M%S).sql"

# Restore database from backup file
restore:
	@read -p "Enter backup filename: " file; \
	docker exec -i omnichannel-postgres psql -U omnichannel omnichannel < $$file

# Clean all (containers, volumes, networks)
clean:
	docker-compose down -v
	docker volume prune -f

# Initialize fresh database
init:
	docker-compose down -v
	docker-compose up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Database initialized!"

# Show database size
size:
	docker exec omnichannel-postgres psql -U omnichannel -d omnichannel -c "SELECT pg_size_pretty(pg_database_size('omnichannel')) as database_size;"

# Show table sizes
table-sizes:
	docker exec omnichannel-postgres psql -U omnichannel -d omnichannel -c "\dt+"

# Health check
health:
	docker-compose ps
	@echo "\nTesting connection..."
	@docker exec omnichannel-postgres pg_isready -U omnichannel

