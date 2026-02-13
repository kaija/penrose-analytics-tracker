// HTTP request handlers module
// This module contains handlers for /track/, /identify, and /update endpoints

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;

use axum::extract::{ConnectInfo, Query, State};
use axum::http::{HeaderMap, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Form;
use serde_json::json;

use crate::config::Config;
use crate::enrichment::geoip::{GeoIpLookup, GeoIpError};
use crate::enrichment::user_agent::UserAgentParser;
use crate::streaming::{StreamingError, StreamingService};
use crate::transformer::transform_params;

/// Application state shared across all request handlers
/// Contains all services and configuration needed to process analytics events
/// Validates: Requirements 1.1, 2.1, 3.1
#[derive(Clone)]
pub struct AppState {
    /// Streaming service for sending events to Kafka/Kinesis/Pulsar
    pub streaming_service: Arc<dyn StreamingService>,
    /// GeoIP lookup service for IP address geolocation (optional)
    pub geoip_lookup: Option<Arc<GeoIpLookup>>,
    /// User-Agent parser for extracting browser/OS/device information
    pub user_agent_parser: Arc<dyn UserAgentParser>,
    /// Application configuration
    pub config: Arc<Config>,
}

impl AppState {
    /// Create a new AppState instance
    ///
    /// # Arguments
    /// * `streaming_service` - Streaming service implementation (Kafka/Kinesis/Pulsar)
    /// * `geoip_lookup` - GeoIP lookup service
    /// * `user_agent_parser` - User-Agent parser implementation
    /// * `config` - Application configuration
    ///
    /// # Returns
    /// A new AppState instance with all services wrapped in Arc for shared ownership
    pub fn new(
        streaming_service: Arc<dyn StreamingService>,
        geoip_lookup: Option<Arc<GeoIpLookup>>,
        user_agent_parser: Arc<dyn UserAgentParser>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            streaming_service,
            geoip_lookup,
            user_agent_parser,
            config,
        }
    }

    /// Create a new AppState instance for testing without GeoIP
    #[cfg(test)]
    pub fn new_for_testing(
        streaming_service: Arc<dyn StreamingService>,
        user_agent_parser: Arc<dyn UserAgentParser>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            streaming_service,
            geoip_lookup: None,
            user_agent_parser,
            config,
        }
    }
}

/// API error types for HTTP responses
/// Validates: Requirements 12.3, 12.4
#[derive(Debug)]
pub enum ApiError {
    /// Validation error (HTTP 400)
    ValidationError(String),
    /// Streaming service error (HTTP 500)
    StreamingError(StreamingError),
    /// GeoIP lookup error (HTTP 500)
    GeoIpError(GeoIpError),
    /// Internal server error (HTTP 500)
    InternalError(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::StreamingError(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to send event to streaming service: {}", err),
            ),
            ApiError::GeoIpError(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("GeoIP lookup failed: {}", err),
            ),
            ApiError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        (status, axum::Json(json!({ "error": message }))).into_response()
    }
}

/// Merge query parameters and form body parameters based on HTTP method
///
/// For GET requests: returns query parameters only
/// For POST requests: merges query and form parameters with form parameters taking precedence
///
/// # Arguments
/// * `method` - HTTP method (GET or POST)
/// * `query_params` - Query string parameters
/// * `form_params` - Form body parameters (for POST requests)
///
/// # Returns
/// Merged parameter HashMap
///
/// # Validates
/// Requirements 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 3.3, 3.4
pub fn merge_params(
    method: Method,
    query_params: HashMap<String, String>,
    form_params: HashMap<String, String>,
) -> HashMap<String, String> {
    match method {
        Method::GET => query_params,
        Method::POST => {
            // Start with query params, then extend with form params
            // Form params will overwrite query params with the same key
            let mut merged = query_params;
            merged.extend(form_params);
            merged
        }
        _ => query_params,
    }
}

/// Validate required fields for tracking events
///
/// # Arguments
/// * `params` - Parameter map to validate
///
/// # Returns
/// Ok(()) if all required fields are present, Err with descriptive message otherwise
///
/// # Validates
/// Requirements 1.6, 12.6
#[cfg_attr(test, allow(dead_code))]
pub fn validate_track_params(params: &HashMap<String, String>) -> Result<(), String> {
    // Required fields: project, event, timestamp
    if !params.contains_key("project") {
        return Err("Missing required field: project".to_string());
    }
    if !params.contains_key("event") {
        return Err("Missing required field: event".to_string());
    }
    if !params.contains_key("timestamp") {
        return Err("Missing required field: timestamp".to_string());
    }
    Ok(())
}

/// Extract client IP address from connection info
///
/// # Arguments
/// * `connect_info` - Connection information containing the client's socket address
///
/// # Returns
/// The client's IP address
#[allow(dead_code)]
fn extract_client_ip(connect_info: &ConnectInfo<std::net::SocketAddr>) -> IpAddr {
    connect_info.0.ip()
}

/// Extract User-Agent header from request headers
///
/// # Arguments
/// * `headers` - HTTP request headers
///
/// # Returns
/// User-Agent string, or empty string if not present
fn extract_user_agent(headers: &HeaderMap) -> String {
    headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string()
}

/// Handler for /track/ endpoint (supports both GET and POST)
///
/// This handler:
/// 1. Extracts and merges parameters from query string and form body
/// 2. Validates required fields (project, event, timestamp)
/// 3. Transforms parameters into structured AnalyticsEvent
/// 4. Enriches with User-Agent parsing
/// 5. Enriches with GeoIP lookup
/// 6. Sends to streaming service
/// 7. Returns HTTP 200 on success, 400 on validation error, 500 on streaming error
///
/// # Validates
/// Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 12.3, 12.4, 12.6
pub async fn track_handler(
    method: Method,
    Query(query_params): Query<HashMap<String, String>>,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    State(app_state): State<AppState>,
    body: Option<Form<HashMap<String, String>>>,
) -> Result<StatusCode, ApiError> {
    // Step 1: Merge query and form parameters
    let form_params = body.map(|f| f.0).unwrap_or_default();
    let params = merge_params(method.clone(), query_params, form_params);
    
    // Log incoming request with sanitized parameters
    // Validates: Requirement 10.3
    tracing::info!(
        endpoint = "/track/",
        method = %method,
        client_ip = %addr.ip(),
        project = params.get("project").map(|s| s.as_str()),
        event = params.get("event").map(|s| s.as_str()),
        param_count = params.len(),
        "Incoming track request"
    );

    // Step 2: Validate required fields
    validate_track_params(&params).map_err(|e| {
        tracing::warn!(
            endpoint = "/track/",
            error = %e,
            "Validation failed"
        );
        ApiError::ValidationError(e)
    })?;

    // Step 3: Extract User-Agent and client IP
    let user_agent = extract_user_agent(&headers);
    let client_ip = addr.ip();

    // Step 4: Transform parameters into structured event
    tracing::debug!(
        endpoint = "/track/",
        "Transforming parameters"
    );
    let mut event = transform_params(params);

    // Step 5: Enrich with User-Agent parsing
    tracing::debug!(
        endpoint = "/track/",
        user_agent = %user_agent,
        "Enriching with User-Agent parsing"
    );
    let ua_info = app_state.user_agent_parser.parse(&user_agent);
    event.browser = ua_info.browser.clone();
    event.browser_version = ua_info.browser_version.clone();
    event.os = ua_info.os.clone();
    event.os_version = ua_info.os_version.clone();
    event.device = ua_info.device.clone();
    
    tracing::debug!(
        endpoint = "/track/",
        browser = ?ua_info.browser,
        os = ?ua_info.os,
        device = ?ua_info.device,
        "User-Agent enrichment complete"
    );

    // Step 6: Enrich with GeoIP lookup
    tracing::debug!(
        endpoint = "/track/",
        client_ip = %client_ip,
        "Enriching with GeoIP lookup"
    );
    if let Some(geoip) = &app_state.geoip_lookup {
        let geo_location = geoip.lookup(client_ip);
        event.country = geo_location.country.clone();
        event.region = geo_location.region.clone();
        event.city = geo_location.city.clone();
        event.latitude = geo_location.latitude;
        event.longitude = geo_location.longitude;
        
        tracing::debug!(
            endpoint = "/track/",
            country = ?geo_location.country,
            city = ?geo_location.city,
            "GeoIP enrichment complete"
        );
    } else {
        tracing::debug!("GeoIP lookup skipped (not configured)");
    }

    // Step 7: Send to streaming service
    tracing::debug!(
        endpoint = "/track/",
        event_id = ?event.id,
        "Sending event to streaming service"
    );
    app_state
        .streaming_service
        .send_event(&event)
        .await
        .map_err(|e| {
            tracing::error!(
                endpoint = "/track/",
                event_id = ?event.id,
                error = %e,
                "Failed to send event to streaming service"
            );
            ApiError::StreamingError(e)
        })?;
    
    tracing::info!(
        endpoint = "/track/",
        event_id = ?event.id,
        "Event sent successfully"
    );

    // Step 8: Return success
    Ok(StatusCode::OK)
}
/// Validate required fields for identify events
///
/// # Arguments
/// * `params` - Parameter map to validate
///
/// # Returns
/// Ok(()) if all required fields are present, Err with descriptive message otherwise
///
/// # Validates
/// Requirements 2.6, 12.6
#[cfg_attr(test, allow(dead_code))]
pub fn validate_identify_params(params: &HashMap<String, String>) -> Result<(), String> {
    // Required fields: project, timestamp
    // Note: identify events don't require 'event' field, but do require at least one u_* parameter
    if !params.contains_key("project") {
        return Err("Missing required field: project".to_string());
    }
    if !params.contains_key("timestamp") {
        return Err("Missing required field: timestamp".to_string());
    }

    // Check that at least one u_* parameter is present
    let has_user_param = params.keys().any(|k| k.starts_with("u_"));
    if !has_user_param {
        return Err("At least one user property (u_*) is required for identify events".to_string());
    }

    Ok(())
}

/// Handler for /identify endpoint (supports both GET and POST)
///
/// This handler:
/// 1. Extracts and merges parameters from query string and form body
/// 2. Validates required fields (project, timestamp, at least one u_* parameter)
/// 3. Transforms parameters into structured AnalyticsEvent with focus on profile object
/// 4. Enriches with User-Agent parsing
/// 5. Enriches with GeoIP lookup
/// 6. Sends to streaming service
/// 7. Returns HTTP 200 on success, 400 on validation error, 500 on streaming error
///
/// # Validates
/// Requirements 2.1, 2.2, 2.3, 2.5, 2.6
pub async fn identify_handler(
    method: Method,
    Query(query_params): Query<HashMap<String, String>>,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    State(app_state): State<AppState>,
    body: Option<Form<HashMap<String, String>>>,
) -> Result<StatusCode, ApiError> {
    // Step 1: Merge query and form parameters
    let form_params = body.map(|f| f.0).unwrap_or_default();
    let params = merge_params(method.clone(), query_params, form_params);
    
    // Log incoming request with sanitized parameters
    // Validates: Requirement 10.3
    tracing::info!(
        endpoint = "/identify",
        method = %method,
        client_ip = %addr.ip(),
        project = params.get("project").map(|s| s.as_str()),
        param_count = params.len(),
        "Incoming identify request"
    );

    // Step 2: Validate required fields
    validate_identify_params(&params).map_err(|e| {
        tracing::warn!(
            endpoint = "/identify",
            error = %e,
            "Validation failed"
        );
        ApiError::ValidationError(e)
    })?;

    // Step 3: Extract User-Agent and client IP
    let user_agent = extract_user_agent(&headers);
    let client_ip = addr.ip();

    // Step 4: Transform parameters into structured event
    // For identify events, set event type to "identify" if not provided
    let mut params_with_event = params.clone();
    if !params_with_event.contains_key("event") {
        params_with_event.insert("event".to_string(), "identify".to_string());
    }
    
    tracing::debug!(
        endpoint = "/identify",
        "Transforming parameters"
    );
    let mut event = transform_params(params_with_event);

    // Step 5: Enrich with User-Agent parsing
    tracing::debug!(
        endpoint = "/identify",
        user_agent = %user_agent,
        "Enriching with User-Agent parsing"
    );
    let ua_info = app_state.user_agent_parser.parse(&user_agent);
    event.browser = ua_info.browser.clone();
    event.browser_version = ua_info.browser_version.clone();
    event.os = ua_info.os.clone();
    event.os_version = ua_info.os_version.clone();
    event.device = ua_info.device.clone();
    
    tracing::debug!(
        endpoint = "/identify",
        browser = ?ua_info.browser,
        os = ?ua_info.os,
        device = ?ua_info.device,
        "User-Agent enrichment complete"
    );

    // Step 6: Enrich with GeoIP lookup
    tracing::debug!(
        endpoint = "/identify",
        client_ip = %client_ip,
        "Enriching with GeoIP lookup"
    );
    if let Some(geoip) = &app_state.geoip_lookup {
        let geo_location = geoip.lookup(client_ip);
        event.country = geo_location.country.clone();
        event.region = geo_location.region.clone();
        event.city = geo_location.city.clone();
        event.latitude = geo_location.latitude;
        event.longitude = geo_location.longitude;
        
        tracing::debug!(
            endpoint = "/identify",
            country = ?geo_location.country,
            city = ?geo_location.city,
            "GeoIP enrichment complete"
        );
    } else {
        tracing::debug!("GeoIP lookup skipped (not configured)");
    }

    // Step 7: Send to streaming service
    tracing::debug!(
        endpoint = "/identify",
        event_id = ?event.id,
        "Sending event to streaming service"
    );
    app_state
        .streaming_service
        .send_event(&event)
        .await
        .map_err(|e| {
            tracing::error!(
                endpoint = "/identify",
                event_id = ?event.id,
                error = %e,
                "Failed to send event to streaming service"
            );
            ApiError::StreamingError(e)
        })?;
    
    tracing::info!(
        endpoint = "/identify",
        event_id = ?event.id,
        "Event sent successfully"
    );

    // Step 8: Return success
    Ok(StatusCode::OK)
}
/// Validate required fields for update events
///
/// # Arguments
/// * `params` - Parameter map to validate
///
/// # Returns
/// Ok(()) if all required fields are present, Err with descriptive message otherwise
///
/// # Validates
/// Requirements 3.6, 12.6
#[cfg_attr(test, allow(dead_code))]
pub fn validate_update_params(params: &HashMap<String, String>) -> Result<(), String> {
    // Required field: id
    // Note: update events require an id to identify which event to update
    if !params.contains_key("id") {
        return Err("Missing required field: id".to_string());
    }
    Ok(())
}

/// Handler for /update endpoint (supports both GET and POST)
///
/// This handler:
/// 1. Extracts and merges parameters from query string and form body
/// 2. Validates required fields (id)
/// 3. Extracts duration and scroll_depth parameters
/// 4. Transforms parameters into structured AnalyticsEvent
/// 5. Enriches with User-Agent parsing
/// 6. Enriches with GeoIP lookup
/// 7. Sends to streaming service
/// 8. Returns HTTP 200 on success, 400 on validation error, 500 on streaming error
///
/// # Validates
/// Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
pub async fn update_handler(
    method: Method,
    Query(query_params): Query<HashMap<String, String>>,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    State(app_state): State<AppState>,
    body: Option<Form<HashMap<String, String>>>,
) -> Result<StatusCode, ApiError> {
    // Step 1: Merge query and form parameters
    let form_params = body.map(|f| f.0).unwrap_or_default();
    let params = merge_params(method.clone(), query_params, form_params);
    
    // Log incoming request with sanitized parameters
    // Validates: Requirement 10.3
    tracing::info!(
        endpoint = "/update",
        method = %method,
        client_ip = %addr.ip(),
        event_id = params.get("id").map(|s| s.as_str()),
        param_count = params.len(),
        "Incoming update request"
    );

    // Step 2: Validate required fields
    validate_update_params(&params).map_err(|e| {
        tracing::warn!(
            endpoint = "/update",
            error = %e,
            "Validation failed"
        );
        ApiError::ValidationError(e)
    })?;

    // Step 3: Extract User-Agent and client IP
    let user_agent = extract_user_agent(&headers);
    let client_ip = addr.ip();

    // Step 4: Transform parameters into structured event
    // For update events, set event type to "update" if not provided
    let mut params_with_event = params.clone();
    if !params_with_event.contains_key("event") {
        params_with_event.insert("event".to_string(), "update".to_string());
    }
    
    tracing::debug!(
        endpoint = "/update",
        "Transforming parameters"
    );
    let mut event = transform_params(params_with_event);

    // Step 5: Enrich with User-Agent parsing
    tracing::debug!(
        endpoint = "/update",
        user_agent = %user_agent,
        "Enriching with User-Agent parsing"
    );
    let ua_info = app_state.user_agent_parser.parse(&user_agent);
    event.browser = ua_info.browser.clone();
    event.browser_version = ua_info.browser_version.clone();
    event.os = ua_info.os.clone();
    event.os_version = ua_info.os_version.clone();
    event.device = ua_info.device.clone();
    
    tracing::debug!(
        endpoint = "/update",
        browser = ?ua_info.browser,
        os = ?ua_info.os,
        device = ?ua_info.device,
        "User-Agent enrichment complete"
    );

    // Step 6: Enrich with GeoIP lookup
    tracing::debug!(
        endpoint = "/update",
        client_ip = %client_ip,
        "Enriching with GeoIP lookup"
    );
    if let Some(geoip) = &app_state.geoip_lookup {
        let geo_location = geoip.lookup(client_ip);
        event.country = geo_location.country.clone();
        event.region = geo_location.region.clone();
        event.city = geo_location.city.clone();
        event.latitude = geo_location.latitude;
        event.longitude = geo_location.longitude;
        
        tracing::debug!(
            endpoint = "/update",
            country = ?geo_location.country,
            city = ?geo_location.city,
            "GeoIP enrichment complete"
        );
    } else {
        tracing::debug!("GeoIP lookup skipped (not configured)");
    }

    // Step 7: Send to streaming service
    tracing::debug!(
        endpoint = "/update",
        event_id = ?event.id,
        "Sending event to streaming service"
    );
    app_state
        .streaming_service
        .send_event(&event)
        .await
        .map_err(|e| {
            tracing::error!(
                endpoint = "/update",
                event_id = ?event.id,
                error = %e,
                "Failed to send event to streaming service"
            );
            ApiError::StreamingError(e)
        })?;
    
    tracing::info!(
        endpoint = "/update",
        event_id = ?event.id,
        "Event sent successfully"
    );

    // Step 8: Return success
    Ok(StatusCode::OK)
}


#[cfg(test)]
mod tests;
