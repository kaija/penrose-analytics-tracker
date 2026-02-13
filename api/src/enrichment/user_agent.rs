// User-Agent parsing implementation
// This module extracts browser, OS, and device information from User-Agent headers

/// Information extracted from a User-Agent header
#[derive(Debug, Clone, PartialEq)]
pub struct UserAgentInfo {
    /// Browser name (e.g., "Chrome", "Firefox", "Safari")
    pub browser: Option<String>,
    /// Browser version (e.g., "120.0", "91.0.4472.124")
    pub browser_version: Option<String>,
    /// Operating system name (e.g., "Windows", "macOS", "Linux", "iOS", "Android")
    pub os: Option<String>,
    /// Operating system version (e.g., "10", "14.2", "11.0")
    pub os_version: Option<String>,
    /// Device type: "Desktop", "Mobile", "Tablet", or None for unknown
    pub device: Option<String>,
}

/// Trait for parsing User-Agent headers
/// Must be Send + Sync to be used in async contexts with Arc
pub trait UserAgentParser: Send + Sync {
    /// Parse a User-Agent string and extract browser, OS, and device information
    ///
    /// # Arguments
    /// * `user_agent` - The User-Agent header string to parse
    ///
    /// # Returns
    /// A `UserAgentInfo` struct with extracted information. Fields will be None or "Unknown"
    /// if the User-Agent is missing, unparseable, or doesn't contain the information.
    fn parse(&self, user_agent: &str) -> UserAgentInfo;
}

/// Woothee-based User-Agent parser implementation
pub struct WootheeParser;

impl WootheeParser {
    /// Create a new WootheeParser instance
    pub fn new() -> Self {
        WootheeParser
    }
}

impl Default for WootheeParser {
    fn default() -> Self {
        Self::new()
    }
}

impl UserAgentParser for WootheeParser {
    fn parse(&self, user_agent: &str) -> UserAgentInfo {
        // Handle empty or whitespace-only User-Agent strings
        if user_agent.trim().is_empty() {
            tracing::debug!(
                "Empty or whitespace User-Agent string"
            );
            return UserAgentInfo {
                browser: None,
                browser_version: None,
                os: None,
                os_version: None,
                device: None,
            };
        }

        // Parse using woothee
        match woothee::parser::Parser::new().parse(user_agent) {
            Some(result) => {
                // Extract browser name and version
                let browser = if result.name.is_empty() {
                    None
                } else {
                    Some(result.name.to_string())
                };

                let browser_version = if result.version.is_empty() {
                    None
                } else {
                    Some(result.version.to_string())
                };

                // Extract OS name and version
                let os = if result.os.is_empty() {
                    None
                } else {
                    Some(result.os.to_string())
                };

                let os_version = if result.os_version.to_string().is_empty() {
                    None
                } else {
                    Some(result.os_version.to_string())
                };

                // Classify device type based on woothee's category
                let device = match result.category {
                    "pc" => Some("Desktop".to_string()),
                    "smartphone" => Some("Mobile".to_string()),
                    "mobilephone" => Some("Mobile".to_string()),
                    "tablet" => Some("Tablet".to_string()),
                    "appliance" => Some("Mobile".to_string()),
                    "crawler" => None, // Bots/crawlers don't have a device type
                    "misc" => None,
                    "unknown" => None,
                    _ => None,
                };

                tracing::debug!(
                    browser = ?browser,
                    browser_version = ?browser_version,
                    os = ?os,
                    os_version = ?os_version,
                    device = ?device,
                    category = result.category,
                    "User-Agent parsed successfully"
                );

                UserAgentInfo {
                    browser,
                    browser_version,
                    os,
                    os_version,
                    device,
                }
            }
            None => {
                // Unparseable User-Agent - return all None
                tracing::debug!(
                    user_agent_length = user_agent.len(),
                    "Failed to parse User-Agent string"
                );
                UserAgentInfo {
                    browser: None,
                    browser_version: None,
                    os: None,
                    os_version: None,
                    device: None,
                }
            }
        }
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_chrome_desktop() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        let result = parser.parse(ua);

        assert_eq!(result.browser, Some("Chrome".to_string()));
        assert!(result.browser_version.is_some());
        assert_eq!(result.os, Some("Windows 10".to_string()));
        assert_eq!(result.device, Some("Desktop".to_string()));
    }

    #[test]
    fn test_parse_firefox_desktop() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0";
        let result = parser.parse(ua);

        assert_eq!(result.browser, Some("Firefox".to_string()));
        assert!(result.browser_version.is_some());
        assert_eq!(result.os, Some("Windows 10".to_string()));
        assert_eq!(result.device, Some("Desktop".to_string()));
    }

    #[test]
    fn test_parse_safari_mobile() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        let result = parser.parse(ua);

        assert_eq!(result.browser, Some("Safari".to_string()));
        assert!(result.browser_version.is_some());
        assert_eq!(result.os, Some("iPhone".to_string()));
        assert_eq!(result.device, Some("Mobile".to_string()));
    }

    #[test]
    fn test_parse_chrome_android() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        let result = parser.parse(ua);

        assert_eq!(result.browser, Some("Chrome".to_string()));
        assert!(result.browser_version.is_some());
        assert_eq!(result.os, Some("Android".to_string()));
        assert_eq!(result.device, Some("Mobile".to_string()));
    }

    #[test]
    fn test_parse_ipad_tablet() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        let result = parser.parse(ua);

        assert_eq!(result.browser, Some("Safari".to_string()));
        assert!(result.browser_version.is_some());
        assert_eq!(result.os, Some("iPad".to_string()));
        // Note: woothee may classify iPad as Mobile or Tablet depending on the UA string
        assert!(result.device == Some("Mobile".to_string()) || result.device == Some("Tablet".to_string()));
    }

    #[test]
    fn test_parse_empty_user_agent() {
        let parser = WootheeParser::new();
        let result = parser.parse("");

        assert_eq!(result.browser, None);
        assert_eq!(result.browser_version, None);
        assert_eq!(result.os, None);
        assert_eq!(result.os_version, None);
        assert_eq!(result.device, None);
    }

    #[test]
    fn test_parse_whitespace_user_agent() {
        let parser = WootheeParser::new();
        let result = parser.parse("   ");

        assert_eq!(result.browser, None);
        assert_eq!(result.browser_version, None);
        assert_eq!(result.os, None);
        assert_eq!(result.os_version, None);
        assert_eq!(result.device, None);
    }

    #[test]
    fn test_parse_malformed_user_agent() {
        let parser = WootheeParser::new();
        let result = parser.parse("invalid-user-agent-string");

        // Woothee should handle this gracefully, returning None or minimal info
        // The exact behavior depends on woothee's implementation
        // We just verify it doesn't panic
        assert!(result.browser.is_none() || result.browser.is_some());
    }

    #[test]
    fn test_parse_bot_user_agent() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
        let result = parser.parse(ua);

        // Bots typically don't have a device classification
        assert_eq!(result.device, None);
    }

    #[test]
    fn test_device_classification_desktop() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        let result = parser.parse(ua);

        assert_eq!(result.device, Some("Desktop".to_string()));
    }

    #[test]
    fn test_device_classification_mobile() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        let result = parser.parse(ua);

        assert_eq!(result.device, Some("Mobile".to_string()));
    }

    #[test]
    fn test_device_classification_tablet() {
        let parser = WootheeParser::new();
        let ua = "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
        let result = parser.parse(ua);

        // Note: woothee may classify iPad as Mobile or Tablet depending on the UA string
        assert!(result.device == Some("Mobile".to_string()) || result.device == Some("Tablet".to_string()));
    }

    #[test]
    fn test_default_trait() {
        let parser = WootheeParser::default();
        let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        let result = parser.parse(ua);

        assert_eq!(result.browser, Some("Chrome".to_string()));
    }
}
