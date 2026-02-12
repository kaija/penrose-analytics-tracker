# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

#### Core Features
- Manual event tracking with custom properties
- Automatic pageview tracking on initialization
- User identification with persistent visitor properties
- Cookie-based visitor tracking across sessions
- Session properties management
- Project properties management
- Dynamic configuration updates at runtime

#### Automatic Tracking
- Automatic click tracking for all page elements
- Automatic download link tracking (PDF, ZIP, DOC, etc.)
- Automatic outgoing link tracking for external URLs
- Configurable auto-tracking options

#### Page Analytics
- Page lifecycle state tracking (active, passive, hidden, frozen, terminated)
- Scroll depth tracking (current and maximum)
- Active time on page calculation (excluding idle time)
- Idle detection with configurable timeout
- Page unload handling with final event sending

#### Reliability Features
- Event queue with automatic retry mechanism
- Exponential backoff for failed requests
- sendBeacon API for reliable page unload tracking
- localStorage backup for failed events
- Graceful degradation when browser features unavailable

#### Developer Experience
- Full TypeScript support with complete type definitions
- Comprehensive API documentation
- Usage examples for common scenarios
- Quick start guide
- Browser and Node.js examples

#### Testing
- Comprehensive unit test suite using Jest
- Property-based tests using fast-check
- Integration tests for complete workflows
- >85% code coverage
- All 40 correctness properties tested

### Technical Details

#### Modules
- `Tracker`: Main tracker class with public API
- `CookieManager`: Cookie management and visitor ID generation
- `EventQueue`: Event queuing and retry logic
- `APIClient`: HTTP communication with backend API
- `AutoTracker`: Automatic event tracking
- `PageStateManager`: Page state and lifecycle tracking

#### API Endpoints
- `POST /track/`: Track events
- `POST /identify`: Identify users
- `POST /update`: Update existing events

#### Property Prefixes
- `u_`: User/visitor properties
- `s_`: Session properties
- `p_`: Project properties
- `e_`: Event-specific properties
- No prefix: Standard system properties

#### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Modern browsers with ES6+ support

### Documentation
- README.md: Project overview and quick start
- QUICKSTART.md: 5-minute quick start guide
- USAGE.md: Comprehensive usage documentation
- API.md: Complete API reference
- examples/: Code examples for various scenarios
- LICENSE: MIT license

### Package Configuration
- CommonJS and ES Module support
- TypeScript declaration files
- Proper package.json exports field
- Files whitelist for npm publishing

## [Unreleased]

### Planned Features
- React hooks integration
- Vue plugin
- Angular service
- Server-side rendering (SSR) support
- Custom storage adapters
- Event batching options
- Offline queue persistence
- Custom retry strategies
- Event middleware/plugins
- Debug mode with detailed logging

---

## Version History

### Version 1.0.0 (Initial Release)
First stable release with complete feature set including:
- Core tracking functionality
- Automatic tracking capabilities
- Page analytics
- Reliability features
- Full TypeScript support
- Comprehensive documentation
- Extensive test coverage

---

## Migration Guide

### From Pre-1.0 Versions

This is the initial stable release. No migration needed.

---

## Breaking Changes

None (initial release)

---

## Deprecations

None (initial release)

---

## Security

### Reporting Security Issues

Please report security vulnerabilities to: security@example.com

### Security Considerations

- Cookies can be configured with `secure` flag for HTTPS-only
- No sensitive data is stored in cookies (only visitor ID)
- All API communication can be done over HTTPS
- No eval() or similar unsafe operations
- Input sanitization for all user-provided data

---

## Contributors

Thanks to all contributors who helped build this project!

---

## License

MIT - See LICENSE file for details
