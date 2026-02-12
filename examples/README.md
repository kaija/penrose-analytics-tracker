# Examples

## Interactive Demo

Start the demo server to see the tracker in action:

```bash
cd examples
npm run demo
```

Open http://localhost:3000 in your browser.

The demo includes:
- Interactive demo page with tracking buttons
- Real-time dashboard showing all events
- Colored console output in terminal

## Example Files

### cdn-example.html
Simple CDN usage example - no build step required.

Open directly in a browser:
```bash
open examples/cdn-example.html
```

### basic-usage.ts
TypeScript examples covering all features.

```bash
npx ts-node examples/basic-usage.ts
```

### browser-example.html
Interactive HTML page with browser tracking.

Open directly in a browser or use a local server:
```bash
python -m http.server 8000
# Open: http://localhost:8000/examples/browser-example.html
```

### nodejs-example.js
Node.js server-side tracking examples.

```bash
node examples/nodejs-example.js
```

## Quick Examples

### CDN

```html
<script src="https://cdn.example.com/analytics-tracker.min.js"></script>
<script>
  const tracker = new AnalyticsTracker({
    project: 'my-project',
    endpoint: 'https://analytics.example.com',
    click_tracking: true
  });

  tracker.track('page_view');
</script>
```

### Node.js

```javascript
const { Tracker } = require('analytics-tracker');

const tracker = new Tracker({
  project: 'my-server',
  endpoint: 'https://analytics.example.com'
});

tracker.track('server_started', {
  node_version: process.version
});
```

### TypeScript

```typescript
import { Tracker, TrackerConfig } from 'analytics-tracker';

const config: TrackerConfig = {
  project: 'my-app',
  endpoint: 'https://analytics.example.com'
};

const tracker = new Tracker(config);
tracker.track('custom_event');
```

## Common Patterns

### E-commerce

```typescript
tracker.track('product_view', {
  product_id: 'SKU-123',
  price: 29.99
});

tracker.track('purchase', {
  order_id: 'ORD-789',
  total: 59.98
});
```

### User Authentication

```typescript
tracker.identify({
  user_id: 'user_123',
  email: 'user@example.com'
});

tracker.track('login');
```

### Feature Tracking

```typescript
tracker.setProjectProperties({
  app_version: '2.0.0'
});

tracker.track('feature_used', {
  feature_name: 'export_data'
});
```
