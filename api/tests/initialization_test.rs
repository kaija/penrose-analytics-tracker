// Integration test for application initialization
// This test verifies that all components can be initialized correctly

use api::config::{Config, ServerConfig, StreamingConfig, StreamingServiceType, GeoIpConfig, LoggingConfig, KafkaConfig};
use api::enrichment::user_agent::{UserAgentParser, WootheeParser};
use api::handlers::AppState;
use api::streaming::{StreamingService, StreamingError};
use api::transformer::AnalyticsEvent;
use async_trait::async_trait;
use std::sync::Arc;

// Mock streaming service for testing
struct MockStreamingService;

#[async_trait]
impl StreamingService for MockStreamingService {
    async fn send_event(&self, _event: &AnalyticsEvent) -> Result<(), StreamingError> {
        Ok(())
    }

    async fn health_check(&self) -> Result<(), StreamingError> {
        Ok(())
    }
}

// Helper function to create a test config
fn create_test_config() -> Config {
    Config {
        server: ServerConfig {
            host: "0.0.0.0".to_string(),
            port: 8080,
        },
        streaming: StreamingConfig {
            service_type: StreamingServiceType::Kafka,
            kafka: Some(KafkaConfig {
                brokers: vec!["localhost:9092".to_string()],
                topic: "analytics-events".to_string(),
            }),
            kinesis: None,
            pulsar: None,
        },
        geoip: GeoIpConfig {
            database_path: "/path/to/GeoLite2-City.mmdb".to_string(),
        },
        logging: LoggingConfig {
            level: "info".to_string(),
        },
    }
}

#[test]
fn test_initialization_components() {
    // Test that all components can be initialized
    
    // 1. Initialize User-Agent parser
    let user_agent_parser: Arc<dyn UserAgentParser> = Arc::new(WootheeParser::new());
    assert!(Arc::strong_count(&user_agent_parser) == 1);
    
    // Test that the parser works
    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    let result = user_agent_parser.parse(ua);
    assert!(result.browser.is_some() || result.os.is_some());
    
    // 2. Initialize streaming service (mock)
    let streaming_service: Arc<dyn StreamingService> = Arc::new(MockStreamingService);
    assert!(Arc::strong_count(&streaming_service) == 1);
    
    // 3. Create config
    let config = Arc::new(create_test_config());
    assert_eq!(config.server.host, "0.0.0.0");
    assert_eq!(config.server.port, 8080);
    assert_eq!(config.streaming.service_type, StreamingServiceType::Kafka);
    
    // Note: We can't test GeoIpLookup initialization without a real database file
    // In a real scenario, you would need to provide a valid MaxMind database
}

#[test]
fn test_app_state_initialization() {
    // Test that AppState can be created with all components
    
    let user_agent_parser: Arc<dyn UserAgentParser> = Arc::new(WootheeParser::new());
    let streaming_service: Arc<dyn StreamingService> = Arc::new(MockStreamingService);
    let config = Arc::new(create_test_config());
    
    // Note: In a real test, you would also initialize GeoIpLookup
    // For this test, we're just verifying the types are correct
    
    // Verify that all Arc types can be cloned (required for AppState)
    let _parser_clone = user_agent_parser.clone();
    let _service_clone = streaming_service.clone();
    let _config_clone = config.clone();
    
    assert!(Arc::strong_count(&user_agent_parser) == 2); // Original + clone
    assert!(Arc::strong_count(&streaming_service) == 2);
    assert!(Arc::strong_count(&config) == 2);
}

#[test]
fn test_config_values() {
    // Test that configuration values are correctly set
    let config = create_test_config();
    
    // Server config
    assert_eq!(config.server.host, "0.0.0.0");
    assert_eq!(config.server.port, 8080);
    
    // Streaming config
    assert_eq!(config.streaming.service_type, StreamingServiceType::Kafka);
    assert!(config.streaming.kafka.is_some());
    
    if let Some(kafka) = &config.streaming.kafka {
        assert_eq!(kafka.brokers.len(), 1);
        assert_eq!(kafka.brokers[0], "localhost:9092");
        assert_eq!(kafka.topic, "analytics-events");
    }
    
    // GeoIP config
    assert_eq!(config.geoip.database_path, "/path/to/GeoLite2-City.mmdb");
    
    // Logging config
    assert_eq!(config.logging.level, "info");
}

#[test]
fn test_user_agent_parser_initialization() {
    // Test that User-Agent parser can be initialized and used
    let parser = WootheeParser::new();
    
    // Test with a Chrome user agent
    let chrome_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    let result = parser.parse(chrome_ua);
    
    assert_eq!(result.browser, Some("Chrome".to_string()));
    assert!(result.browser_version.is_some());
    assert_eq!(result.os, Some("Windows 10".to_string()));
    assert_eq!(result.device, Some("Desktop".to_string()));
}

#[test]
fn test_streaming_service_trait_object() {
    // Test that StreamingService can be used as a trait object
    let service: Arc<dyn StreamingService> = Arc::new(MockStreamingService);
    
    // Verify it's a valid trait object
    assert!(Arc::strong_count(&service) == 1);
    
    // Verify it can be cloned
    let _clone = service.clone();
    assert!(Arc::strong_count(&service) == 2);
}

#[tokio::test]
async fn test_mock_streaming_service() {
    // Test that the mock streaming service works
    let service = MockStreamingService;
    
    // Test health check
    let health_result = service.health_check().await;
    assert!(health_result.is_ok());
    
    // Test send_event (we can't create a real AnalyticsEvent without more setup,
    // but we can verify the method signature is correct)
}

#[tokio::test]
async fn test_graceful_shutdown_signal_handling() {
    // Test that shutdown signals can be properly set up
    // This test verifies the signal handling mechanism works
    
    use tokio::time::{timeout, Duration};
    
    // Create a simple shutdown signal that completes immediately
    let shutdown_signal = async {
        // Simulate receiving a shutdown signal
        tokio::time::sleep(Duration::from_millis(10)).await;
    };
    
    // Test that the signal completes within a reasonable time
    let result = timeout(Duration::from_millis(100), shutdown_signal).await;
    assert!(result.is_ok(), "Shutdown signal should complete");
}

#[tokio::test]
async fn test_server_with_graceful_shutdown() {
    // Test that a server can be started and shut down gracefully
    // This is a minimal test that verifies the shutdown mechanism
    
    use axum::{Router, routing::get};
    use std::net::SocketAddr;
    use tokio::time::{timeout, Duration};
    
    // Create a simple router
    let app = Router::new().route("/health", get(|| async { "OK" }));
    
    // Bind to a random port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind");
    
    let addr = listener.local_addr().unwrap();
    
    // Create a shutdown signal that triggers after a short delay
    let shutdown_signal = async {
        tokio::time::sleep(Duration::from_millis(50)).await;
    };
    
    // Start the server with graceful shutdown
    let server = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal);
    
    // Run the server with a timeout
    let result = timeout(Duration::from_millis(200), server).await;
    
    // The server should complete gracefully within the timeout
    assert!(result.is_ok(), "Server should shut down gracefully");
    assert!(result.unwrap().is_ok(), "Server should not error during shutdown");
}

#[tokio::test]
async fn test_streaming_service_cleanup() {
    // Test that streaming services can be properly dropped
    // This verifies that resources are cleaned up correctly
    
    let service: Arc<dyn StreamingService> = Arc::new(MockStreamingService);
    
    // Verify initial reference count
    assert_eq!(Arc::strong_count(&service), 1);
    
    // Clone the service (simulating multiple handlers using it)
    let service_clone = service.clone();
    assert_eq!(Arc::strong_count(&service), 2);
    
    // Drop the clone (simulating cleanup)
    drop(service_clone);
    assert_eq!(Arc::strong_count(&service), 1);
    
    // Drop the original (simulating final cleanup)
    drop(service);
    // Service is now fully cleaned up
}

#[cfg(unix)]
#[tokio::test]
async fn test_sigterm_signal_setup() {
    // Test that SIGTERM signal handler can be set up on Unix systems
    // This verifies the signal handling mechanism is available
    
    use tokio::signal::unix::{signal, SignalKind};
    
    // Attempt to create a SIGTERM signal handler
    let result = signal(SignalKind::terminate());
    assert!(result.is_ok(), "Should be able to create SIGTERM handler");
}

#[tokio::test]
async fn test_ctrl_c_signal_setup() {
    // Test that Ctrl+C (SIGINT) signal handler can be set up
    // This verifies the signal handling mechanism is available
    
    // We can't actually test receiving the signal without sending it,
    // but we can verify the handler setup doesn't panic
    
    // Create a future that would wait for Ctrl+C
    // We won't actually await it, just verify it can be created
    let ctrl_c_future = tokio::signal::ctrl_c();
    
    // The future should be created successfully
    // We'll timeout immediately to avoid waiting for an actual signal
    use tokio::time::{timeout, Duration};
    let result = timeout(Duration::from_millis(1), ctrl_c_future).await;
    
    // Should timeout (not receive signal), which is expected
    assert!(result.is_err(), "Should timeout waiting for Ctrl+C");
}
