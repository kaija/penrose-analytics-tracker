/**
 * Core type definitions for the analytics tracker system
 */

/**
 * Configuration for the tracker
 */
export interface TrackerConfig {
  /** Project identifier */
  project: string;
  /** API base endpoint URL */
  endpoint: string;
  /** Application identifier (default: 'js-client') */
  app?: string;
  /** Enable automatic click tracking */
  click_tracking?: boolean;
  /** Enable automatic download tracking */
  download_tracking?: boolean;
  /** Enable automatic outgoing link tracking */
  outgoing_tracking?: boolean;
  /** Cookie configuration */
  cookie?: CookieConfig;
  /** Idle timeout in milliseconds (default: 30000) */
  idle_timeout?: number;
}

/**
 * Cookie configuration options
 */
export interface CookieConfig {
  /** Cookie domain (for cross-domain tracking) */
  domain?: string;
  /** Cookie expiration in days (default: 730) */
  expire?: number;
  /** Cookie name (default: 'wooTracker') */
  name?: string;
  /** Cookie path (default: '/') */
  path?: string;
  /** Use secure flag for HTTPS only (default: false) */
  secure?: boolean;
}

/**
 * Tracking event data structure
 */
export interface TrackingEvent {
  // Standard fields
  project: string;
  event: string;
  cookie: string;
  timestamp: number;
  
  // Page information
  url: string;
  title: string;
  domain: string;
  uri: string;
  
  // Optional fields
  duration?: number;
  scroll_depth?: number;
  
  // Dynamic properties with prefixes
  [key: string]: any;
}

/**
 * Page lifecycle state
 */
export type PageLifecycleState = 'active' | 'passive' | 'hidden' | 'frozen' | 'terminated';

/**
 * Page state tracking information
 */
export interface PageState {
  /** Current page lifecycle state */
  state: PageLifecycleState;
  /** Timestamp when current state started */
  stateStartTime: number;
  /** Total active duration in milliseconds */
  activeDuration: number;
  /** Current scroll depth percentage */
  scrollDepth: number;
  /** Maximum scroll depth reached */
  maxScrollDepth: number;
  /** Whether user is currently idle */
  isIdle: boolean;
  /** Timestamp when idle state started (null if not idle) */
  idleStartTime: number | null;
}

/**
 * Queued event for processing
 */
export interface QueuedEvent {
  /** Unique event ID */
  id: string;
  /** API endpoint path */
  endpoint: string;
  /** Event data payload */
  data: Record<string, any>;
  /** Event creation timestamp */
  timestamp: number;
  /** Number of retry attempts */
  retries: number;
}

/**
 * Auto tracker configuration
 */
export interface AutoTrackerConfig {
  /** Enable click tracking */
  click_tracking: boolean;
  /** Enable download tracking */
  download_tracking: boolean;
  /** Enable outgoing link tracking */
  outgoing_tracking: boolean;
}

/**
 * Cookie options for setting cookies
 */
export interface CookieOptions {
  /** Cookie domain */
  domain?: string;
  /** Expiration in days */
  expire?: number;
  /** Cookie path */
  path?: string;
  /** Secure flag */
  secure?: boolean;
}

/**
 * API client configuration
 */
export interface APIClientConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** Project identifier */
  project: string;
}
