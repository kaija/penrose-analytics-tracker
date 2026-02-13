// Data enrichment module
// This module handles User-Agent parsing and GeoIP lookup

pub mod user_agent;
pub mod geoip;

// Re-export commonly used types
pub use user_agent::{UserAgentInfo, UserAgentParser, WootheeParser};
pub use geoip::{GeoLocation, GeoIpLookup, GeoIpError};
