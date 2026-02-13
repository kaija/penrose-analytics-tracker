#[cfg(test)]
mod config_tests {
    use super::super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    /// Helper function to create a temporary YAML config file
    fn create_temp_config(content: &str) -> NamedTempFile {
        let mut file = NamedTempFile::new().expect("Failed to create temp file");
        file.write_all(content.as_bytes()).expect("Failed to write to temp file");
        file
    }

    #[test]
    fn test_load_valid_kafka_config() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 8080

streaming:
  service_type: kafka
  kafka:
    brokers:
      - "localhost:9092"
    topic: "analytics-events"

geoip:
  database_path: "/path/to/GeoLite2-City.mmdb"

logging:
  level: "info"
"#;
        let temp_file = create_temp_config(config_content);
        let config = load_config(temp_file.path().to_str().unwrap()).expect("Failed to load config");
        
        assert_eq!(config.server.host, "0.0.0.0");
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.streaming.service_type, StreamingServiceType::Kafka);
        assert!(config.streaming.kafka.is_some());
        assert_eq!(config.streaming.kafka.unwrap().topic, "analytics-events");
        assert_eq!(config.geoip.database_path, "/path/to/GeoLite2-City.mmdb");
        assert_eq!(config.logging.level, "info");
    }

    #[test]
    fn test_load_valid_kinesis_config() {
        let config_content = r#"
server:
  host: "127.0.0.1"
  port: 3000

streaming:
  service_type: kinesis
  kinesis:
    region: "us-east-1"
    stream_name: "analytics-stream"

geoip:
  database_path: "/data/geoip.mmdb"

logging:
  level: "debug"
"#;
        let temp_file = create_temp_config(config_content);
        let config = load_config(temp_file.path().to_str().unwrap()).expect("Failed to load config");
        
        assert_eq!(config.streaming.service_type, StreamingServiceType::Kinesis);
        assert!(config.streaming.kinesis.is_some());
        let kinesis = config.streaming.kinesis.unwrap();
        assert_eq!(kinesis.region, "us-east-1");
        assert_eq!(kinesis.stream_name, "analytics-stream");
    }

    #[test]
    fn test_load_valid_pulsar_config() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 8080

streaming:
  service_type: pulsar
  pulsar:
    url: "pulsar://localhost:6650"
    topic: "persistent://public/default/analytics"

geoip:
  database_path: "/path/to/geoip.mmdb"

logging:
  level: "warn"
"#;
        let temp_file = create_temp_config(config_content);
        let config = load_config(temp_file.path().to_str().unwrap()).expect("Failed to load config");
        
        assert_eq!(config.streaming.service_type, StreamingServiceType::Pulsar);
        assert!(config.streaming.pulsar.is_some());
        let pulsar = config.streaming.pulsar.unwrap();
        assert_eq!(pulsar.url, "pulsar://localhost:6650");
        assert_eq!(pulsar.topic, "persistent://public/default/analytics");
    }

    #[test]
    fn test_missing_config_file() {
        let result = load_config("/nonexistent/path/config.yaml");
        assert!(result.is_err());
        match result {
            Err(ConfigError::FileNotFound(_)) => {},
            _ => panic!("Expected FileNotFound error"),
        }
    }

    #[test]
    fn test_invalid_yaml_syntax() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 8080
  invalid: [unclosed bracket
"#;
        let temp_file = create_temp_config(config_content);
        let result = load_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        match result {
            Err(ConfigError::InvalidYaml(_)) => {},
            _ => panic!("Expected InvalidYaml error"),
        }
    }

    #[test]
    fn test_missing_server_host() {
        let config_content = r#"
server:
  host: ""
  port: 8080

streaming:
  service_type: kafka
  kafka:
    brokers:
      - "localhost:9092"
    topic: "analytics"

geoip:
  database_path: "/path/to/geoip.mmdb"

logging:
  level: "info"
"#;
        let temp_file = create_temp_config(config_content);
        let result = load_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        match result {
            Err(ConfigError::MissingFields(msg)) => {
                assert!(msg.contains("server.host"));
            },
            _ => panic!("Expected MissingFields error"),
        }
    }

    #[test]
    fn test_missing_kafka_config() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 8080

streaming:
  service_type: kafka

geoip:
  database_path: "/path/to/geoip.mmdb"

logging:
  level: "info"
"#;
        let temp_file = create_temp_config(config_content);
        let result = load_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        match result {
            Err(ConfigError::MissingFields(msg)) => {
                assert!(msg.contains("kafka"));
            },
            _ => panic!("Expected MissingFields error"),
        }
    }

    #[test]
    fn test_empty_kafka_brokers() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 8080

streaming:
  service_type: kafka
  kafka:
    brokers: []
    topic: "analytics"

geoip:
  database_path: "/path/to/geoip.mmdb"

logging:
  level: "info"
"#;
        let temp_file = create_temp_config(config_content);
        let result = load_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        match result {
            Err(ConfigError::MissingFields(msg)) => {
                assert!(msg.contains("brokers"));
            },
            _ => panic!("Expected MissingFields error"),
        }
    }

    #[test]
    fn test_invalid_log_level() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 8080

streaming:
  service_type: kafka
  kafka:
    brokers:
      - "localhost:9092"
    topic: "analytics"

geoip:
  database_path: "/path/to/geoip.mmdb"

logging:
  level: "invalid_level"
"#;
        let temp_file = create_temp_config(config_content);
        let result = load_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        match result {
            Err(ConfigError::MissingFields(msg)) => {
                assert!(msg.contains("logging.level"));
            },
            _ => panic!("Expected MissingFields error"),
        }
    }

    #[test]
    fn test_zero_port() {
        let config_content = r#"
server:
  host: "0.0.0.0"
  port: 0

streaming:
  service_type: kafka
  kafka:
    brokers:
      - "localhost:9092"
    topic: "analytics"

geoip:
  database_path: "/path/to/geoip.mmdb"

logging:
  level: "info"
"#;
        let temp_file = create_temp_config(config_content);
        let result = load_config(temp_file.path().to_str().unwrap());
        assert!(result.is_err());
        match result {
            Err(ConfigError::MissingFields(msg)) => {
                assert!(msg.contains("port"));
            },
            _ => panic!("Expected MissingFields error"),
        }
    }
}
