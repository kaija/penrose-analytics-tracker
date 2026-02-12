/**
 * Node.js / CommonJS Usage Example
 * 
 * This example shows how to use the analytics tracker in a Node.js environment
 * Note: Some features like automatic tracking may not work in Node.js as they
 * depend on browser APIs (DOM, window, etc.)
 */

// CommonJS import
const { Tracker } = require('../dist/index');

// ============================================================================
// Example 1: Basic Server-Side Tracking
// ============================================================================

function basicServerTracking() {
  const tracker = new Tracker({
    project: 'my-server-app',
    endpoint: 'https://analytics.example.com'
  });

  // Track server-side events
  tracker.track('server_started', {
    node_version: process.version,
    platform: process.platform,
    memory_usage: process.memoryUsage().heapUsed
  });

  tracker.track('api_request', {
    endpoint: '/api/users',
    method: 'GET',
    response_time: 45
  });
}

// ============================================================================
// Example 2: API Server Integration (Express.js)
// ============================================================================

function expressIntegration() {
  // Assuming Express.js is installed
  // const express = require('express');
  // const app = express();

  const tracker = new Tracker({
    project: 'my-api',
    endpoint: 'https://analytics.example.com'
  });

  // Middleware to track all requests
  function trackingMiddleware(req, res, next) {
    const startTime = Date.now();

    // Track request
    tracker.track('api_request_started', {
      method: req.method,
      path: req.path,
      user_agent: req.get('user-agent'),
      ip: req.ip
    });

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      tracker.track('api_request_completed', {
        method: req.method,
        path: req.path,
        status_code: res.statusCode,
        duration: duration
      });
    });

    next();
  }

  // app.use(trackingMiddleware);

  console.log('Express tracking middleware configured');
}

// ============================================================================
// Example 3: Background Job Tracking
// ============================================================================

function backgroundJobTracking() {
  const tracker = new Tracker({
    project: 'background-jobs',
    endpoint: 'https://analytics.example.com'
  });

  async function processJob(jobId, jobType) {
    const startTime = Date.now();

    tracker.track('job_started', {
      job_id: jobId,
      job_type: jobType
    });

    try {
      // Simulate job processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;
      
      tracker.track('job_completed', {
        job_id: jobId,
        job_type: jobType,
        duration: duration,
        status: 'success'
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      tracker.track('job_failed', {
        job_id: jobId,
        job_type: jobType,
        duration: duration,
        error_message: error.message
      });
    }
  }

  // Example usage
  processJob('job_123', 'email_send');
}

// ============================================================================
// Example 4: Database Operation Tracking
// ============================================================================

function databaseTracking() {
  const tracker = new Tracker({
    project: 'database-ops',
    endpoint: 'https://analytics.example.com'
  });

  async function trackDatabaseQuery(operation, table, duration, rowCount) {
    tracker.track('database_query', {
      operation: operation,
      table: table,
      duration: duration,
      row_count: rowCount
    });
  }

  // Example: Track a database query
  async function getUserById(userId) {
    const startTime = Date.now();
    
    try {
      // Simulate database query
      // const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      
      const duration = Date.now() - startTime;
      trackDatabaseQuery('SELECT', 'users', duration, 1);
      
      // return user;
    } catch (error) {
      tracker.track('database_error', {
        operation: 'SELECT',
        table: 'users',
        error_message: error.message
      });
      throw error;
    }
  }

  console.log('Database tracking configured');
}

// ============================================================================
// Example 5: User Authentication Tracking
// ============================================================================

function authenticationTracking() {
  const tracker = new Tracker({
    project: 'auth-service',
    endpoint: 'https://analytics.example.com'
  });

  function trackLogin(userId, email, success, method = 'password') {
    if (success) {
      tracker.identify({
        user_id: userId,
        email: email
      });

      tracker.track('login_success', {
        method: method,
        timestamp: new Date().toISOString()
      });
    } else {
      tracker.track('login_failed', {
        email: email,
        method: method,
        timestamp: new Date().toISOString()
      });
    }
  }

  function trackLogout(userId) {
    tracker.track('logout', {
      user_id: userId,
      timestamp: new Date().toISOString()
    });
  }

  function trackSignup(userId, email, plan) {
    tracker.identify({
      user_id: userId,
      email: email,
      plan: plan,
      signup_date: new Date().toISOString()
    });

    tracker.track('signup_completed', {
      plan: plan,
      timestamp: new Date().toISOString()
    });
  }

  // Example usage
  trackLogin('user_123', 'user@example.com', true, 'password');
  trackSignup('user_456', 'newuser@example.com', 'starter');
}

// ============================================================================
// Example 6: Error and Exception Tracking
// ============================================================================

function errorTracking() {
  const tracker = new Tracker({
    project: 'error-tracking',
    endpoint: 'https://analytics.example.com'
  });

  // Global error handler
  process.on('uncaughtException', (error) => {
    tracker.track('uncaught_exception', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name
    });

    // Don't exit immediately, give time for tracking
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Unhandled promise rejection
  process.on('unhandledRejection', (reason, promise) => {
    tracker.track('unhandled_rejection', {
      reason: String(reason),
      promise: String(promise)
    });
  });

  console.log('Error tracking configured');
}

// ============================================================================
// Example 7: Performance Monitoring
// ============================================================================

function performanceMonitoring() {
  const tracker = new Tracker({
    project: 'performance',
    endpoint: 'https://analytics.example.com'
  });

  // Track memory usage periodically
  setInterval(() => {
    const memUsage = process.memoryUsage();
    
    tracker.track('memory_usage', {
      heap_used: memUsage.heapUsed,
      heap_total: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });
  }, 60000); // Every minute

  // Track CPU usage
  function trackCPUUsage() {
    const usage = process.cpuUsage();
    
    tracker.track('cpu_usage', {
      user: usage.user,
      system: usage.system
    });
  }

  console.log('Performance monitoring configured');
}

// ============================================================================
// Example 8: Batch Event Tracking
// ============================================================================

function batchTracking() {
  const tracker = new Tracker({
    project: 'batch-processing',
    endpoint: 'https://analytics.example.com'
  });

  async function processBatch(items) {
    const startTime = Date.now();
    
    tracker.track('batch_started', {
      item_count: items.length,
      batch_id: 'batch_' + Date.now()
    });

    let successCount = 0;
    let failureCount = 0;

    for (const item of items) {
      try {
        // Process item
        await processItem(item);
        successCount++;
      } catch (error) {
        failureCount++;
      }
    }

    const duration = Date.now() - startTime;

    tracker.track('batch_completed', {
      item_count: items.length,
      success_count: successCount,
      failure_count: failureCount,
      duration: duration,
      items_per_second: items.length / (duration / 1000)
    });
  }

  async function processItem(item) {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Batch tracking configured');
}

// ============================================================================
// Example 9: Webhook Event Tracking
// ============================================================================

function webhookTracking() {
  const tracker = new Tracker({
    project: 'webhooks',
    endpoint: 'https://analytics.example.com'
  });

  function handleWebhook(webhookType, payload) {
    tracker.track('webhook_received', {
      webhook_type: webhookType,
      payload_size: JSON.stringify(payload).length,
      timestamp: new Date().toISOString()
    });

    // Process webhook
    try {
      processWebhook(webhookType, payload);
      
      tracker.track('webhook_processed', {
        webhook_type: webhookType,
        status: 'success'
      });
    } catch (error) {
      tracker.track('webhook_failed', {
        webhook_type: webhookType,
        error_message: error.message
      });
    }
  }

  function processWebhook(type, payload) {
    // Webhook processing logic
    console.log(`Processing webhook: ${type}`);
  }

  console.log('Webhook tracking configured');
}

// ============================================================================
// Example 10: Scheduled Task Tracking
// ============================================================================

function scheduledTaskTracking() {
  const tracker = new Tracker({
    project: 'scheduled-tasks',
    endpoint: 'https://analytics.example.com'
  });

  function runScheduledTask(taskName, taskFunction) {
    const startTime = Date.now();
    
    tracker.track('scheduled_task_started', {
      task_name: taskName,
      scheduled_time: new Date().toISOString()
    });

    taskFunction()
      .then(() => {
        const duration = Date.now() - startTime;
        
        tracker.track('scheduled_task_completed', {
          task_name: taskName,
          duration: duration,
          status: 'success'
        });
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        
        tracker.track('scheduled_task_failed', {
          task_name: taskName,
          duration: duration,
          error_message: error.message
        });
      });
  }

  // Example: Run a daily cleanup task
  async function dailyCleanup() {
    // Cleanup logic
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Schedule task (using cron or similar)
  // runScheduledTask('daily_cleanup', dailyCleanup);

  console.log('Scheduled task tracking configured');
}

// ============================================================================
// Run Examples
// ============================================================================

console.log('='.repeat(60));
console.log('Analytics Tracker - Node.js Examples');
console.log('='.repeat(60));

// Uncomment to run specific examples:
// basicServerTracking();
// expressIntegration();
// backgroundJobTracking();
// databaseTracking();
// authenticationTracking();
// errorTracking();
// performanceMonitoring();
// batchTracking();
// webhookTracking();
// scheduledTaskTracking();

console.log('\nExamples loaded. Uncomment function calls to run specific examples.');
