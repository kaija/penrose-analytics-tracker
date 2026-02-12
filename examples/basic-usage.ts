/**
 * Basic Usage Examples for Analytics Tracker
 * 
 * This file demonstrates common usage patterns for the analytics tracker
 */

import { Tracker, TrackerConfig } from '../src/index';

// ============================================================================
// Example 1: Basic Initialization
// ============================================================================

const basicConfig: TrackerConfig = {
  project: 'my-project',
  endpoint: 'https://analytics.example.com'
};

const tracker = new Tracker(basicConfig);

// ============================================================================
// Example 2: Full Configuration with All Options
// ============================================================================

const fullConfig: TrackerConfig = {
  project: 'my-project',
  endpoint: 'https://analytics.example.com',
  
  // Enable automatic tracking
  click_tracking: true,
  download_tracking: true,
  outgoing_tracking: true,
  
  // Configure idle detection (30 seconds)
  idle_timeout: 30000,
  
  // Cookie configuration for cross-domain tracking
  cookie: {
    name: 'myTracker',
    domain: '.example.com',
    expire: 730,  // 2 years
    path: '/',
    secure: true  // HTTPS only
  }
};

const advancedTracker = new Tracker(fullConfig);

// ============================================================================
// Example 3: Manual Event Tracking
// ============================================================================

// Simple event without properties
tracker.track('page_view');

// Event with properties
tracker.track('button_click', {
  button_name: 'signup',
  button_location: 'header',
  page_section: 'hero'
});

// Complex event with multiple properties
tracker.track('purchase', {
  order_id: 'ORD-12345',
  total_amount: 99.99,
  currency: 'USD',
  items_count: 3,
  payment_method: 'credit_card'
});

// ============================================================================
// Example 4: User Identification
// ============================================================================

// Identify user with basic properties
tracker.identify({
  email: 'user@example.com',
  name: 'John Doe'
});

// Identify user with comprehensive properties
tracker.identify({
  user_id: 'user_12345',
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium',
  signup_date: '2024-01-15',
  company: 'Acme Corp',
  role: 'admin'
});

// ============================================================================
// Example 5: Session Properties
// ============================================================================

// Set session properties (persist for current session only)
tracker.setSessionProperties({
  session_id: 'sess_abc123',
  landing_page: '/home',
  referrer: 'google.com',
  utm_source: 'newsletter',
  utm_campaign: 'spring_sale'
});

// Clear session properties (e.g., on logout)
tracker.clearSessionProperties();

// ============================================================================
// Example 6: Project Properties
// ============================================================================

// Set project properties (persist across sessions)
tracker.setProjectProperties({
  app_version: '2.1.0',
  environment: 'production',
  platform: 'web',
  build_number: '1234'
});

// ============================================================================
// Example 7: Dynamic Configuration Updates
// ============================================================================

// Update configuration at runtime
tracker.config({
  click_tracking: false,  // Disable click tracking
  idle_timeout: 60000     // Change idle timeout to 60 seconds
});

// Update endpoint
tracker.config({
  endpoint: 'https://new-analytics.example.com'
});

// ============================================================================
// Example 8: Cleanup
// ============================================================================

// Clean up when done (removes event listeners, clears timers)
tracker.destroy();

// ============================================================================
// Example 9: E-commerce Tracking
// ============================================================================

function ecommerceExample() {
  const ecommerceTracker = new Tracker({
    project: 'my-store',
    endpoint: 'https://analytics.mystore.com',
    download_tracking: true
  });

  // Track product view
  ecommerceTracker.track('product_view', {
    product_id: 'SKU-123',
    product_name: 'Wireless Headphones',
    category: 'Electronics',
    price: 79.99,
    currency: 'USD'
  });

  // Track add to cart
  ecommerceTracker.track('add_to_cart', {
    product_id: 'SKU-123',
    quantity: 1,
    price: 79.99
  });

  // Track checkout started
  ecommerceTracker.track('checkout_started', {
    cart_total: 79.99,
    items_count: 1
  });

  // Identify customer
  ecommerceTracker.identify({
    customer_id: 'CUST-456',
    email: 'customer@example.com',
    first_purchase: false
  });

  // Track purchase
  ecommerceTracker.track('purchase', {
    order_id: 'ORD-789',
    total: 79.99,
    tax: 6.40,
    shipping: 5.00,
    items_count: 1,
    payment_method: 'credit_card'
  });
}

// ============================================================================
// Example 10: SaaS Application Tracking
// ============================================================================

function saasExample() {
  const saasTracker = new Tracker({
    project: 'my-saas-app',
    endpoint: 'https://analytics.mysaas.com',
    click_tracking: true,
    idle_timeout: 60000
  });

  // Set app-wide properties
  saasTracker.setProjectProperties({
    app_version: '2.1.0',
    environment: 'production'
  });

  // User signs up
  saasTracker.identify({
    user_id: 'user_123',
    email: 'user@example.com',
    plan: 'starter',
    signup_date: new Date().toISOString(),
    trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Track feature usage
  saasTracker.track('feature_used', {
    feature_name: 'export_data',
    export_format: 'csv',
    records_count: 1500
  });

  // Track plan upgrade
  saasTracker.track('plan_upgraded', {
    from_plan: 'starter',
    to_plan: 'professional',
    billing_cycle: 'monthly'
  });

  // Track collaboration
  saasTracker.track('team_member_invited', {
    invitee_email: 'teammate@example.com',
    role: 'editor'
  });
}

// ============================================================================
// Example 11: Content Website Tracking
// ============================================================================

function contentExample() {
  const contentTracker = new Tracker({
    project: 'my-blog',
    endpoint: 'https://analytics.myblog.com',
    outgoing_tracking: true  // Track external link clicks
  });

  // Track article view
  contentTracker.track('article_view', {
    article_id: 'post-123',
    article_title: 'How to Use Analytics',
    category: 'tutorials',
    author: 'John Doe',
    word_count: 1500,
    reading_time: 7  // minutes
  });

  // Track video play
  contentTracker.track('video_play', {
    video_id: 'vid-456',
    video_title: 'Product Demo',
    duration: 180  // seconds
  });

  // Track social share
  contentTracker.track('social_share', {
    platform: 'twitter',
    article_id: 'post-123',
    share_type: 'button'  // vs 'copy_link'
  });

  // Track newsletter signup
  contentTracker.track('newsletter_signup', {
    source: 'article_footer',
    article_id: 'post-123'
  });

  contentTracker.identify({
    email: 'subscriber@example.com',
    subscription_date: new Date().toISOString()
  });
}

// ============================================================================
// Example 12: Error Tracking
// ============================================================================

function errorTrackingExample() {
  const errorTracker = new Tracker({
    project: 'my-app',
    endpoint: 'https://analytics.example.com'
  });

  // Track JavaScript errors
  window.addEventListener('error', (event) => {
    errorTracker.track('javascript_error', {
      error_message: event.message,
      error_file: event.filename,
      error_line: event.lineno,
      error_column: event.colno,
      error_stack: event.error?.stack
    });
  });

  // Track API errors
  function trackAPIError(endpoint: string, statusCode: number, errorMessage: string) {
    errorTracker.track('api_error', {
      api_endpoint: endpoint,
      status_code: statusCode,
      error_message: errorMessage
    });
  }

  // Example usage
  fetch('https://api.example.com/data')
    .catch(error => {
      trackAPIError('/data', 500, error.message);
    });
}

// ============================================================================
// Example 13: Form Tracking
// ============================================================================

function formTrackingExample() {
  const formTracker = new Tracker({
    project: 'my-app',
    endpoint: 'https://analytics.example.com'
  });

  // Track form start
  document.querySelector('#signup-form')?.addEventListener('focus', () => {
    formTracker.track('form_started', {
      form_name: 'signup',
      form_location: 'homepage'
    });
  }, { once: true });

  // Track form submission
  document.querySelector('#signup-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    
    formTracker.track('form_submitted', {
      form_name: 'signup',
      form_location: 'homepage',
      fields_filled: 5,
      time_to_complete: 45  // seconds
    });
  });

  // Track form abandonment
  let formStarted = false;
  document.querySelector('#signup-form')?.addEventListener('focus', () => {
    formStarted = true;
  }, { once: true });

  window.addEventListener('beforeunload', () => {
    if (formStarted) {
      formTracker.track('form_abandoned', {
        form_name: 'signup',
        form_location: 'homepage'
      });
    }
  });
}

// ============================================================================
// Example 14: A/B Testing Integration
// ============================================================================

function abTestingExample() {
  const abTracker = new Tracker({
    project: 'my-app',
    endpoint: 'https://analytics.example.com'
  });

  // Assign user to test variant
  const variant = Math.random() < 0.5 ? 'A' : 'B';
  
  // Set as session property
  abTracker.setSessionProperties({
    ab_test_homepage_hero: variant
  });

  // Track variant exposure
  abTracker.track('ab_test_exposure', {
    test_name: 'homepage_hero',
    variant: variant
  });

  // Track conversion
  document.querySelector('#cta-button')?.addEventListener('click', () => {
    abTracker.track('ab_test_conversion', {
      test_name: 'homepage_hero',
      variant: variant,
      conversion_type: 'cta_click'
    });
  });
}

// ============================================================================
// Example 15: Single Page Application (SPA) Tracking
// ============================================================================

function spaTrackingExample() {
  const spaTracker = new Tracker({
    project: 'my-spa',
    endpoint: 'https://analytics.example.com',
    click_tracking: true
  });

  // Track route changes (example with React Router)
  function trackPageView(path: string, title: string) {
    spaTracker.track('page_view', {
      path: path,
      title: title,
      previous_path: window.location.pathname
    });
  }

  // Example: Track when route changes
  // In React: useEffect(() => { trackPageView(location.pathname, document.title); }, [location]);
  // In Vue: router.afterEach((to) => { trackPageView(to.path, to.meta.title); });
}

export {
  basicConfig,
  fullConfig,
  ecommerceExample,
  saasExample,
  contentExample,
  errorTrackingExample,
  formTrackingExample,
  abTestingExample,
  spaTrackingExample
};
