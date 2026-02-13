// Query parameter transformation module
// This module transforms flat query parameters into structured JSON with nested objects

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Main analytics event structure with root-level fields and nested objects
/// Validates: Requirements 4.1, 4.2, 4.3, 4.6
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnalyticsEvent {
    // Standard root-level fields (Requirement 4.6)
    pub project: Option<String>,
    pub event: String,
    pub id: Option<String>,
    pub timestamp: i64,
    
    // Session properties (s_* prefix removed, placed at root - Requirement 4.4)
    #[serde(flatten)]
    pub session_properties: HashMap<String, String>,
    
    // Project properties (p_* prefix removed, placed at root - Requirement 4.5)
    #[serde(flatten)]
    pub project_properties: HashMap<String, String>,
    
    // Nested objects
    pub visit: VisitObject,
    pub event_param: Option<EventParamObject>,
    pub profile: Option<ProfileObject>,
    
    // Enriched fields (added by User-Agent parser and GeoIP lookup)
    pub browser: Option<String>,
    pub browser_version: Option<String>,
    pub os: Option<String>,
    pub os_version: Option<String>,
    pub device: Option<String>,
    pub country: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

/// Visit-level data containing session and page information
/// Validates: Requirement 4.1
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VisitObject {
    pub cookie: Option<String>,
    pub timestamp: Option<i64>,
    pub url: Option<String>,
    pub title: Option<String>,
    pub domain: Option<String>,
    pub uri: Option<String>,
    pub duration: Option<i64>,
    pub scroll_depth: Option<i32>,
    pub screen: Option<String>,
    pub language: Option<String>,
    pub referer: Option<String>,
    pub app: Option<String>,
}

/// Event-specific parameters (e_* prefixed parameters with prefix removed)
/// Validates: Requirement 4.2
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventParamObject {
    #[serde(flatten)]
    pub params: HashMap<String, String>,
}

/// User profile properties (u_* prefixed parameters with prefix removed)
/// Validates: Requirement 4.3
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProfileObject {
    #[serde(flatten)]
    pub properties: HashMap<String, String>,
}

/// Transform flat query parameters into structured AnalyticsEvent
/// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
pub fn transform_params(params: HashMap<String, String>) -> AnalyticsEvent {
    tracing::debug!(
        param_count = params.len(),
        has_event_params = params.keys().any(|k| k.starts_with("e_")),
        has_profile_params = params.keys().any(|k| k.starts_with("u_")),
        has_session_params = params.keys().any(|k| k.starts_with("s_")),
        has_project_params = params.keys().any(|k| k.starts_with("p_")),
        "Starting parameter transformation"
    );
    
    // Extract standard root-level fields (Requirement 4.6)
    let project = params.get("project").cloned();
    let event = params.get("event").cloned().unwrap_or_else(|| "unknown".to_string());
    let id = params.get("id").cloned();
    let timestamp = params.get("timestamp")
        .and_then(|t| t.parse::<i64>().ok())
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());
    
    // Extract visit-level fields (Requirement 4.1)
    let visit = VisitObject {
        cookie: params.get("cookie").cloned(),
        timestamp: params.get("timestamp").and_then(|t| t.parse::<i64>().ok()),
        url: params.get("url").cloned(),
        title: params.get("title").cloned(),
        domain: params.get("domain").cloned(),
        uri: params.get("uri").cloned(),
        duration: params.get("duration").and_then(|d| d.parse::<i64>().ok()),
        scroll_depth: params.get("scroll_depth").and_then(|s| s.parse::<i32>().ok()),
        screen: params.get("screen").cloned(),
        language: params.get("language").cloned(),
        referer: params.get("referer").cloned(),
        app: params.get("app").cloned(),
    };
    
    // Extract e_* prefixed params into EventParamObject (Requirement 4.2)
    let mut event_params = HashMap::new();
    for (key, value) in params.iter() {
        if let Some(unprefixed) = key.strip_prefix("e_") {
            event_params.insert(unprefixed.to_string(), value.clone());
        }
    }
    let event_param = if event_params.is_empty() {
        None
    } else {
        tracing::debug!(
            event_param_count = event_params.len(),
            "Extracted event parameters"
        );
        Some(EventParamObject { params: event_params })
    };
    
    // Extract u_* prefixed params into ProfileObject (Requirement 4.3)
    let mut profile_props = HashMap::new();
    for (key, value) in params.iter() {
        if let Some(unprefixed) = key.strip_prefix("u_") {
            profile_props.insert(unprefixed.to_string(), value.clone());
        }
    }
    let profile = if profile_props.is_empty() {
        None
    } else {
        tracing::debug!(
            profile_prop_count = profile_props.len(),
            "Extracted profile properties"
        );
        Some(ProfileObject { properties: profile_props })
    };
    
    // Extract s_* prefixed params to root level (Requirement 4.4)
    let mut session_properties = HashMap::new();
    for (key, value) in params.iter() {
        if let Some(unprefixed) = key.strip_prefix("s_") {
            session_properties.insert(unprefixed.to_string(), value.clone());
        }
    }
    if !session_properties.is_empty() {
        tracing::debug!(
            session_prop_count = session_properties.len(),
            "Extracted session properties"
        );
    }
    
    // Extract p_* prefixed params to root level (Requirement 4.5)
    let mut project_properties = HashMap::new();
    for (key, value) in params.iter() {
        if let Some(unprefixed) = key.strip_prefix("p_") {
            project_properties.insert(unprefixed.to_string(), value.clone());
        }
    }
    if !project_properties.is_empty() {
        tracing::debug!(
            project_prop_count = project_properties.len(),
            "Extracted project properties"
        );
    }
    
    tracing::debug!(
        event_type = %event,
        event_id = ?id,
        "Parameter transformation complete"
    );
    
    AnalyticsEvent {
        project,
        event,
        id,
        timestamp,
        session_properties,
        project_properties,
        visit,
        event_param,
        profile,
        // Enriched fields are initially None, will be populated by enrichment pipeline
        browser: None,
        browser_version: None,
        os: None,
        os_version: None,
        device: None,
        country: None,
        region: None,
        city: None,
        latitude: None,
        longitude: None,
    }
}

#[cfg(test)]
mod tests;
