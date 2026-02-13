// Unit tests for transformer module

use super::*;
use serde_json;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analytics_event_serialization() {
        // Create a minimal AnalyticsEvent
        let event = AnalyticsEvent {
            project: Some("test-project".to_string()),
            event: "pageview".to_string(),
            id: Some("evt_123".to_string()),
            timestamp: 1704067200000,
            session_properties: HashMap::new(),
            project_properties: HashMap::new(),
            visit: VisitObject {
                cookie: Some("user_xyz".to_string()),
                timestamp: Some(1704067200000),
                url: Some("https://example.com".to_string()),
                title: Some("Example".to_string()),
                domain: Some("example.com".to_string()),
                uri: Some("/".to_string()),
                duration: None,
                scroll_depth: None,
                screen: Some("1920x1080".to_string()),
                language: Some("en-US".to_string()),
                referer: None,
                app: Some("web".to_string()),
            },
            event_param: None,
            profile: None,
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
        };

        // Serialize to JSON
        let json = serde_json::to_string(&event).expect("Failed to serialize");
        
        // Deserialize back
        let deserialized: AnalyticsEvent = serde_json::from_str(&json)
            .expect("Failed to deserialize");
        
        // Verify round-trip
        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_event_param_object_with_params() {
        let mut params = HashMap::new();
        params.insert("button_text".to_string(), "Click Me".to_string());
        params.insert("product_id".to_string(), "prod_123".to_string());
        
        let event_param = EventParamObject { params };
        
        // Serialize to JSON
        let json = serde_json::to_string(&event_param).expect("Failed to serialize");
        
        // Should flatten the params into the object
        assert!(json.contains("button_text"));
        assert!(json.contains("Click Me"));
        assert!(json.contains("product_id"));
        assert!(json.contains("prod_123"));
    }

    #[test]
    fn test_profile_object_with_properties() {
        let mut properties = HashMap::new();
        properties.insert("email".to_string(), "user@example.com".to_string());
        properties.insert("name".to_string(), "John Doe".to_string());
        
        let profile = ProfileObject { properties };
        
        // Serialize to JSON
        let json = serde_json::to_string(&profile).expect("Failed to serialize");
        
        // Should flatten the properties into the object
        assert!(json.contains("email"));
        assert!(json.contains("user@example.com"));
        assert!(json.contains("name"));
        assert!(json.contains("John Doe"));
    }

    #[test]
    fn test_visit_object_all_fields() {
        let visit = VisitObject {
            cookie: Some("cookie_123".to_string()),
            timestamp: Some(1704067200000),
            url: Some("https://example.com/page".to_string()),
            title: Some("Page Title".to_string()),
            domain: Some("example.com".to_string()),
            uri: Some("/page".to_string()),
            duration: Some(5000),
            scroll_depth: Some(75),
            screen: Some("1920x1080".to_string()),
            language: Some("en-US".to_string()),
            referer: Some("https://google.com".to_string()),
            app: Some("web".to_string()),
        };

        // Serialize and deserialize
        let json = serde_json::to_string(&visit).expect("Failed to serialize");
        let deserialized: VisitObject = serde_json::from_str(&json)
            .expect("Failed to deserialize");
        
        assert_eq!(visit, deserialized);
    }

    #[test]
    fn test_transform_params_standard_fields() {
        let mut params = HashMap::new();
        params.insert("project".to_string(), "my-project".to_string());
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("id".to_string(), "evt_123".to_string());
        params.insert("timestamp".to_string(), "1704067200000".to_string());

        let event = transform_params(params);

        assert_eq!(event.project, Some("my-project".to_string()));
        assert_eq!(event.event, "pageview");
        assert_eq!(event.id, Some("evt_123".to_string()));
        assert_eq!(event.timestamp, 1704067200000);
    }

    #[test]
    fn test_transform_params_visit_fields() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("cookie".to_string(), "user_xyz".to_string());
        params.insert("url".to_string(), "https://example.com".to_string());
        params.insert("title".to_string(), "Example Page".to_string());
        params.insert("domain".to_string(), "example.com".to_string());
        params.insert("uri".to_string(), "/page".to_string());
        params.insert("duration".to_string(), "5000".to_string());
        params.insert("scroll_depth".to_string(), "75".to_string());
        params.insert("screen".to_string(), "1920x1080".to_string());
        params.insert("language".to_string(), "en-US".to_string());
        params.insert("referer".to_string(), "https://google.com".to_string());
        params.insert("app".to_string(), "web".to_string());

        let event = transform_params(params);

        assert_eq!(event.visit.cookie, Some("user_xyz".to_string()));
        assert_eq!(event.visit.url, Some("https://example.com".to_string()));
        assert_eq!(event.visit.title, Some("Example Page".to_string()));
        assert_eq!(event.visit.domain, Some("example.com".to_string()));
        assert_eq!(event.visit.uri, Some("/page".to_string()));
        assert_eq!(event.visit.duration, Some(5000));
        assert_eq!(event.visit.scroll_depth, Some(75));
        assert_eq!(event.visit.screen, Some("1920x1080".to_string()));
        assert_eq!(event.visit.language, Some("en-US".to_string()));
        assert_eq!(event.visit.referer, Some("https://google.com".to_string()));
        assert_eq!(event.visit.app, Some("web".to_string()));
    }

    #[test]
    fn test_transform_params_event_params() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "click".to_string());
        params.insert("e_button_text".to_string(), "Click Me".to_string());
        params.insert("e_product_id".to_string(), "prod_123".to_string());
        params.insert("e_category".to_string(), "electronics".to_string());

        let event = transform_params(params);

        assert!(event.event_param.is_some());
        let event_params = event.event_param.unwrap();
        assert_eq!(event_params.params.get("button_text"), Some(&"Click Me".to_string()));
        assert_eq!(event_params.params.get("product_id"), Some(&"prod_123".to_string()));
        assert_eq!(event_params.params.get("category"), Some(&"electronics".to_string()));
    }

    #[test]
    fn test_transform_params_profile_properties() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "identify".to_string());
        params.insert("u_email".to_string(), "user@example.com".to_string());
        params.insert("u_name".to_string(), "John Doe".to_string());
        params.insert("u_id".to_string(), "user_123".to_string());

        let event = transform_params(params);

        assert!(event.profile.is_some());
        let profile = event.profile.unwrap();
        assert_eq!(profile.properties.get("email"), Some(&"user@example.com".to_string()));
        assert_eq!(profile.properties.get("name"), Some(&"John Doe".to_string()));
        assert_eq!(profile.properties.get("id"), Some(&"user_123".to_string()));
    }

    #[test]
    fn test_transform_params_session_properties() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("s_session_id".to_string(), "sess_abc123".to_string());
        params.insert("s_session_start".to_string(), "1704067200000".to_string());

        let event = transform_params(params);

        assert_eq!(event.session_properties.get("session_id"), Some(&"sess_abc123".to_string()));
        assert_eq!(event.session_properties.get("session_start"), Some(&"1704067200000".to_string()));
    }

    #[test]
    fn test_transform_params_project_properties() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("p_version".to_string(), "1.0.0".to_string());
        params.insert("p_environment".to_string(), "production".to_string());

        let event = transform_params(params);

        assert_eq!(event.project_properties.get("version"), Some(&"1.0.0".to_string()));
        assert_eq!(event.project_properties.get("environment"), Some(&"production".to_string()));
    }

    #[test]
    fn test_transform_params_all_prefixes() {
        let mut params = HashMap::new();
        params.insert("project".to_string(), "my-project".to_string());
        params.insert("event".to_string(), "click".to_string());
        params.insert("id".to_string(), "evt_123".to_string());
        params.insert("timestamp".to_string(), "1704067200000".to_string());
        params.insert("cookie".to_string(), "user_xyz".to_string());
        params.insert("url".to_string(), "https://example.com".to_string());
        params.insert("e_button_text".to_string(), "Click Me".to_string());
        params.insert("u_email".to_string(), "user@example.com".to_string());
        params.insert("s_session_id".to_string(), "sess_abc".to_string());
        params.insert("p_version".to_string(), "1.0.0".to_string());

        let event = transform_params(params);

        // Verify standard fields
        assert_eq!(event.project, Some("my-project".to_string()));
        assert_eq!(event.event, "click");
        assert_eq!(event.id, Some("evt_123".to_string()));
        assert_eq!(event.timestamp, 1704067200000);

        // Verify visit fields
        assert_eq!(event.visit.cookie, Some("user_xyz".to_string()));
        assert_eq!(event.visit.url, Some("https://example.com".to_string()));

        // Verify event params
        assert!(event.event_param.is_some());
        assert_eq!(event.event_param.unwrap().params.get("button_text"), Some(&"Click Me".to_string()));

        // Verify profile
        assert!(event.profile.is_some());
        assert_eq!(event.profile.unwrap().properties.get("email"), Some(&"user@example.com".to_string()));

        // Verify session properties
        assert_eq!(event.session_properties.get("session_id"), Some(&"sess_abc".to_string()));

        // Verify project properties
        assert_eq!(event.project_properties.get("version"), Some(&"1.0.0".to_string()));
    }

    #[test]
    fn test_transform_params_empty_event_params() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("url".to_string(), "https://example.com".to_string());

        let event = transform_params(params);

        assert!(event.event_param.is_none());
    }

    #[test]
    fn test_transform_params_empty_profile() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("url".to_string(), "https://example.com".to_string());

        let event = transform_params(params);

        assert!(event.profile.is_none());
    }

    #[test]
    fn test_transform_params_default_event() {
        let params = HashMap::new();

        let event = transform_params(params);

        assert_eq!(event.event, "unknown");
    }

    #[test]
    fn test_transform_params_invalid_numeric_fields() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());
        params.insert("timestamp".to_string(), "invalid".to_string());
        params.insert("duration".to_string(), "not_a_number".to_string());
        params.insert("scroll_depth".to_string(), "abc".to_string());

        let event = transform_params(params);

        // timestamp should use current time (we can't test exact value)
        assert!(event.timestamp > 0);
        
        // Invalid numeric fields should be None
        assert_eq!(event.visit.duration, None);
        assert_eq!(event.visit.scroll_depth, None);
    }

    #[test]
    fn test_transform_params_enriched_fields_initially_none() {
        let mut params = HashMap::new();
        params.insert("event".to_string(), "pageview".to_string());

        let event = transform_params(params);

        // All enriched fields should be None initially
        assert_eq!(event.browser, None);
        assert_eq!(event.browser_version, None);
        assert_eq!(event.os, None);
        assert_eq!(event.os_version, None);
        assert_eq!(event.device, None);
        assert_eq!(event.country, None);
        assert_eq!(event.region, None);
        assert_eq!(event.city, None);
        assert_eq!(event.latitude, None);
        assert_eq!(event.longitude, None);
    }
}


    #[test]
    fn test_transform_params_json_round_trip() {
        // Create a comprehensive set of parameters
        let mut params = HashMap::new();
        params.insert("project".to_string(), "my-website".to_string());
        params.insert("event".to_string(), "click".to_string());
        params.insert("id".to_string(), "evt_123456".to_string());
        params.insert("timestamp".to_string(), "1704067200000".to_string());
        params.insert("cookie".to_string(), "user_xyz".to_string());
        params.insert("url".to_string(), "https://example.com/page".to_string());
        params.insert("title".to_string(), "Example Page".to_string());
        params.insert("domain".to_string(), "example.com".to_string());
        params.insert("uri".to_string(), "/page".to_string());
        params.insert("duration".to_string(), "5000".to_string());
        params.insert("scroll_depth".to_string(), "75".to_string());
        params.insert("screen".to_string(), "1920x1080".to_string());
        params.insert("language".to_string(), "en-US".to_string());
        params.insert("referer".to_string(), "https://google.com".to_string());
        params.insert("app".to_string(), "web".to_string());
        params.insert("e_button_text".to_string(), "Click Me".to_string());
        params.insert("e_product_id".to_string(), "prod_123".to_string());
        params.insert("u_email".to_string(), "user@example.com".to_string());
        params.insert("u_name".to_string(), "John Doe".to_string());
        params.insert("s_session_id".to_string(), "sess_abc123".to_string());
        params.insert("p_version".to_string(), "1.0.0".to_string());

        // Transform parameters
        let event = transform_params(params);

        // Serialize to JSON
        let json = serde_json::to_string_pretty(&event).expect("Failed to serialize");
        
        // Verify JSON contains expected structure
        assert!(json.contains("\"project\": \"my-website\""));
        assert!(json.contains("\"event\": \"click\""));
        assert!(json.contains("\"visit\""));
        assert!(json.contains("\"event_param\""));
        assert!(json.contains("\"profile\""));
        assert!(json.contains("\"button_text\": \"Click Me\""));
        assert!(json.contains("\"email\": \"user@example.com\""));
        assert!(json.contains("\"session_id\": \"sess_abc123\""));
        assert!(json.contains("\"version\": \"1.0.0\""));

        // Deserialize back
        let deserialized: AnalyticsEvent = serde_json::from_str(&json)
            .expect("Failed to deserialize");

        // Verify round-trip preserves data
        assert_eq!(event.project, deserialized.project);
        assert_eq!(event.event, deserialized.event);
        assert_eq!(event.id, deserialized.id);
        assert_eq!(event.timestamp, deserialized.timestamp);
        assert_eq!(event.visit, deserialized.visit);
        assert_eq!(event.event_param, deserialized.event_param);
        assert_eq!(event.profile, deserialized.profile);
        
        // Verify session properties
        assert_eq!(event.session_properties.get("session_id"), deserialized.session_properties.get("session_id"));
        
        // Verify project properties
        assert_eq!(event.project_properties.get("version"), deserialized.project_properties.get("version"));
    }
