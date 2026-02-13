// Structured logging module
// This module sets up tracing with JSON formatting for structured logs

use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize the tracing subscriber with JSON formatting
///
/// # Arguments
/// * `log_level` - The log level to use (trace, debug, info, warn, error)
///
/// # Example
/// ```no_run
/// use api::logging::init_logging;
///
/// init_logging("info");
/// tracing::info!("Application started");
/// ```
pub fn init_logging(log_level: &str) {
    // Create an EnvFilter from the log level
    // This allows filtering logs by level
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(log_level));

    // Set up the JSON formatter
    // This creates structured logs that can be easily parsed
    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::layer().json())
        .init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_logging_with_valid_levels() {
        // Test that init_logging accepts all valid log levels
        // We can't actually call init_logging multiple times, but we can verify
        // that the function signature accepts the expected log level strings
        
        let valid_levels = vec!["trace", "debug", "info", "warn", "error"];
        
        for level in valid_levels {
            // Verify that EnvFilter can be created with each level
            let filter = EnvFilter::new(level);
            let filter_str = format!("{:?}", filter);
            assert!(filter_str.contains(&level.to_uppercase()));
        }
    }

    #[test]
    fn test_logging_module_exists() {
        // This test verifies that the logging module is properly structured
        // and the init_logging function is accessible
        
        // We can't call init_logging multiple times in tests without causing issues,
        // but we can verify the function exists and has the correct signature
        let _: fn(&str) = init_logging;
    }
}
