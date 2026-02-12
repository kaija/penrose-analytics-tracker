/**
 * Analytics Tracker - Main Export
 * 
 * A JavaScript analytics tracking system similar to Woopra
 * Provides event tracking, user identification, and automatic tracking features
 */

// Export main Tracker class
export { Tracker } from './Tracker';

// Export type definitions for public API
export type {
  TrackerConfig,
  CookieConfig,
  TrackingEvent,
  PageState,
  PageLifecycleState
} from './types';

// Default export
export { Tracker as default } from './Tracker';
