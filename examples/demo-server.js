/**
 * Demo Analytics Server
 * 
 * A simple Node.js server that:
 * 1. Receives and logs analytics events from the tracker
 * 2. Hosts the demo HTML page with tracking
 * 3. Serves the compiled tracker JavaScript
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const HOST = 'localhost';

// ANSI color codes for pretty console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Store events in memory
const events = [];

// Helper function to format JSON with colors
function formatJSON(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let result = '';
  
  if (Array.isArray(obj)) {
    result += '[\n';
    obj.forEach((item, i) => {
      result += spaces + '  ' + formatJSON(item, indent + 1);
      if (i < obj.length - 1) result += ',';
      result += '\n';
    });
    result += spaces + ']';
  } else if (typeof obj === 'object' && obj !== null) {
    result += '{\n';
    const keys = Object.keys(obj);
    keys.forEach((key, i) => {
      result += spaces + '  ' + colors.cyan + '"' + key + '"' + colors.reset + ': ';
      result += formatJSON(obj[key], indent + 1);
      if (i < keys.length - 1) result += ',';
      result += '\n';
    });
    result += spaces + '}';
  } else if (typeof obj === 'string') {
    result += colors.green + '"' + obj + '"' + colors.reset;
  } else if (typeof obj === 'number') {
    result += colors.yellow + obj + colors.reset;
  } else if (typeof obj === 'boolean') {
    result += colors.magenta + obj + colors.reset;
  } else {
    result += colors.dim + obj + colors.reset;
  }
  
  return result;
}

// Helper function to print event
function printEvent(endpoint, data) {
  const timestamp = new Date().toISOString();
  const eventType = endpoint.includes('track') ? 'TRACK' : 
                   endpoint.includes('identify') ? 'IDENTIFY' : 
                   endpoint.includes('update') ? 'UPDATE' : 'UNKNOWN';
  
  console.log('\n' + colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.blue + `📊 ${eventType} EVENT` + colors.reset + colors.dim + ` [${timestamp}]` + colors.reset);
  console.log(colors.bright + '─'.repeat(80) + colors.reset);
  console.log(colors.white + 'Endpoint:' + colors.reset + ' ' + colors.cyan + endpoint + colors.reset);
  console.log(colors.white + 'Event Name:' + colors.reset + ' ' + colors.green + (data.event || 'N/A') + colors.reset);
  console.log(colors.white + 'Project:' + colors.reset + ' ' + colors.yellow + (data.project || 'N/A') + colors.reset);
  console.log(colors.white + 'Visitor ID:' + colors.reset + ' ' + colors.magenta + (data.cookie || 'N/A') + colors.reset);
  console.log(colors.bright + '─'.repeat(80) + colors.reset);
  console.log(colors.white + 'Data:' + colors.reset);
  console.log(formatJSON(data, 0));
  console.log(colors.bright + '═'.repeat(80) + colors.reset + '\n');
}

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Request handler
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Analytics API endpoints
  if (pathname === '/track/' || pathname === '/track') {
    handleAnalyticsEvent(req, res, '/track/');
  } else if (pathname === '/identify' || pathname === '/identify/') {
    handleAnalyticsEvent(req, res, '/identify');
  } else if (pathname === '/update' || pathname === '/update/') {
    handleAnalyticsEvent(req, res, '/update');
  }
  // Dashboard endpoint
  else if (pathname === '/dashboard' || pathname === '/dashboard/') {
    serveDashboard(req, res);
  }
  // API to get events
  else if (pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events, count: events.length }));
  }
  // Serve demo page
  else if (pathname === '/' || pathname === '/index.html') {
    serveDemoPage(req, res);
  }
  // Serve tracker JavaScript
  else if (pathname === '/tracker.js') {
    serveTrackerJS(req, res);
  }
  // Serve static files
  else {
    serveStaticFile(req, res, pathname);
  }
});

// Handle analytics events
function handleAnalyticsEvent(req, res, endpoint) {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Store event
        events.push({
          endpoint,
          timestamp: new Date().toISOString(),
          data
        });
        
        // Print event to console
        printEvent(endpoint, data);
        
        // Send success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Event received' }));
      } catch (error) {
        console.error(colors.red + 'Error parsing event:' + colors.reset, error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  } else if (req.method === 'GET') {
    // Handle GET requests with query parameters
    const parsedUrl = url.parse(req.url, true);
    const data = parsedUrl.query;
    
    // Store event
    events.push({
      endpoint,
      timestamp: new Date().toISOString(),
      data
    });
    
    // Print event to console
    printEvent(endpoint, data);
    
    // Send success response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Event received' }));
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
}

// Serve demo page
function serveDemoPage(req, res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Tracker Demo</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    h1 {
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .status {
      display: inline-block;
      padding: 4px 12px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    .card h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 18px;
    }
    
    .button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;
      width: 100%;
      margin-bottom: 10px;
    }
    
    .button:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .button.secondary {
      background: #10b981;
    }
    
    .button.secondary:hover {
      background: #059669;
    }
    
    .button.danger {
      background: #ef4444;
    }
    
    .button.danger:hover {
      background: #dc2626;
    }
    
    input, textarea {
      width: 100%;
      padding: 10px;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-size: 13px;
      color: #666;
    }
    
    .info strong {
      color: #333;
    }
    
    a {
      color: #667eea;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .download-link {
      display: inline-block;
      margin: 5px 10px 5px 0;
      padding: 8px 16px;
      background: #f3f4f6;
      border-radius: 6px;
      color: #667eea;
      font-size: 13px;
    }
    
    .download-link:hover {
      background: #e5e7eb;
    }
    
    .external-link {
      display: inline-block;
      margin: 5px 10px 5px 0;
      padding: 8px 16px;
      background: #fef3c7;
      border-radius: 6px;
      color: #d97706;
      font-size: 13px;
    }
    
    .external-link:hover {
      background: #fde68a;
    }
    
    .scroll-content {
      height: 200px;
      overflow-y: auto;
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
    }
    
    .scroll-content p {
      margin-bottom: 10px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Analytics Tracker Demo <span class="status">● LIVE</span></h1>
      <p class="subtitle">Interactive demo showing real-time event tracking</p>
    </div>
    
    <div class="grid">
      <!-- Manual Tracking -->
      <div class="card">
        <h2>🎯 Manual Event Tracking</h2>
        <div class="info">
          Track custom events with properties. Check the server console to see events in real-time!
        </div>
        <input type="text" id="eventName" placeholder="Event name (e.g., button_click)" value="button_click">
        <input type="text" id="eventProp" placeholder="Property (e.g., button_name)" value="button_name">
        <input type="text" id="eventValue" placeholder="Value (e.g., submit)" value="submit">
        <button class="button" onclick="trackCustomEvent()">Track Event</button>
      </div>
      
      <!-- User Identification -->
      <div class="card">
        <h2>👤 User Identification</h2>
        <div class="info">
          Identify users and associate properties with them.
        </div>
        <input type="email" id="userEmail" placeholder="Email" value="demo@example.com">
        <input type="text" id="userName" placeholder="Name" value="Demo User">
        <input type="text" id="userPlan" placeholder="Plan" value="premium">
        <button class="button secondary" onclick="identifyUser()">Identify User</button>
      </div>
      
      <!-- Session Properties -->
      <div class="card">
        <h2>🔄 Session Properties</h2>
        <div class="info">
          Set properties that persist for the current session.
        </div>
        <input type="text" id="sessionId" placeholder="Session ID" value="sess_demo_123">
        <input type="text" id="referrer" placeholder="Referrer" value="google.com">
        <button class="button" onclick="setSessionProps()">Set Session Properties</button>
        <button class="button danger" onclick="clearSessionProps()">Clear Session</button>
      </div>
      
      <!-- Auto Tracking -->
      <div class="card">
        <h2>🤖 Auto Tracking Demo</h2>
        <div class="info">
          Click tracking, download tracking, and outgoing link tracking are enabled!
        </div>
        <button class="button" onclick="alert('Button clicked! Check console.')">Click Me (Auto-tracked)</button>
        <a href="/files/sample.pdf" class="download-link" download>📄 Download PDF</a>
        <a href="/files/data.zip" class="download-link" download>📦 Download ZIP</a>
        <a href="https://github.com" class="external-link" target="_blank">🔗 External Link</a>
      </div>
      
      <!-- Scroll Tracking -->
      <div class="card">
        <h2>📜 Scroll Depth Tracking</h2>
        <div class="info">
          Scroll depth is automatically tracked. Scroll the content below!
        </div>
        <div class="scroll-content">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
          <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
          <p>Keep scrolling to increase scroll depth...</p>
          <p>Almost there...</p>
          <p>You've reached the bottom! 🎉</p>
        </div>
      </div>
      
      <!-- Dashboard Link -->
      <div class="card">
        <h2>📈 Event Dashboard</h2>
        <div class="info">
          View all tracked events in a dashboard.
        </div>
        <a href="/dashboard" target="_blank">
          <button class="button">Open Dashboard</button>
        </a>
        <div class="info" style="margin-top: 15px;">
          <strong>Server Console:</strong> All events are also printed to the server console with colored output.
        </div>
      </div>
    </div>
  </div>
  
  <script src="/tracker.js"></script>
  <script>
    // Initialize tracker
    const tracker = new Tracker({
      project: 'demo-project',
      endpoint: 'http://localhost:3000',
      click_tracking: true,
      download_tracking: true,
      outgoing_tracking: true,
      idle_timeout: 30000
    });
    
    // Track page view
    tracker.track('page_view', {
      page_name: 'Demo Page',
      page_type: 'demo'
    });
    
    // Custom event tracking
    function trackCustomEvent() {
      const eventName = document.getElementById('eventName').value;
      const propName = document.getElementById('eventProp').value;
      const propValue = document.getElementById('eventValue').value;
      
      const properties = {};
      if (propName && propValue) {
        properties[propName] = propValue;
      }
      
      tracker.track(eventName, properties);
      alert('Event tracked! Check the server console.');
    }
    
    // User identification
    function identifyUser() {
      const email = document.getElementById('userEmail').value;
      const name = document.getElementById('userName').value;
      const plan = document.getElementById('userPlan').value;
      
      tracker.identify({
        email: email,
        name: name,
        plan: plan
      });
      
      alert('User identified! Future events will include these properties.');
    }
    
    // Session properties
    function setSessionProps() {
      const sessionId = document.getElementById('sessionId').value;
      const referrer = document.getElementById('referrer').value;
      
      tracker.setSessionProperties({
        session_id: sessionId,
        referrer: referrer
      });
      
      alert('Session properties set!');
    }
    
    function clearSessionProps() {
      tracker.clearSessionProperties();
      alert('Session properties cleared!');
    }
    
    // Log tracker initialization
    console.log('%c📊 Analytics Tracker Initialized', 'color: #667eea; font-size: 16px; font-weight: bold;');
    console.log('%cAll events are being sent to http://localhost:3000', 'color: #666;');
  </script>
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

// Serve dashboard
function serveDashboard(req, res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f3f4f6;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    h1 {
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    
    .stat-label {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .events {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .event {
      border-left: 4px solid #667eea;
      padding: 15px;
      margin-bottom: 15px;
      background: #f9fafb;
      border-radius: 4px;
    }
    
    .event-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    
    .event-type {
      font-weight: bold;
      color: #667eea;
    }
    
    .event-time {
      color: #999;
      font-size: 12px;
    }
    
    .event-data {
      background: white;
      padding: 10px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
    }
    
    .button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
    }
    
    .button:hover {
      background: #5568d3;
    }
    
    .empty {
      text-align: center;
      padding: 40px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Analytics Dashboard</h1>
      <p>Real-time event monitoring</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value" id="totalEvents">0</div>
        <div class="stat-label">Total Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="trackEvents">0</div>
        <div class="stat-label">Track Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="identifyEvents">0</div>
        <div class="stat-label">Identify Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="updateEvents">0</div>
        <div class="stat-label">Update Events</div>
      </div>
    </div>
    
    <div class="events">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>Recent Events</h2>
        <div>
          <button class="button" onclick="refreshEvents()">🔄 Refresh</button>
          <button class="button" onclick="clearEvents()">🗑️ Clear</button>
        </div>
      </div>
      <div id="eventsList"></div>
    </div>
  </div>
  
  <script>
    function refreshEvents() {
      fetch('/api/events')
        .then(res => res.json())
        .then(data => {
          const events = data.events || [];
          
          // Update stats
          document.getElementById('totalEvents').textContent = events.length;
          document.getElementById('trackEvents').textContent = 
            events.filter(e => e.endpoint.includes('track')).length;
          document.getElementById('identifyEvents').textContent = 
            events.filter(e => e.endpoint.includes('identify')).length;
          document.getElementById('updateEvents').textContent = 
            events.filter(e => e.endpoint.includes('update')).length;
          
          // Display events
          const eventsList = document.getElementById('eventsList');
          if (events.length === 0) {
            eventsList.innerHTML = '<div class="empty">No events yet. Start tracking!</div>';
          } else {
            eventsList.innerHTML = events.reverse().map(event => {
              const eventType = event.endpoint.includes('track') ? 'TRACK' : 
                               event.endpoint.includes('identify') ? 'IDENTIFY' : 'UPDATE';
              return \`
                <div class="event">
                  <div class="event-header">
                    <span class="event-type">\${eventType}: \${event.data.event || 'N/A'}</span>
                    <span class="event-time">\${new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <div class="event-data">\${JSON.stringify(event.data, null, 2)}</div>
                </div>
              \`;
            }).join('');
          }
        });
    }
    
    function clearEvents() {
      if (confirm('Clear all events?')) {
        fetch('/api/events', { method: 'DELETE' })
          .then(() => refreshEvents());
      }
    }
    
    // Auto-refresh every 2 seconds
    setInterval(refreshEvents, 2000);
    
    // Initial load
    refreshEvents();
  </script>
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

// Serve tracker JavaScript
function serveTrackerJS(req, res) {
  const trackerPath = path.join(__dirname, '..', 'dist', 'tracker-browser.js');
  
  fs.readFile(trackerPath, (err, data) => {
    if (err) {
      console.error(colors.red + 'Error reading tracker.js:' + colors.reset, err);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Tracker not found. Please run: npm run build');
    } else {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    }
  });
}

// Serve static files
function serveStaticFile(req, res, pathname) {
  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// Start server
server.listen(PORT, HOST, () => {
  console.log('\n' + colors.bright + colors.green + '✓ Analytics Demo Server Started!' + colors.reset);
  console.log(colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.white + 'Server running at:' + colors.reset + ' ' + colors.cyan + `http://${HOST}:${PORT}` + colors.reset);
  console.log(colors.white + 'Demo page:' + colors.reset + '        ' + colors.cyan + `http://${HOST}:${PORT}/` + colors.reset);
  console.log(colors.white + 'Dashboard:' + colors.reset + '        ' + colors.cyan + `http://${HOST}:${PORT}/dashboard` + colors.reset);
  console.log(colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.yellow + '\n📊 Waiting for events...\n' + colors.reset);
});
