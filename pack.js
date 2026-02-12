/**
 * Pack CDN-ready minified bundle
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function buildCDN() {
  console.log('Packing CDN bundle...');
  
  // Read all the compiled modules
  const distPath = path.join(__dirname, 'dist');
  const types = fs.readFileSync(path.join(distPath, 'types.js'), 'utf8');
  const cookieManager = fs.readFileSync(path.join(distPath, 'CookieManager.js'), 'utf8');
  const apiClient = fs.readFileSync(path.join(distPath, 'APIClient.js'), 'utf8');
  const eventQueue = fs.readFileSync(path.join(distPath, 'EventQueue.js'), 'utf8');
  const pageStateManager = fs.readFileSync(path.join(distPath, 'PageStateManager.js'), 'utf8');
  const autoTracker = fs.readFileSync(path.join(distPath, 'AutoTracker.js'), 'utf8');
  const tracker = fs.readFileSync(path.join(distPath, 'Tracker.js'), 'utf8');

  // Create browser bundle
  const bundle = `/**
 * Analytics Tracker - CDN Bundle
 * Version: 1.0.0
 * License: MIT
 */
(function(window) {
  'use strict';
  
  // Module system shim
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
  window.AnalyticsTracker = modules['./Tracker'].Tracker;
  
})(window);
`;

  // Minify the bundle
  console.log('Minifying...');
  const minified = await minify(bundle, {
    compress: {
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      keep_classnames: true,
      keep_fnames: false,
      passes: 2
    },
    mangle: {
      keep_classnames: true
    },
    format: {
      comments: /^!/,
      preamble: '/*! Analytics Tracker v1.0.0 | MIT License | https://github.com/yourusername/analytics-tracker */'
    }
  });

  if (minified.error) {
    console.error('Minification error:', minified.error);
    process.exit(1);
  }

  // Write minified bundle
  fs.writeFileSync(path.join(distPath, 'analytics-tracker.min.js'), minified.code);
  
  // Write unminified version for debugging
  fs.writeFileSync(path.join(distPath, 'analytics-tracker.js'), bundle);

  // Get file sizes
  const minSize = (minified.code.length / 1024).toFixed(2);
  const origSize = (bundle.length / 1024).toFixed(2);
  const savings = (((bundle.length - minified.code.length) / bundle.length) * 100).toFixed(1);

  console.log('✓ CDN bundle created:');
  console.log(`  - dist/analytics-tracker.js (${origSize} KB)`);
  console.log(`  - dist/analytics-tracker.min.js (${minSize} KB)`);
  console.log(`  - Size reduction: ${savings}%`);
}

buildCDN().catch(err => {
  console.error('Pack failed:', err);
  process.exit(1);
});
