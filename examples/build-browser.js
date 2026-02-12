/**
 * Build browser-compatible bundle
 * Combines all modules into a single file that works in browsers
 */

const fs = require('fs');
const path = require('path');

// Read all the compiled modules from parent directory
const distPath = path.join(__dirname, '..', 'dist');
const types = fs.readFileSync(path.join(distPath, 'types.js'), 'utf8');
const cookieManager = fs.readFileSync(path.join(distPath, 'CookieManager.js'), 'utf8');
const apiClient = fs.readFileSync(path.join(distPath, 'APIClient.js'), 'utf8');
const eventQueue = fs.readFileSync(path.join(distPath, 'EventQueue.js'), 'utf8');
const pageStateManager = fs.readFileSync(path.join(distPath, 'PageStateManager.js'), 'utf8');
const autoTracker = fs.readFileSync(path.join(distPath, 'AutoTracker.js'), 'utf8');
const tracker = fs.readFileSync(path.join(distPath, 'Tracker.js'), 'utf8');

// Create browser bundle
const bundle = `/**
 * Analytics Tracker - Browser Bundle
 * Version: 1.0.0
 */

(function(window) {
  'use strict';
  
  // Module system shim
  const exports = {};
  const module = { exports: exports };
  
  // Internal modules registry
  const modules = {};
  
  function require(name) {
    if (modules[name]) {
      return modules[name];
    }
    throw new Error('Module not found: ' + name);
  }
  
  // Types module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${types}
    modules['./types'] = module.exports;
  })();
  
  // CookieManager module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${cookieManager}
    modules['./CookieManager'] = module.exports;
  })();
  
  // APIClient module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${apiClient}
    modules['./APIClient'] = module.exports;
  })();
  
  // EventQueue module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${eventQueue}
    modules['./EventQueue'] = module.exports;
  })();
  
  // PageStateManager module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${pageStateManager}
    modules['./PageStateManager'] = module.exports;
  })();
  
  // AutoTracker module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${autoTracker}
    modules['./AutoTracker'] = module.exports;
  })();
  
  // Tracker module
  (function() {
    const exports = {};
    const module = { exports: exports };
    ${tracker}
    modules['./Tracker'] = module.exports;
  })();
  
  // Export to window
  window.Tracker = modules['./Tracker'].Tracker;
  
  // Also export types for TypeScript users
  if (modules['./types']) {
    Object.assign(window.Tracker, modules['./types']);
  }
  
  console.log('%c📊 Analytics Tracker Loaded', 'color: #667eea; font-size: 14px; font-weight: bold;');
  
})(window);
`;

// Write the bundle to parent dist directory
fs.writeFileSync(path.join(distPath, 'tracker-browser.js'), bundle);

console.log('✓ Browser bundle created: dist/tracker-browser.js');
