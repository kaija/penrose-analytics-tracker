# Data Collection Documentation

This document outlines all attributes collected by the analytics tracker, including their names, values, data types, and which API endpoints they're sent to.

## Overview

The tracker automatically collects various attributes about the user's browser, device, page interactions, and behavior. These attributes are sent to different API endpoints depending on the type of event.

## Standard Attributes (No Prefix)

These attributes are included in all tracking events and do not have a prefix.

| Attribute Name | Description | Value Type | Example Value | API Endpoint |
|---------------|-------------|------------|---------------|--------------|
| `project` | Project identifier | string | "mywebsite.com" | /track/, /identify, /update |
| `event` | Event name | string | "pageview", "click", "download" | /track/ |
| `cookie` | Unique visitor identifier | string | "abc123xyz789" | /track/, /identify, /update |
| `timestamp` | Event timestamp in milliseconds | number | 1707782400000 | /track/, /identify, /update |
| `url` | Full page URL | string | "https://example.com/page?param=value" | /track/, /update |
| `title` | Page title | string | "Home - My Website" | /track/, /update |
| `domain` | Page hostname | string | "example.com" | /track/, /update |
| `uri` | Page path and query string | string | "/page?param=value" | /track/, /update |
| `duration` | Active time on page (ms, excluding idle) | number | 45000 | /track/, /update |
| `scroll_depth` | Maximum scroll depth percentage | number | 75.5 | /track/, /update |
| `id` | Unique event identifier | string | "1707782400000-abc123" | /track/, /update |

## Browser & Device Attributes

These attributes are automatically collected from the browser environment.

| Attribute Name | Description | Value Type | Example Value | API Endpoint |
|---------------|-------------|------------|---------------|--------------|
| `screen` | Screen resolution | string | "1920x1080" | /track/ |
| `language` | Browser language | string | "en-US" | /track/ |
| `referer` | HTTP referrer URL | string | "https://google.com/search" | /track/ |
| `app` | Application identifier | string | "js-client" | /track/ |

## User Agent Derived Attributes

These attributes are derived from the User-Agent header on the server side:

| Attribute Name | Description | Value Type | Example Value |
|---------------|-------------|------------|---------------|
| `browser` | Browser name | string | "Chrome", "Firefox", "Safari" |
| `browser_version` | Browser version | string | "120.0.6099.109" |
| `os` | Operating system | string | "Windows", "macOS", "Linux", "iOS", "Android" |
| `os_version` | OS version | string | "10.15.7" |
| `device` | Device type | string | "Desktop", "Mobile", "Tablet" |

## Visitor Properties (u_ prefix)

Custom visitor attributes set via `identify()` method. These persist across sessions.

| Attribute Name | Description | Value Type | Example Value | API Endpoint |
|---------------|-------------|------------|---------------|--------------|
| `u_email` | User email address | string | "user@example.com" | /identify, /track/ |
| `u_name` | User full name | string | "John Doe" | /identify, /track/ |
| `u_id` | User ID in your system | string | "user_12345" | /identify, /track/ |
| `u_*` | Any custom visitor property | any | varies | /identify, /track/ |

## Session Properties (s_ prefix)

Session-level attributes set via `setSessionProperties()`. These persist for the current session only.

| Attribute Name | Description | Value Type | Example Value | API Endpoint |
|---------------|-------------|------------|---------------|--------------|
| `s_campaign` | Marketing campaign name | string | "summer_sale_2024" | /track/ |
| `s_source` | Traffic source | string | "google", "facebook" | /track/ |
| `s_medium` | Traffic medium | string | "cpc", "email", "social" | /track/ |
| `s_*` | Any custom session property | any | varies | /track/ |

## Project Properties (p_ prefix)

Project-level attributes set via `setProjectProperties()`. These are global configuration values.

| Attribute Name | Description | Value Type | Example Value | API Endpoint |
|---------------|-------------|------------|---------------|--------------|
| `p_environment` | Environment name | string | "production", "staging" | /track/ |
| `p_version` | Application version | string | "2.1.0" | /track/ |
| `p_*` | Any custom project property | any | varies | /track/ |

## Event Properties (e_ prefix)

Event-specific attributes passed to `track()` method. These vary by event type.

| Attribute Name | Description | Value Type | Example Value | API Endpoint |
|---------------|-------------|------------|---------------|--------------|
| `e_button_text` | Text of clicked button | string | "Sign Up Now" | /track/ |
| `e_form_name` | Name of submitted form | string | "contact_form" | /track/ |
| `e_product_id` | Product identifier | string | "prod_12345" | /track/ |
| `e_*` | Any custom event property | any | varies | /track/ |

## Auto-Tracked Event Properties

These properties are automatically collected for specific event types.

### Click Events

| Attribute Name | Description | Value Type | Example Value |
|---------------|-------------|------------|---------------|
| `e_url` | Link URL (for anchor clicks) | string | "https://example.com/page" |
| `e_text` | Link or element text | string | "Learn More" |
| `e_target` | Link target attribute | string | "_blank", "_self" |
| `e_id` | Element ID | string | "signup-button" |
| `e_class` | Element class names | string | "btn btn-primary" |
| `e_tag` | HTML tag name | string | "button", "a", "div" |

### Download Events

| Attribute Name | Description | Value Type | Example Value |
|---------------|-------------|------------|---------------|
| `e_url` | Download file URL | string | "https://example.com/file.pdf" |
| `e_text` | Link text | string | "Download PDF" |
| `e_file_type` | File extension | string | "pdf", "zip", "docx" |
| `e_target` | Link target | string | "_blank" |

### Outgoing Link Events

| Attribute Name | Description | Value Type | Example Value |
|---------------|-------------|------------|---------------|
| `e_url` | External URL | string | "https://external-site.com" |
| `e_text` | Link text | string | "Visit Partner Site" |
| `e_target` | Link target | string | "_blank" |

## Campaign Tracking Parameters

These are automatically extracted from URL parameters and stored as session properties.

| URL Parameter | Session Property | Description |
|--------------|------------------|-------------|
| `utm_source` | `s_campaign_source` | Campaign source |
| `utm_medium` | `s_campaign_medium` | Campaign medium |
| `utm_campaign` | `s_campaign_name` | Campaign name |
| `utm_term` | `s_campaign_term` | Campaign term/keyword |
| `utm_content` | `s_campaign_content` | Campaign content variant |

## Page Lifecycle Attributes

These track the page state and user engagement.

| Attribute Name | Description | Value Type | Possible Values |
|---------------|-------------|------------|-----------------|
| `state` | Current page lifecycle state | string | "active", "passive", "hidden", "frozen", "terminated" |
| `duration` | Active duration on page (ms) | number | 45000 |
| `scroll_depth` | Maximum scroll percentage | number | 0-100 |
| `idle_start` | Timestamp when user became idle | number | 1707782400000 |
| `active_duration` | Time spent active (excluding idle) | number | 30000 |

## API Endpoints

### /track/ Endpoint

Used for tracking events. Includes all standard attributes plus visitor, session, project, and event properties.

**Request Format:**
```
GET /track/?project=example.com&event=pageview&cookie=abc123&timestamp=1707782400000&url=https://example.com&...
```

### /identify Endpoint

Used for identifying visitors. Includes standard attributes plus visitor properties.

**Request Format:**
```
GET /identify?project=example.com&cookie=abc123&timestamp=1707782400000&u_email=user@example.com&u_name=John+Doe
```

### /update Endpoint

Used for updating existing events (e.g., updating duration when user leaves page).

**Request Format:**
```
GET /update?project=example.com&id=1707782400000-abc123&duration=60000&scroll_depth=85
```

## Privacy Considerations

### Automatically Collected Data

The tracker automatically collects:
- Page URLs and titles
- Browser and device information
- User interactions (clicks, scrolls)
- Time spent on pages
- Referrer information

### User-Provided Data

The tracker can collect user-provided data through:
- `identify()` method (email, name, user ID, etc.)
- Custom event properties
- Form data (if explicitly tracked)

### Cookie Storage

The tracker stores a unique visitor identifier in a first-party cookie:
- Cookie name: `wooTracker` (configurable)
- Cookie duration: 730 days (configurable)
- Cookie domain: Current domain (configurable)
- Cookie path: `/` (configurable)

### Compliance Recommendations

1. **Consent Management**: Implement cookie consent before initializing the tracker
2. **Privacy Policy**: Disclose all collected data in your privacy policy
3. **Data Minimization**: Only collect data necessary for your analytics needs
4. **User Rights**: Provide mechanisms for users to access, delete, or opt-out of tracking
5. **Secure Transmission**: Always use HTTPS for data transmission

## Implementation Examples

### Basic Pageview Tracking

```javascript
tracker.track('pageview');
```

**Collected Attributes:**
- All standard attributes (project, event, cookie, timestamp, url, title, domain, uri, duration, scroll_depth)
- Browser & device attributes (screen, language, referer, app)

### User Identification

```javascript
tracker.identify({
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium'
});
```

**Collected Attributes:**
- Standard attributes (project, cookie, timestamp)
- Visitor properties (u_email, u_name, u_plan)

### Custom Event Tracking

```javascript
tracker.track('purchase', {
  product_id: 'prod_123',
  price: 29.99,
  currency: 'USD'
});
```

**Collected Attributes:**
- All standard attributes
- Event properties (e_product_id, e_price, e_currency)
- Any active visitor, session, and project properties

### Auto-Tracked Click

When user clicks a button with `click_tracking: true`:

**Collected Attributes:**
- All standard attributes
- Event properties (e_tag, e_text, e_id, e_class)

## Data Retention

The tracker itself does not store historical data. Data retention policies are determined by your analytics backend server.

Recommended retention periods:
- Raw event data: 90-365 days
- Aggregated data: 2-5 years
- User profiles: Until user requests deletion

## Security

### Data Transmission

- All data is transmitted via HTTPS
- Sensitive data should never be included in event properties
- PII (Personally Identifiable Information) should be handled according to privacy regulations

### Cookie Security

- Cookies can be marked as `secure` (HTTPS only)
- Cookies are first-party (same domain as your site)
- No third-party cookies are used by default

## Summary

The tracker collects comprehensive data about user behavior while maintaining flexibility for custom attributes. All data collection is transparent and can be controlled through configuration options. Ensure compliance with privacy regulations (GDPR, CCPA, etc.) by implementing proper consent mechanisms and data handling procedures.
