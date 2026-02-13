.PHONY: help build up down logs restart clean test kafka pulsar kinesis dev dev-watch dev-deps

# Default target
help:
	@echo "Rust Analytics API - Docker Commands"
	@echo ""
	@echo "Usage:"
	@echo "  make build          Build the Docker image"
	@echo "  make up             Start all services (Kafka by default)"
	@echo "  make down           Stop all services"
	@echo "  make logs           View logs from all services"
	@echo "  make restart        Restart the analytics-api service"
	@echo "  make clean          Remove all containers, volumes, and images"
	@echo "  make test           Send a test event to the API"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev            Run API locally (requires local Kafka)"
	@echo "  make dev-watch      Run API with hot reload (auto-restart on changes)"
	@echo "  make dev-deps       Start only dependencies (Kafka, etc.) for local dev"
	@echo ""
	@echo "Streaming Service Profiles:"
	@echo "  make kafka          Start with Kafka (default)"
	@echo "  make pulsar         Start with Pulsar"
	@echo "  make kinesis        Start with Kinesis (LocalStack)"
	@echo ""

# Build the Docker image
build:
	docker-compose build analytics-api

# Start services with Kafka (default)
up:
	docker-compose up -d

# Start with Kafka explicitly
kafka:
	docker-compose up -d

# Start with Pulsar
pulsar:
	@echo "Starting with Pulsar..."
	@echo "Remember to update config.yaml to use Pulsar!"
	docker-compose --profile pulsar up -d

# Start with Kinesis (LocalStack)
kinesis:
	@echo "Starting with Kinesis (LocalStack)..."
	@echo "Remember to update config.yaml to use Kinesis!"
	docker-compose --profile kinesis up -d
	@echo "Waiting for LocalStack to be ready..."
	@sleep 5
	@echo "Creating Kinesis stream..."
	@AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws --endpoint-url=http://localhost:4566 kinesis create-stream --stream-name analytics-events --shard-count 1 || true

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# View logs for specific service
logs-api:
	docker-compose logs -f analytics-api

logs-kafka:
	docker-compose logs -f kafka

# Restart the API service
restart:
	docker-compose restart analytics-api

# Rebuild and restart the API
rebuild:
	docker-compose up -d --build analytics-api

# Clean up everything
clean:
	docker-compose down -v --rmi all

# Send a test event
test:
	@echo "Sending test pageview event..."
	curl -v "http://localhost:8080/track/?project=test&event=pageview&timestamp=$$(date +%s)000&cookie=user123&url=https://example.com/test&title=Test%20Page&e_button=click&u_email=test@example.com"
	@echo ""
	@echo ""
	@echo "Check Kafka UI at http://localhost:8090 to see the event"

# View Kafka messages
kafka-messages:
	docker exec -it kafka kafka-console-consumer \
		--bootstrap-server localhost:29092 \
		--topic analytics-events \
		--from-beginning \
		--max-messages 10

# Check service health
health:
	@echo "Checking service health..."
	@echo ""
	@echo "Analytics API:"
	@curl -s http://localhost:8080/health || echo "API not responding"
	@echo ""
	@echo ""
	@echo "Kafka:"
	@docker-compose ps kafka
	@echo ""
	@echo "Kafka UI: http://localhost:8090"

# Setup: Create necessary directories and files
setup:
	@echo "Setting up environment..."
	mkdir -p data
	@if [ ! -f config.yaml ]; then \
		echo "Creating config.yaml from docker template..."; \
		cp config.docker.yaml config.yaml; \
	fi
	@echo ""
	@echo "Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Download GeoLite2-City.mmdb and place it in ./data/"
	@echo "2. Run 'make up' to start services"
	@echo "3. Run 'make test' to send a test event"

# Development: Run API locally (requires local Kafka or dev-deps)
dev:
	@echo "Starting API in development mode..."
	@echo "Make sure Kafka is running (use 'make dev-deps' to start dependencies)"
	cargo run

# Development: Run API with hot reload
dev-watch:
	@echo "Starting API with hot reload..."
	@echo "Make sure Kafka is running (use 'make dev-deps' to start dependencies)"
	@echo ""
	@command -v cargo-watch >/dev/null 2>&1 || { \
		echo "cargo-watch not found. Installing..."; \
		cargo install cargo-watch; \
	}
	cargo watch -x run

# Development: Start only dependencies (Kafka, Zookeeper, Kafka UI)
dev-deps:
	@echo "Starting development dependencies (Kafka, Zookeeper, Kafka UI)..."
	docker-compose up -d kafka zookeeper kafka-ui
	@echo ""
	@echo "Dependencies started!"
	@echo "Kafka: localhost:9092"
	@echo "Kafka UI: http://localhost:8090"
	@echo ""
	@echo "Now run 'make dev' or 'make dev-watch' to start the API locally"

# Development: Stop dependencies
dev-deps-down:
	docker-compose stop kafka zookeeper kafka-ui
