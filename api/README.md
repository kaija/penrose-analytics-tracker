# Rust Analytics API

A high-performance HTTP server built with Rust that receives analytics events from JavaScript tracking clients, enriches them with geolocation and user-agent data, and streams them to configurable message brokers (Kafka, AWS Kinesis, or Apache Pulsar).

## Features

- **High Performance**: Async I/O with Tokio runtime for concurrent request handling
- **Multiple Streaming Services**: Support for Kafka, AWS Kinesis, and Apache Pulsar
- **Data Enrichment**: Automatic GeoIP lookup and User-Agent parsing
- **Structured Data**: Transforms flat query parameters into nested JSON objects
- **Docker Ready**: Multi-stage Dockerfile and docker-compose setup
- **Graceful Shutdown**: Handles SIGTERM/SIGINT signals cleanly
- **Structured Logging**: JSON-formatted logs for easy parsing and analysis

## Quick Start

Get up and running in under 5 minutes:

```bash
cd api
make setup    # Create config and data directories
make up       # Start all services with Docker
make test     # Send a test event
```

View events at http://localhost:8090 (Kafka UI)

For detailed quick start instructions, see [QUICK_START.md](./QUICK_START.md).

## Table of Contents

- [Architecture](#architecture)
- [Performance](#performance)
- [API Endpoints](#api-endpoints)
- [Setup](#setup)
  - [Local Development](#local-development)
  - [Docker Setup](#docker-setup)
- [Configuration](#configuration)
- [Data Model](#data-model)
- [Development](#development)
- [Testing](#testing)
- [Performance Testing](#performance-testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Architecture

The API follows a pipeline architecture:

```
HTTP Request → Validation → Transformation → Enrichment → Streaming
```

## Performance

**High-performance event tracking API built with Rust and Tokio**

- 🚀 **2,415 RPS** - Handles 2,415+ requests per second
- ⚡ **41ms latency** - Mean response time under load
- 📊 **70ms P95** - 95% of requests complete in under 70ms
- ✅ **0% errors** - Zero errors across 145,000+ test requests
- 📈 **Linear scaling** - Performance scales with concurrency

See [PERFORMANCE_RESULTS.md](./PERFORMANCE_RESULTS.md) for detailed benchmarks.

### Components

1. **HTTP Layer** (Axum): Receives GET/POST requests at `/track/`, `/identify`, `/update`
2. **Request Handler**: Extracts and validates query parameters and form data
3. **Transformer**: Converts flat parameters into structured JSON with nested objects
4. **Enrichment Pipeline**:
   - User-Agent Parser: Extracts browser, OS, and device information
   - GeoIP Lookup: Adds country, region, city, and coordinates
5. **Streaming Service**: Sends enriched events to Kafka/Kinesis/Pulsar

## API Endpoints

### POST/GET /track/

Track analytics events (pageviews, clicks, custom events).

**Example:**
```bash
curl "http://localhost:8080/track/?project=myapp&event=pageview&timestamp=1704067200000&cookie=user123&url=https://example.com/page&title=Example%20Page&e_button=signup&u_email=user@example.com"
```

**Parameters:**
- `project` (required): Project identifier
- `event` (required): Event type (e.g., pageview, click)
- `timestamp` (required): Unix timestamp in milliseconds
- `cookie`: User cookie/session ID
- `url`: Page URL
- `title`: Page title
- `e_*`: Event-specific parameters (prefix removed in output)
- `u_*`: User profile properties (prefix removed in output)
- `s_*`: Session properties (prefix removed in output)
- `p_*`: Project properties (prefix removed in output)

### POST/GET /identify

Identify users with profile data.

**Example:**
```bash
curl "http://localhost:8080/identify?project=myapp&event=identify&timestamp=1704067200000&u_id=user123&u_email=user@example.com&u_name=John%20Doe"
```

### POST/GET /update

Update existing events with additional data (e.g., duration, scroll depth).

**Example:**
```bash
curl "http://localhost:8080/update?id=evt_123&duration=5000&scroll_depth=75"
```

**Parameters:**
- `id` (required): Event ID to update
- `duration`: Time spent on page (milliseconds)
- `scroll_depth`: Scroll percentage (0-100)

## Setup

### Prerequisites

- Rust 1.70+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- GeoIP database file: [GeoLite2-City.mmdb](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)

### Local Development

1. **Clone and navigate to the project:**
   ```bash
   cd api
   ```

2. **Download GeoIP database:**
   ```bash
   mkdir -p data
   # Download GeoLite2-City.mmdb from MaxMind and place in ./data/
   ```

3. **Create configuration file:**
   ```bash
   cp config.example.yaml config.yaml
   ```

4. **Update config.yaml for local development:**
   ```yaml
   server:
     host: "127.0.0.1"
     port: 8080

   streaming:
     service_type: kafka
     kafka:
       brokers: ["localhost:9092"]
       topic: "analytics-events"

   geoip:
     database_path: "./data/GeoLite2-City.mmdb"

   logging:
     level: "debug"
   ```

5. **Start Kafka locally** (or use Docker):
   ```bash
   # Using Docker
   docker-compose up -d kafka zookeeper
   ```

6. **Build and run:**
   ```bash
   cargo build --release
   cargo run --release
   ```

7. **Test the API:**
   ```bash
   curl "http://localhost:8080/track/?project=test&event=pageview&timestamp=$(date +%s)000&cookie=user123&url=https://example.com"
   ```

### Docker Setup

See [DOCKER.md](./DOCKER.md) for comprehensive Docker documentation.

**Quick Docker start:**

```bash
# Setup environment
make setup

# Start with Kafka (default)
make up

# Or start with Pulsar
make pulsar

# Or start with Kinesis (LocalStack)
make kinesis

# Send test event
make test

# View logs
make logs
```

## Configuration

Configuration is managed via a YAML file. See [config.example.yaml](./config.example.yaml) for all available options.

### Server Configuration

```yaml
server:
  host: "0.0.0.0"  # Bind address (0.0.0.0 for Docker, 127.0.0.1 for local)
  port: 8080       # HTTP port
```

### Streaming Service Configuration

**Kafka:**
```yaml
streaming:
  service_type: kafka
  kafka:
    brokers:
      - "localhost:9092"
    topic: "analytics-events"
```

**AWS Kinesis:**
```yaml
streaming:
  service_type: kinesis
  kinesis:
    region: "us-east-1"
    stream_name: "analytics-events"
```

**Apache Pulsar:**
```yaml
streaming:
  service_type: pulsar
  pulsar:
    url: "pulsar://localhost:6650"
    topic: "analytics-events"
```

### GeoIP Configuration

```yaml
geoip:
  database_path: "/path/to/GeoLite2-City.mmdb"
```

**Note:** The API works without GeoIP - location fields will be null if the database is unavailable.

### Logging Configuration

```yaml
logging:
  level: "info"  # Options: trace, debug, info, warn, error
```

## Data Model

### Input (Query Parameters)

Flat key-value pairs with special prefixes:
- `e_*`: Event parameters → `event_param` object
- `u_*`: User properties → `profile` object
- `s_*`: Session properties → root level
- `p_*`: Project properties → root level

### Output (JSON)

Structured JSON with nested objects:

```json
{
  "project": "myapp",
  "event": "pageview",
  "id": "evt_123",
  "timestamp": 1704067200000,
  "session_id": "sess_abc",
  
  "visit": {
    "cookie": "user123",
    "url": "https://example.com/page",
    "title": "Example Page",
    "duration": 5000,
    "scroll_depth": 75
  },
  
  "event_param": {
    "button": "signup"
  },
  
  "profile": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  
  "browser": "Chrome",
  "browser_version": "120.0",
  "os": "Windows",
  "os_version": "10",
  "device": "Desktop",
  
  "country": "United States",
  "region": "California",
  "city": "San Francisco",
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

## Development

### Project Structure

```
api/
├── src/
│   ├── main.rs              # Application entry point
│   ├── lib.rs               # Library exports
│   ├── logging.rs           # Logging setup
│   ├── config/              # Configuration management
│   ├── handlers/            # HTTP request handlers
│   ├── transformer/         # Parameter transformation
│   ├── enrichment/          # User-Agent & GeoIP enrichment
│   └── streaming/           # Streaming service implementations
├── tests/                   # Integration tests
├── .cargo/
│   └── config.toml         # Cargo configuration and aliases
├── Cargo.toml              # Rust dependencies
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Local development setup
└── config.example.yaml     # Configuration template
```

### Development Workflow

**1. Initial Setup**
```bash
# Clone and navigate
cd api

# Setup environment (creates config.yaml, data directory)
make setup

# Download GeoIP database (optional, API works without it)
# Place GeoLite2-City.mmdb in ./data/
```

**2. Start Development Environment**
```bash
# Option A: Full Docker environment
make up              # Start all services including API

# Option B: Local development with hot reload
make dev-deps        # Start only Kafka/dependencies
make dev-watch       # Run API locally with auto-reload
```

**3. Development Cycle**
```bash
# Make code changes in src/
# API automatically restarts (if using dev-watch)

# Run tests
cargo test

# Check code quality
cargo clippy
cargo fmt
```

**4. Testing Changes**
```bash
# Send test event
make test

# View events in Kafka UI
open http://localhost:8090

# View API logs
make logs-api        # Docker
# or watch terminal output for local dev
```

### Hot Reload

For development with automatic reloading on file changes:

**Option 1: Using Make (Recommended)**
```bash
# Start dependencies (Kafka, etc.)
make dev-deps

# Run with auto-reload (installs cargo-watch if needed)
make dev-watch
```

**Option 2: Using Cargo directly**
```bash
# Install cargo-watch (one-time setup)
cargo install cargo-watch

# Run with auto-reload
cargo watch -x run

# Or use the cargo alias (defined in .cargo/config.toml)
cargo dev
```

**Option 3: Using Cargo aliases**

The `.cargo/config.toml` file defines several useful aliases:
```bash
cargo dev          # Watch and run (same as cargo watch -x run)
cargo dev-test     # Watch and test
cargo dev-check    # Watch and check (faster than full build)
cargo dev-clippy   # Watch and lint
```

**What gets watched:**
- All `.rs` files in `src/`
- `Cargo.toml` changes
- Configuration files (requires manual restart)

**Tips:**
- Use `cargo dev-check` for faster feedback during development
- Use `cargo dev-test` to run tests automatically on changes
- The API will restart automatically when code changes are detected
- Configuration changes require a manual restart

### Running Tests

```bash
# Run all tests
cargo test

# Run specific test module
cargo test --test router_test

# Run with output
cargo test -- --nocapture

# Run property-based tests (longer)
cargo test --release -- --ignored
```

### Code Quality

```bash
# Format code
cargo fmt

# Lint code
cargo clippy

# Check without building
cargo check
```

## Testing

The project uses a dual testing approach:

### Unit Tests

Test specific examples and edge cases:
```bash
cargo test --lib
```

### Property-Based Tests

Verify universal properties across random inputs:
```bash
cargo test --test property_tests
```

### Integration Tests

Test end-to-end flows:
```bash
cargo test --test integration_tests
```

## Performance Testing

The API achieves **2,415 requests per second** with 100 concurrent connections.

### Quick Performance Test

```bash
# Run 30-second performance test
python3 perf_test_simple.py --duration 30 --concurrency 100
```

### Performance Metrics

- **RPS**: 2,415.87 req/s
- **Mean Latency**: 41.12ms
- **P95 Latency**: 69.89ms
- **P99 Latency**: 91.83ms
- **Error Rate**: 0.00%

### Documentation

- [Quick Performance Test Guide](./QUICK_PERF_TEST.md) - Run tests in 1 minute
- [Performance Testing Guide](./PERFORMANCE_TEST.md) - Detailed testing instructions
- [Performance Results](./PERFORMANCE_RESULTS.md) - Full analysis and benchmarks

### Available Test Tools

1. **Simple Python Test** (no dependencies)
   ```bash
   python3 perf_test_simple.py --duration 30 --concurrency 100
   ```

2. **Async Python Test** (requires aiohttp)
   ```bash
   pip3 install aiohttp
   python3 performance_test.py --duration 30 --concurrency 100
   ```

3. **wrk-based Test** (highest performance)
   ```bash
   brew install wrk  # macOS
   ./performance_test.sh
   ```

For more details, see [PERFORMANCE_TEST.md](./PERFORMANCE_TEST.md).

## Deployment

### Production Checklist

- [ ] Use external Kafka/Kinesis/Pulsar (not docker-compose services)
- [ ] Configure proper resource limits
- [ ] Set logging level to `info` or `warn`
- [ ] Use secrets management for credentials
- [ ] Set up monitoring and alerting
- [ ] Configure reverse proxy for SSL termination
- [ ] Update GeoIP database regularly (weekly)
- [ ] Deploy multiple instances behind a load balancer

### Docker Production Deployment

```bash
# Build production image
docker build -t rust-analytics-api:latest .

# Run with production config
docker run -d \
  -p 8080:8080 \
  -v /path/to/config.yaml:/app/config.yaml:ro \
  -v /path/to/GeoLite2-City.mmdb:/app/data/GeoLite2-City.mmdb:ro \
  --name analytics-api \
  rust-analytics-api:latest
```

### Kubernetes Deployment

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-api
  template:
    metadata:
      labels:
        app: analytics-api
    spec:
      containers:
      - name: api
        image: rust-analytics-api:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config
          mountPath: /app/config.yaml
          subPath: config.yaml
        - name: geoip
          mountPath: /app/data/GeoLite2-City.mmdb
          subPath: GeoLite2-City.mmdb
      volumes:
      - name: config
        configMap:
          name: analytics-api-config
      - name: geoip
        persistentVolumeClaim:
          claimName: geoip-database
```

### Graceful Shutdown

The API handles SIGTERM and SIGINT signals gracefully:
- Stops accepting new connections
- Waits for in-flight requests to complete
- Closes streaming service connections
- Exits cleanly

See [GRACEFUL_SHUTDOWN.md](./GRACEFUL_SHUTDOWN.md) for details.

## Troubleshooting

### API won't start

**Check logs:**
```bash
# Docker
docker-compose logs analytics-api

# Local
cargo run
```

**Common issues:**
- Config file not found: Ensure `config.yaml` exists
- GeoIP database not found: Check path in config (API works without it)
- Streaming service connection failed: Verify broker/stream is accessible

### No events in streaming service

**Check API logs:**
```bash
make logs-api
```

**Verify streaming service:**
```bash
# Kafka
docker-compose ps kafka

# View Kafka messages
make kafka-messages
```

**Test with curl:**
```bash
make test
```

### GeoIP errors

The API works without GeoIP - location fields will be null.

**To fix:**
1. Download GeoLite2-City.mmdb from MaxMind
2. Place in `./data/` directory
3. Update config.yaml path
4. Restart API

### Performance issues

**Check resource usage:**
```bash
docker stats analytics-api
```

**Optimize:**
- Increase Docker memory limits
- Scale horizontally (multiple instances)
- Use connection pooling (already enabled)
- Tune Kafka/Kinesis/Pulsar settings

## Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Comprehensive development guide with hot reload setup
- [QUICK_START.md](./QUICK_START.md) - Get started in 5 minutes
- [DOCKER.md](./DOCKER.md) - Comprehensive Docker guide
- [GRACEFUL_SHUTDOWN.md](./GRACEFUL_SHUTDOWN.md) - Shutdown handling details
- [config.example.yaml](./config.example.yaml) - Configuration reference

## Requirements

This implementation satisfies all requirements from the specification:
- ✅ HTTP endpoints for /track/, /identify, /update
- ✅ GET and POST method support with parameter merging
- ✅ Query parameter transformation with nested objects
- ✅ User-Agent parsing (browser, OS, device)
- ✅ GeoIP enrichment (country, region, city, coordinates)
- ✅ Streaming service abstraction (Kafka, Kinesis, Pulsar)
- ✅ YAML configuration management
- ✅ Docker support with multi-stage builds
- ✅ Structured logging with configurable levels
- ✅ Error handling and graceful degradation
- ✅ Async I/O for high performance

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
