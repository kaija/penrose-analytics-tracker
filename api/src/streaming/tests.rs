// Tests for streaming service implementations

use super::*;
use crate::transformer::{AnalyticsEvent, VisitObject};
use std::collections::HashMap;

/// Helper function to create a test analytics event
fn create_test_event() -> AnalyticsEvent {
    AnalyticsEvent {
        project: Some("test-project".to_string()),
        event: "pageview".to_string(),
        id: Some("evt_123".to_string()),
        timestamp: 1704067200000,
        session_properties: HashMap::new(),
        project_properties: HashMap::new(),
        visit: VisitObject {
            cookie: Some("user_xyz".to_string()),
            timestamp: Some(1704067200000),
            url: Some("https://example.com/page".to_string()),
            title: Some("Test Page".to_string()),
            domain: Some("example.com".to_string()),
            uri: Some("/page".to_string()),
            duration: Some(5000),
            scroll_depth: Some(75),
            screen: Some("1920x1080".to_string()),
            language: Some("en-US".to_string()),
            referer: Some("https://google.com".to_string()),
            app: Some("web".to_string()),
        },
        event_param: None,
        profile: None,
        browser: Some("Chrome".to_string()),
        browser_version: Some("120.0".to_string()),
        os: Some("Windows".to_string()),
        os_version: Some("10".to_string()),
        device: Some("Desktop".to_string()),
        country: Some("United States".to_string()),
        region: Some("California".to_string()),
        city: Some("San Francisco".to_string()),
        latitude: Some(37.7749),
        longitude: Some(-122.4194),
    }
}

#[test]
fn test_kafka_streaming_creation() {
    // Test creating a Kafka streaming service
    let brokers = vec!["localhost:9092".to_string()];
    let topic = "analytics-events".to_string();
    
    let result = KafkaStreaming::new(&brokers, topic);
    
    // Should successfully create the streaming service
    assert!(result.is_ok());
}

#[test]
fn test_kafka_streaming_creation_with_multiple_brokers() {
    // Test creating a Kafka streaming service with multiple brokers
    let brokers = vec![
        "broker1:9092".to_string(),
        "broker2:9092".to_string(),
        "broker3:9092".to_string(),
    ];
    let topic = "analytics-events".to_string();
    
    let result = KafkaStreaming::new(&brokers, topic);
    
    // Should successfully create the streaming service
    assert!(result.is_ok());
}

#[test]
fn test_streaming_error_display() {
    // Test error display formatting
    let err = StreamingError::ConnectionError("Failed to connect".to_string());
    assert_eq!(err.to_string(), "Connection error: Failed to connect");
    
    let err = StreamingError::SerializationError("Invalid JSON".to_string());
    assert_eq!(err.to_string(), "Serialization error: Invalid JSON");
    
    let err = StreamingError::SendError("Send failed".to_string());
    assert_eq!(err.to_string(), "Send error: Send failed");
    
    let err = StreamingError::HealthCheckError("Health check failed".to_string());
    assert_eq!(err.to_string(), "Health check error: Health check failed");
    
    let err = StreamingError::ConfigError("Invalid config".to_string());
    assert_eq!(err.to_string(), "Configuration error: Invalid config");
}

#[test]
fn test_event_serialization() {
    // Test that analytics events can be serialized to JSON
    let event = create_test_event();
    let result = serde_json::to_string(&event);
    
    assert!(result.is_ok());
    let json = result.unwrap();
    
    // Verify key fields are present in JSON
    assert!(json.contains("test-project"));
    assert!(json.contains("pageview"));
    assert!(json.contains("evt_123"));
    assert!(json.contains("Chrome"));
    assert!(json.contains("United States"));
}

#[tokio::test]
async fn test_kafka_health_check() {
    // Test Kafka health check
    let brokers = vec!["localhost:9092".to_string()];
    let topic = "analytics-events".to_string();
    
    let kafka = KafkaStreaming::new(&brokers, topic).expect("Failed to create Kafka service");
    let result = kafka.health_check().await;
    
    // Health check should succeed (basic implementation always returns Ok)
    assert!(result.is_ok());
}

// Note: Integration tests that actually send to Kafka should be in tests/integration_tests.rs
// and require a running Kafka instance

#[tokio::test]
async fn test_kinesis_streaming_creation() {
    // Test creating a Kinesis streaming service
    // Note: This test creates a client but doesn't actually connect to AWS
    
    // Create a mock AWS config with behavior version
    let config = aws_sdk_kinesis::Config::builder()
        .region(aws_sdk_kinesis::config::Region::new("us-east-1"))
        .behavior_version(aws_sdk_kinesis::config::BehaviorVersion::latest())
        .build();
    
    let client = KinesisClient::from_conf(config);
    let stream_name = "analytics-events".to_string();
    
    let kinesis = KinesisStreaming::new(client, stream_name);
    
    // Should successfully create the streaming service
    assert_eq!(kinesis.stream_name, "analytics-events");
}

#[tokio::test]
async fn test_kinesis_event_serialization() {
    // Test that events can be serialized for Kinesis
    let event = create_test_event();
    let result = serde_json::to_string(&event);
    
    assert!(result.is_ok());
    let json = result.unwrap();
    
    // Verify the JSON can be converted to a Blob (Kinesis format)
    let blob = Blob::new(json.as_bytes());
    assert!(!blob.as_ref().is_empty());
}

// Note: Integration tests that actually send to Kinesis should be in tests/integration_tests.rs
// and require AWS credentials and a running Kinesis stream

// Pulsar streaming service tests

#[tokio::test]
async fn test_pulsar_streaming_creation() {
    // Test creating a Pulsar streaming service
    // Note: This test requires a running Pulsar instance
    // In a real environment, you would use a test container or mock
    
    let pulsar_url = "pulsar://localhost:6650";
    let topic = "persistent://public/default/analytics-events";
    
    // This will fail if Pulsar is not running, which is expected in unit tests
    // In integration tests, we would have a running Pulsar instance
    let result = PulsarStreaming::new(pulsar_url, topic).await;
    
    // We expect this to fail in unit tests without a running Pulsar
    // The important thing is that the code compiles and the API is correct
    // Actual connectivity tests should be in integration tests
    match result {
        Ok(_) => {
            // If Pulsar is running, great!
            assert!(true);
        }
        Err(e) => {
            // If Pulsar is not running, we should get a connection error
            assert!(matches!(e, StreamingError::ConnectionError(_)));
        }
    }
}

#[tokio::test]
async fn test_pulsar_event_serialization() {
    // Test that events can be serialized for Pulsar
    let event = create_test_event();
    let result = serde_json::to_string(&event);
    
    assert!(result.is_ok());
    let json = result.unwrap();
    
    // Verify the JSON can be converted to bytes (Pulsar format)
    let bytes = json.as_bytes();
    assert!(!bytes.is_empty());
    assert!(bytes.len() > 100); // Should have substantial content
}

// Note: Integration tests that actually send to Pulsar should be in tests/integration_tests.rs
// and require a running Pulsar instance

// Tests for streaming service factory

#[tokio::test]
async fn test_create_kafka_streaming_service() {
    // Test creating a Kafka streaming service via factory
    use crate::config::{StreamingConfig, StreamingServiceType, KafkaConfig};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Kafka,
        kafka: Some(KafkaConfig {
            brokers: vec!["localhost:9092".to_string()],
            topic: "analytics-events".to_string(),
        }),
        kinesis: None,
        pulsar: None,
    };
    
    let result = create_streaming_service(&config).await;
    
    // Should successfully create the streaming service
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_kinesis_streaming_service() {
    // Test creating a Kinesis streaming service via factory
    use crate::config::{StreamingConfig, StreamingServiceType, KinesisConfig};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Kinesis,
        kafka: None,
        kinesis: Some(KinesisConfig {
            region: "us-east-1".to_string(),
            stream_name: "analytics-events".to_string(),
        }),
        pulsar: None,
    };
    
    let result = create_streaming_service(&config).await;
    
    // Should successfully create the streaming service
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_pulsar_streaming_service() {
    // Test creating a Pulsar streaming service via factory
    use crate::config::{StreamingConfig, StreamingServiceType, PulsarConfig};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Pulsar,
        kafka: None,
        kinesis: None,
        pulsar: Some(PulsarConfig {
            url: "pulsar://localhost:6650".to_string(),
            topic: "persistent://public/default/analytics-events".to_string(),
        }),
    };
    
    let result = create_streaming_service(&config).await;
    
    // This may fail if Pulsar is not running, which is expected in unit tests
    // The important thing is that the factory function works correctly
    match result {
        Ok(_) => {
            // If Pulsar is running, great!
            assert!(true);
        }
        Err(e) => {
            // If Pulsar is not running, we should get a connection error
            assert!(matches!(e, StreamingError::ConnectionError(_)));
        }
    }
}

#[tokio::test]
async fn test_create_streaming_service_missing_kafka_config() {
    // Test that factory returns error when Kafka config is missing
    use crate::config::{StreamingConfig, StreamingServiceType};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Kafka,
        kafka: None,
        kinesis: None,
        pulsar: None,
    };
    
    let result = create_streaming_service(&config).await;
    
    // Should fail with ConfigError
    assert!(result.is_err());
    match result {
        Err(StreamingError::ConfigError(msg)) => {
            assert!(msg.contains("Kafka configuration is missing"));
        }
        _ => panic!("Expected ConfigError"),
    }
}

#[tokio::test]
async fn test_create_streaming_service_missing_kinesis_config() {
    // Test that factory returns error when Kinesis config is missing
    use crate::config::{StreamingConfig, StreamingServiceType};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Kinesis,
        kafka: None,
        kinesis: None,
        pulsar: None,
    };
    
    let result = create_streaming_service(&config).await;
    
    // Should fail with ConfigError
    assert!(result.is_err());
    match result {
        Err(StreamingError::ConfigError(msg)) => {
            assert!(msg.contains("Kinesis configuration is missing"));
        }
        _ => panic!("Expected ConfigError"),
    }
}

#[tokio::test]
async fn test_create_streaming_service_missing_pulsar_config() {
    // Test that factory returns error when Pulsar config is missing
    use crate::config::{StreamingConfig, StreamingServiceType};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Pulsar,
        kafka: None,
        kinesis: None,
        pulsar: None,
    };
    
    let result = create_streaming_service(&config).await;
    
    // Should fail with ConfigError
    assert!(result.is_err());
    match result {
        Err(StreamingError::ConfigError(msg)) => {
            assert!(msg.contains("Pulsar configuration is missing"));
        }
        _ => panic!("Expected ConfigError"),
    }
}

#[tokio::test]
async fn test_factory_returns_arc_dyn_trait() {
    // Test that factory returns Arc<dyn StreamingService> that can be used polymorphically
    use crate::config::{StreamingConfig, StreamingServiceType, KafkaConfig};
    
    let config = StreamingConfig {
        service_type: StreamingServiceType::Kafka,
        kafka: Some(KafkaConfig {
            brokers: vec!["localhost:9092".to_string()],
            topic: "analytics-events".to_string(),
        }),
        kinesis: None,
        pulsar: None,
    };
    
    let service = create_streaming_service(&config).await.expect("Failed to create service");
    
    // Should be able to call trait methods
    let health_result = service.health_check().await;
    assert!(health_result.is_ok());
}
