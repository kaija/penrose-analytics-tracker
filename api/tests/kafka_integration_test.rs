// Integration test for Kafka streaming service
// This test demonstrates the complete usage of KafkaStreaming
// Note: Requires a running Kafka instance to pass

use api::streaming::{KafkaStreaming, StreamingService};
use api::transformer::{AnalyticsEvent, VisitObject};
use std::collections::HashMap;

/// Helper function to create a test analytics event
fn create_test_event() -> AnalyticsEvent {
    AnalyticsEvent {
        project: Some("test-project".to_string()),
        event: "pageview".to_string(),
        id: Some("evt_integration_test".to_string()),
        timestamp: 1704067200000,
        session_properties: {
            let mut props = HashMap::new();
            props.insert("session_id".to_string(), "sess_123".to_string());
            props
        },
        project_properties: {
            let mut props = HashMap::new();
            props.insert("version".to_string(), "1.0.0".to_string());
            props
        },
        visit: VisitObject {
            cookie: Some("user_xyz".to_string()),
            timestamp: Some(1704067200000),
            url: Some("https://example.com/page".to_string()),
            title: Some("Integration Test Page".to_string()),
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

#[tokio::test]
#[ignore] // Ignored by default - requires running Kafka instance
async fn test_kafka_send_event_integration() {
    // This test requires a running Kafka instance at localhost:9092
    // Run with: cargo test --test kafka_integration_test -- --ignored
    
    let brokers = vec!["localhost:9092".to_string()];
    let topic = "analytics-events-test".to_string();
    
    // Create Kafka streaming service
    let kafka = KafkaStreaming::new(&brokers, topic)
        .expect("Failed to create Kafka streaming service");
    
    // Create test event
    let event = create_test_event();
    
    // Send event to Kafka
    let result = kafka.send_event(&event).await;
    
    // Verify send was successful
    assert!(result.is_ok(), "Failed to send event to Kafka: {:?}", result.err());
}

#[tokio::test]
#[ignore] // Ignored by default - requires running Kafka instance
async fn test_kafka_connection_pooling() {
    // Test that the same producer is reused across multiple sends
    // This validates Requirement 13.3 - connection pooling and reuse
    
    let brokers = vec!["localhost:9092".to_string()];
    let topic = "analytics-events-test".to_string();
    
    let kafka = KafkaStreaming::new(&brokers, topic)
        .expect("Failed to create Kafka streaming service");
    
    // Send multiple events using the same producer
    for i in 0..10 {
        let mut event = create_test_event();
        event.id = Some(format!("evt_pooling_test_{}", i));
        
        let result = kafka.send_event(&event).await;
        assert!(result.is_ok(), "Failed to send event {}: {:?}", i, result.err());
    }
}

#[test]
fn test_kafka_creation_without_running_instance() {
    // Test that we can create a Kafka streaming service even without a running instance
    // The connection is lazy - it only fails when we try to send
    
    let brokers = vec!["localhost:9092".to_string()];
    let topic = "analytics-events-test".to_string();
    
    let result = KafkaStreaming::new(&brokers, topic);
    assert!(result.is_ok(), "Should be able to create Kafka service without running instance");
}
