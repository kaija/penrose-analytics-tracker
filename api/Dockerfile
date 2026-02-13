# Multi-stage Dockerfile for Rust Analytics API
# Stage 1: Builder - Compile the Rust application
FROM rustlang/rust:nightly-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create a new empty project
WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build the application in release mode
RUN cargo build --release --bin rust-analytics-api

# Stage 2: Runtime - Minimal image with compiled binary
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -u 1000 apiuser

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/target/release/rust-analytics-api /app/rust-analytics-api

# Change ownership to non-root user
RUN chown -R apiuser:apiuser /app

# Switch to non-root user
USER apiuser

# Expose the API port (default 8080, can be overridden by config)
EXPOSE 8080

# Run the binary
CMD ["/app/rust-analytics-api"]
