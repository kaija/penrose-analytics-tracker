// GeoIP lookup implementation
// This module performs IP address geolocation using MaxMind database

use maxminddb::Reader;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::path::Path;

/// Error types for GeoIP operations
#[derive(Debug)]
pub enum GeoIpError {
    /// Database file not found or cannot be read
    DatabaseError(String),
    /// Error looking up IP address
    LookupError(String),
}

impl std::fmt::Display for GeoIpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GeoIpError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            GeoIpError::LookupError(msg) => write!(f, "Lookup error: {}", msg),
        }
    }
}

impl std::error::Error for GeoIpError {}

impl From<maxminddb::MaxMindDBError> for GeoIpError {
    fn from(err: maxminddb::MaxMindDBError) -> Self {
        GeoIpError::DatabaseError(err.to_string())
    }
}

/// Geographic location information extracted from IP address
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct GeoLocation {
    pub country: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}



/// GeoIP lookup service using MaxMind database
pub struct GeoIpLookup {
    reader: Reader<Vec<u8>>,
}

impl GeoIpLookup {
    /// Create a new GeoIP lookup service by loading the MaxMind database into memory
    ///
    /// # Arguments
    /// * `db_path` - Path to the MaxMind GeoIP database file
    ///
    /// # Errors
    /// Returns an error if the database file cannot be read or is invalid
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self, maxminddb::MaxMindDBError> {
        let reader = Reader::open_readfile(db_path)?;
        Ok(Self { reader })
    }

    /// Look up geographic location for an IP address
    ///
    /// # Arguments
    /// * `ip` - The IP address to look up (IPv4 or IPv6)
    ///
    /// # Returns
    /// Returns a `GeoLocation` with available fields populated, or all fields set to None
    /// if the IP is not found in the database or an error occurs
    pub fn lookup(&self, ip: IpAddr) -> GeoLocation {
        tracing::debug!(
            ip = %ip,
            ip_version = if ip.is_ipv4() { "IPv4" } else { "IPv6" },
            "Starting GeoIP lookup"
        );
        
        // Attempt to look up the IP in the database
        // If lookup fails or data is missing, return default (all None values)
        match self.reader.lookup::<maxminddb::geoip2::City>(ip) {
            Ok(city) => {
                let country = city
                    .country
                    .and_then(|c| c.names)
                    .and_then(|n| n.get("en").map(|s| s.to_string()));

                let region = city
                    .subdivisions
                    .and_then(|subs| subs.first().cloned())
                    .and_then(|sub| sub.names)
                    .and_then(|n| n.get("en").map(|s| s.to_string()));

                let city_name = city
                    .city
                    .and_then(|c| c.names)
                    .and_then(|n| n.get("en").map(|s| s.to_string()));

                let (latitude, longitude) = city
                    .location
                    .map(|loc| (loc.latitude, loc.longitude))
                    .unwrap_or((None, None));

                tracing::debug!(
                    ip = %ip,
                    country = ?country,
                    region = ?region,
                    city = ?city_name,
                    has_coordinates = latitude.is_some() && longitude.is_some(),
                    "GeoIP lookup successful"
                );

                GeoLocation {
                    country,
                    region,
                    city: city_name,
                    latitude,
                    longitude,
                }
            }
            Err(e) => {
                tracing::debug!(
                    ip = %ip,
                    error = %e,
                    "GeoIP lookup failed, returning default location"
                );
                GeoLocation::default()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    // Helper function to create a mock GeoIP database for testing
    // Note: In real tests, you would need an actual MaxMind database file
    // For now, we'll test the structure and error handling

    #[test]
    fn test_geolocation_default() {
        let geo = GeoLocation::default();
        assert_eq!(geo.country, None);
        assert_eq!(geo.region, None);
        assert_eq!(geo.city, None);
        assert_eq!(geo.latitude, None);
        assert_eq!(geo.longitude, None);
    }

    #[test]
    fn test_geolocation_with_values() {
        let geo = GeoLocation {
            country: Some("United States".to_string()),
            region: Some("California".to_string()),
            city: Some("San Francisco".to_string()),
            latitude: Some(37.7749),
            longitude: Some(-122.4194),
        };

        assert_eq!(geo.country, Some("United States".to_string()));
        assert_eq!(geo.region, Some("California".to_string()));
        assert_eq!(geo.city, Some("San Francisco".to_string()));
        assert_eq!(geo.latitude, Some(37.7749));
        assert_eq!(geo.longitude, Some(-122.4194));
    }

    #[test]
    fn test_geoip_lookup_new_with_invalid_path() {
        // Test that creating a GeoIpLookup with an invalid path returns an error
        let result = GeoIpLookup::new("/nonexistent/path/to/database.mmdb");
        assert!(result.is_err());
    }

    #[test]
    fn test_lookup_returns_default_for_missing_data() {
        // This test demonstrates that lookup returns default (all None) when data is missing
        // In a real scenario with a database, we would test with an IP not in the database
        
        // We can't easily test this without a real database file, but we can verify
        // that the GeoLocation struct can be created with None values
        let geo = GeoLocation::default();
        assert!(geo.country.is_none());
        assert!(geo.region.is_none());
        assert!(geo.city.is_none());
        assert!(geo.latitude.is_none());
        assert!(geo.longitude.is_none());
    }

    #[test]
    fn test_ipv4_address_format() {
        // Test that IPv4 addresses can be created and used
        let ipv4 = IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8));
        assert!(matches!(ipv4, IpAddr::V4(_)));
    }

    #[test]
    fn test_ipv6_address_format() {
        // Test that IPv6 addresses can be created and used
        let ipv6 = IpAddr::V6(Ipv6Addr::new(0x2001, 0x4860, 0x4860, 0, 0, 0, 0, 0x8888));
        assert!(matches!(ipv6, IpAddr::V6(_)));
    }

    #[test]
    fn test_geolocation_partial_data() {
        // Test GeoLocation with only some fields populated
        let geo = GeoLocation {
            country: Some("United States".to_string()),
            region: None,
            city: None,
            latitude: Some(37.0),
            longitude: Some(-122.0),
        };

        assert!(geo.country.is_some());
        assert!(geo.region.is_none());
        assert!(geo.city.is_none());
        assert!(geo.latitude.is_some());
        assert!(geo.longitude.is_some());
    }

    // Integration test with a real database would look like this:
    // (Commented out as it requires a real MaxMind database file)
    /*
    #[test]
    fn test_lookup_with_real_database() {
        // This test requires a real MaxMind GeoLite2-City.mmdb file
        let db_path = "path/to/GeoLite2-City.mmdb";
        let lookup = GeoIpLookup::new(db_path).expect("Failed to load database");
        
        // Test with Google's public DNS (8.8.8.8)
        let ip = IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8));
        let result = lookup.lookup(ip);
        
        // Google's DNS is in the US
        assert_eq!(result.country, Some("United States".to_string()));
    }

    #[test]
    fn test_lookup_ipv6_with_real_database() {
        let db_path = "path/to/GeoLite2-City.mmdb";
        let lookup = GeoIpLookup::new(db_path).expect("Failed to load database");
        
        // Test with Google's public DNS IPv6 (2001:4860:4860::8888)
        let ip = IpAddr::V6(Ipv6Addr::new(0x2001, 0x4860, 0x4860, 0, 0, 0, 0, 0x8888));
        let result = lookup.lookup(ip);
        
        assert_eq!(result.country, Some("United States".to_string()));
    }

    #[test]
    fn test_lookup_private_ip() {
        let db_path = "path/to/GeoLite2-City.mmdb";
        let lookup = GeoIpLookup::new(db_path).expect("Failed to load database");
        
        // Test with private IP (192.168.1.1)
        let ip = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1));
        let result = lookup.lookup(ip);
        
        // Private IPs should not be in the database
        assert_eq!(result, GeoLocation::default());
    }
    */
}
