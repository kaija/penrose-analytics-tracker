// Configuration management module
// This module handles loading and parsing YAML configuration files

use serde::Deserialize;

/// Main configuration structure containing all application settings
#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub server: ServerConfig,
    pub streaming: StreamingConfig,
    pub geoip: GeoIpConfig,
    pub logging: LoggingConfig,
}

/// Server configuration for HTTP API
#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

/// Streaming service configuration
#[derive(Debug, Deserialize, Clone)]
pub struct StreamingConfig {
    pub service_type: StreamingServiceType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kafka: Option<KafkaConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kinesis: Option<KinesisConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pulsar: Option<PulsarConfig>,
}

/// Enum representing the type of streaming service to use
#[derive(Debug, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StreamingServiceType {
    Kafka,
    Kinesis,
    Pulsar,
}

/// Kafka-specific configuration
#[derive(Debug, Deserialize, Clone)]
pub struct KafkaConfig {
    pub brokers: Vec<String>,
    pub topic: String,
}

/// AWS Kinesis-specific configuration
#[derive(Debug, Deserialize, Clone)]
pub struct KinesisConfig {
    pub region: String,
    pub stream_name: String,
}

/// Apache Pulsar-specific configuration
#[derive(Debug, Deserialize, Clone)]
pub struct PulsarConfig {
    pub url: String,
    pub topic: String,
}

/// GeoIP database configuration
#[derive(Debug, Deserialize, Clone)]
pub struct GeoIpConfig {
    pub database_path: String,
}

/// Logging configuration
#[derive(Debug, Deserialize, Clone)]
pub struct LoggingConfig {
    pub level: String,
}

/// Error type for configuration loading failures
#[derive(Debug)]
pub enum ConfigError {
    FileNotFound(std::io::Error),
    InvalidYaml(serde_yaml::Error),
    MissingFields(String),
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::FileNotFound(e) => write!(f, "Configuration file not found: {}", e),
            ConfigError::InvalidYaml(e) => write!(f, "Invalid YAML syntax: {}", e),
            ConfigError::MissingFields(msg) => write!(f, "Missing required fields: {}", msg),
        }
    }
}

impl std::error::Error for ConfigError {}

impl From<std::io::Error> for ConfigError {
    fn from(err: std::io::Error) -> Self {
        ConfigError::FileNotFound(err)
    }
}

impl From<serde_yaml::Error> for ConfigError {
    fn from(err: serde_yaml::Error) -> Self {
        ConfigError::InvalidYaml(err)
    }
}

/// Load configuration from a YAML file
///
/// # Arguments
/// * `path` - Path to the YAML configuration file
///
/// # Returns
/// * `Ok(Config)` - Successfully loaded and parsed configuration
/// * `Err(ConfigError)` - Error loading or parsing the configuration
///
/// # Errors
/// * `ConfigError::FileNotFound` - Configuration file does not exist
/// * `ConfigError::InvalidYaml` - YAML syntax is invalid
/// * `ConfigError::MissingFields` - Required configuration fields are missing
///
/// # Example
/// ```no_run
/// use api::config::load_config;
///
/// let config = load_config("config.yaml").expect("Failed to load config");
/// println!("Server will run on {}:{}", config.server.host, config.server.port);
/// ```
pub fn load_config(path: &str) -> Result<Config, ConfigError> {
    // Read the file contents
    let contents = std::fs::read_to_string(path)?;
    
    // Parse YAML into Config struct
    let config: Config = serde_yaml::from_str(&contents)?;
    
    // Validate that required fields are present
    validate_config(&config)?;
    
    Ok(config)
}

/// Validate that all required configuration fields are present and valid
fn validate_config(config: &Config) -> Result<(), ConfigError> {
    // Validate server config
    if config.server.host.is_empty() {
        return Err(ConfigError::MissingFields("server.host is empty".to_string()));
    }
    if config.server.port == 0 {
        return Err(ConfigError::MissingFields("server.port must be non-zero".to_string()));
    }
    
    // Validate streaming config based on service type
    match config.streaming.service_type {
        StreamingServiceType::Kafka => {
            if let Some(ref kafka) = config.streaming.kafka {
                if kafka.brokers.is_empty() {
                    return Err(ConfigError::MissingFields("streaming.kafka.brokers is empty".to_string()));
                }
                if kafka.topic.is_empty() {
                    return Err(ConfigError::MissingFields("streaming.kafka.topic is empty".to_string()));
                }
            } else {
                return Err(ConfigError::MissingFields("streaming.kafka configuration is required when service_type is kafka".to_string()));
            }
        }
        StreamingServiceType::Kinesis => {
            if let Some(ref kinesis) = config.streaming.kinesis {
                if kinesis.region.is_empty() {
                    return Err(ConfigError::MissingFields("streaming.kinesis.region is empty".to_string()));
                }
                if kinesis.stream_name.is_empty() {
                    return Err(ConfigError::MissingFields("streaming.kinesis.stream_name is empty".to_string()));
                }
            } else {
                return Err(ConfigError::MissingFields("streaming.kinesis configuration is required when service_type is kinesis".to_string()));
            }
        }
        StreamingServiceType::Pulsar => {
            if let Some(ref pulsar) = config.streaming.pulsar {
                if pulsar.url.is_empty() {
                    return Err(ConfigError::MissingFields("streaming.pulsar.url is empty".to_string()));
                }
                if pulsar.topic.is_empty() {
                    return Err(ConfigError::MissingFields("streaming.pulsar.topic is empty".to_string()));
                }
            } else {
                return Err(ConfigError::MissingFields("streaming.pulsar configuration is required when service_type is pulsar".to_string()));
            }
        }
    }
    
    // GeoIP config is optional - empty path means GeoIP enrichment is disabled
    // No validation needed
    
    // Validate logging config
    let valid_levels = ["trace", "debug", "info", "warn", "error"];
    if !valid_levels.contains(&config.logging.level.to_lowercase().as_str()) {
        return Err(ConfigError::MissingFields(
            format!("logging.level must be one of: {:?}", valid_levels)
        ));
    }
    
    Ok(())
}

#[cfg(test)]
mod tests;
