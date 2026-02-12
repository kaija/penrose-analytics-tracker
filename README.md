# Analytics Tracker

A JavaScript analytics tracking system with event tracking, user identification, and automatic tracking capabilities.

## Features

- 📊 Manual event tracking with custom properties
- 👤 User identification and session management
- 🔄 Automatic click, download, and external link tracking
- 🍪 Cookie-based visitor identification
- 📄 Page lifecycle and scroll depth tracking
- 🔁 Event queue with retry mechanism
- 🎯 Full TypeScript support

## Installation

```bash
npm install analytics-tracker
```

## Quick Start

```typescript
import { Tracker } from 'analytics-tracker';

const tracker = new Tracker({
  project: 'my-project',
  endpoint: 'https://analytics.example.com'
});

// Track events
tracker.track('button_click', {
  button_name: 'signup'
});

// Identify users
tracker.identify({
  email: 'user@example.com',
  name: 'John Doe'
});
```

## Configuration

```typescript
const tracker = new Tracker({
  project: 'my-project',              // Required
  endpoint: 'https://api.example.com', // Required
  click_tracking: true,                // Auto-track clicks
  download_tracking: true,             // Auto-track downloads
  outgoing_tracking: true,             // Auto-track external links
  idle_timeout: 30000,                 // Idle timeout (ms)
  cookie: {
    domain: '.example.com',
    expire: 730,                       // Days
    secure: true
  }
});
```

## API

### track(event, properties?)
Track custom events with optional properties.

```typescript
tracker.track('purchase', {
  order_id: 'ORD-123',
  total: 99.99
});
```

### identify(properties)
Identify users and associate properties.

```typescript
tracker.identify({
  email: 'user@example.com',
  user_id: '12345',
  plan: 'premium'
});
```

### setSessionProperties(properties)
Set properties for the current session.

```typescript
tracker.setSessionProperties({
  session_id: 'sess_123',
  referrer: 'google.com'
});
```

### setProjectProperties(properties)
Set properties that persist across sessions.

```typescript
tracker.setProjectProperties({
  app_version: '2.0.0',
  environment: 'production'
});
```

### clearSessionProperties()
Clear all session properties.

```typescript
tracker.clearSessionProperties();
```

### destroy()
Clean up event listeners and timers.

```typescript
tracker.destroy();
```

## Interactive Demo

Try the demo server to see the tracker in action:

```bash
cd examples
npm run demo
```

Open http://localhost:3000 in your browser.

## Examples

See the [examples](./examples) directory for:
- Browser usage examples
- Node.js server-side tracking
- TypeScript examples
- E-commerce tracking patterns
- SaaS application tracking

## Development

```bash
npm install          # Install dependencies
npm run build        # Build the project
npm test             # Run tests
npm run test:coverage # Generate coverage report
```

## License

MIT
