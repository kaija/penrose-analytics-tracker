mod config;
mod enrichment;
mod handlers;
mod logging;
mod streaming;
mod transformer;

use std::sync::Arc;

use config::load_config;
use enrichment::geoip::GeoIpLookup;
use enrichment::user_agent::{UserAgentParser, WootheeParser};
use handlers::AppState;
use logging::init_logging;
use streaming::create_streaming_service;

#[tokio::main]
async fn main() {
    // Load configuration from YAML file
    // Validates: Requirement 8.1
    let config = match load_config("config.yaml") {
        Ok(cfg) => cfg,
        Err(e) => {
            eprintln!("Failed to load configuration: {}", e);
            std::process::exit(1);
        }
    };

    // Initialize structured logging with JSON formatting
    // Validates: Requirement 10.1, 10.7
    init_logging(&config.logging.level);

    tracing::info!(
        message = "Rust Analytics API starting",
        host = %config.server.host,
        port = config.server.port,
        log_level = %config.logging.level,
        streaming_service = ?config.streaming.service_type,
        geoip_database = %config.geoip.database_path
    );

    // Initialize GeoIP lookup with database
    // Validates: Requirement 6.1, 13.4
    tracing::info!(
        database_path = %config.geoip.database_path,
        "Loading GeoIP database into memory"
    );
    let geoip_lookup = match GeoIpLookup::new(&config.geoip.database_path) {
        Ok(lookup) => {
            tracing::info!("GeoIP database loaded successfully");
            Arc::new(lookup)
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                database_path = %config.geoip.database_path,
                "Failed to load GeoIP database"
            );
            eprintln!("Failed to load GeoIP database: {}", e);
            std::process::exit(1);
        }
    };

    // Initialize User-Agent parser
    // Validates: Requirement 5.1
    tracing::info!("Initializing User-Agent parser");
    let user_agent_parser: Arc<dyn UserAgentParser> = Arc::new(WootheeParser::new());
    tracing::info!("User-Agent parser initialized");

    // Initialize streaming service based on config
    // Validates: Requirement 7.5, 8.5
    tracing::info!(
        service_type = ?config.streaming.service_type,
        "Initializing streaming service"
    );
    let streaming_service = match create_streaming_service(&config.streaming).await {
        Ok(service) => {
            tracing::info!(
                service_type = ?config.streaming.service_type,
                "Streaming service initialized successfully"
            );
            service
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                service_type = ?config.streaming.service_type,
                "Failed to initialize streaming service"
            );
            eprintln!("Failed to initialize streaming service: {}", e);
            std::process::exit(1);
        }
    };

    // Create AppState with all components
    // Validates: Requirement 8.1, 8.5, 13.4
    let config_arc = Arc::new(config.clone());
    let app_state = AppState::new(
        streaming_service,
        geoip_lookup,
        user_agent_parser,
        config_arc,
    );

    tracing::info!(
        message = "Application initialization complete",
        host = %config.server.host,
        port = config.server.port
    );

    println!("Rust Analytics API initialized successfully");
    println!("Server: {}:{}", config.server.host, config.server.port);
    println!("Streaming: {:?}", config.streaming.service_type);
    println!("GeoIP: {}", config.geoip.database_path);

    // Set up Axum router with /track/, /identify, /update routes
    // Validates: Requirements 1.1, 2.1, 3.1, 8.4, 13.1, 13.2
    tracing::info!("Setting up Axum router");
    
    use axum::{
        routing::{get, post},
        Router,
    };
    use handlers::{track_handler, identify_handler, update_handler};
    
    let app = Router::new()
        // /track/ endpoint - accepts both GET and POST
        .route("/track/", get(track_handler).post(track_handler))
        // /identify endpoint - accepts both GET and POST
        .route("/identify", get(identify_handler).post(identify_handler))
        // /update endpoint - accepts both GET and POST
        .route("/update", get(update_handler).post(update_handler))
        // Add AppState to router
        .with_state(app_state);
    
    tracing::info!("Axum router configured with /track/, /identify, /update endpoints");

    // Configure server with host and port from config
    let bind_addr = format!("{}:{}", config.server.host, config.server.port);
    tracing::info!(
        bind_addr = %bind_addr,
        "Starting Axum server"
    );
    
    println!("\n🚀 Server starting on {}", bind_addr);
    println!("   Endpoints:");
    println!("   - GET/POST /track/");
    println!("   - GET/POST /identify");
    println!("   - GET/POST /update");
    
    // Start async server with Tokio runtime
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(
                error = %e,
                bind_addr = %bind_addr,
                "Failed to bind to address"
            );
            eprintln!("Failed to bind to {}: {}", bind_addr, e);
            std::process::exit(1);
        });
    
    tracing::info!(
        bind_addr = %bind_addr,
        "Server listening and ready to accept connections"
    );
    
    // Set up graceful shutdown handling
    // Validates: Requirement 13.6
    let shutdown_signal = async {
        let ctrl_c = async {
            tokio::signal::ctrl_c()
                .await
                .expect("Failed to install Ctrl+C handler");
        };

        #[cfg(unix)]
        let terminate = async {
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("Failed to install SIGTERM handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {
                tracing::info!("Received SIGINT (Ctrl+C), initiating graceful shutdown");
                println!("\n🛑 Received shutdown signal (SIGINT), shutting down gracefully...");
            },
            _ = terminate => {
                tracing::info!("Received SIGTERM, initiating graceful shutdown");
                println!("\n🛑 Received shutdown signal (SIGTERM), shutting down gracefully...");
            },
        }
    };
    
    // Start server with graceful shutdown
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal)
    .await
    .unwrap_or_else(|e| {
        tracing::error!(
            error = %e,
            "Server error"
        );
        eprintln!("Server error: {}", e);
        std::process::exit(1);
    });
    
    tracing::info!("Server shutdown complete");
    println!("✅ Server shutdown complete");
}
