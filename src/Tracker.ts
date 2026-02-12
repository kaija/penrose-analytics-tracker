/**
 * Tracker - Core analytics tracking class
 * Main interface for the analytics tracking system
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { TrackerConfig } from './types';
import { CookieManager } from './CookieManager';
import { EventQueue } from './EventQueue';
import { APIClient } from './APIClient';
import { PageStateManager } from './PageStateManager';
import { AutoTracker } from './AutoTracker';

export class Tracker {
  private trackerConfig: TrackerConfig;
  private cookieManager: CookieManager;
  private eventQueue: EventQueue;
  private autoTracker: AutoTracker;
  private apiClient: APIClient;
  private pageStateManager: PageStateManager;
  private visitorData: Record<string, any> = {};
  private sessionData: Record<string, any> = {};
  private projectData: Record<string, any> = {};
  private unloadHandler: (() => void) | null = null;
  private sessionStartTime: number;
  private lastEventId: string | null = null;

  constructor(config: TrackerConfig) {
    // Validate required configuration
    if (!config.project) {
      throw new Error('Tracker configuration error: "project" is required');
    }
    if (!config.endpoint) {
      throw new Error('Tracker configuration error: "endpoint" is required');
    }

    // Store configuration with defaults
    this.trackerConfig = {
      ...config,
      click_tracking: config.click_tracking ?? false,
      download_tracking: config.download_tracking ?? false,
      outgoing_tracking: config.outgoing_tracking ?? false,
      idle_timeout: config.idle_timeout ?? 30000,
      cookie: {
        name: config.cookie?.name ?? 'wooTracker',
        domain: config.cookie?.domain,
        expire: config.cookie?.expire ?? 730,
        path: config.cookie?.path ?? '/',
        secure: config.cookie?.secure ?? false
      }
    };

    // Initialize Cookie Manager
    // Requirements: 13.3
    this.cookieManager = new CookieManager(
      this.trackerConfig.cookie!.name!,
      this.trackerConfig.cookie
    );

    // Initialize API Client
    // Requirements: 13.2, 13.5
    this.apiClient = new APIClient({
      baseURL: this.trackerConfig.endpoint,
      project: this.trackerConfig.project
    });

    // Initialize Event Queue
    this.eventQueue = new EventQueue(this.apiClient);

    // Initialize Page State Manager
    // Requirements: 13.1
    this.pageStateManager = new PageStateManager(this.trackerConfig.idle_timeout);

    // Initialize session
    this.sessionStartTime = Date.now();
    this.detectSessionStart();

    // Initialize Auto Tracker
    // Requirements: 13.4
    this.autoTracker = new AutoTracker(
      (event: string, properties: Record<string, any>) => {
        this.track(event, properties);
      },
      {
        click_tracking: this.trackerConfig.click_tracking!,
        download_tracking: this.trackerConfig.download_tracking!,
        outgoing_tracking: this.trackerConfig.outgoing_tracking!
      }
    );

    // Initialize tracking
    this.init();
  }

  /**
   * Initialize the tracker
   * Sets up lifecycle tracking, scroll tracking, idle detection, and page unload handling
   * Requirements: 13.1
   * 
   * @private
   */
  private init(): void {
    // Set up lifecycle tracking
    this.setupLifecycleTracking();

    // Set up scroll tracking
    this.setupScrollTracking();

    // Set up idle detection
    this.setupIdleDetection();

    // Set up page unload handling
    this.handlePageUnload();

    // Initialize auto tracker
    this.autoTracker.init();
  }

  /**
   * Set up page lifecycle tracking
   * Monitors page visibility and lifecycle state changes
   * Requirements: 13.1
   * 
   * @private
   */
  private setupLifecycleTracking(): void {
    // Page lifecycle tracking is handled by PageStateManager
    // This method exists for clarity and future extensibility
    
    // The PageStateManager automatically tracks:
    // - visibilitychange events
    // - freeze/resume events
    // - pageshow/pagehide events
  }

  /**
   * Set up scroll depth tracking
   * Monitors user scroll behavior
   * Requirements: 13.1
   * 
   * @private
   */
  private setupScrollTracking(): void {
    // Scroll tracking is handled by PageStateManager
    // This method exists for clarity and future extensibility
    
    // The PageStateManager automatically tracks:
    // - scroll events
    // - current scroll depth
    // - maximum scroll depth reached
  }

  /**
   * Set up idle detection
   * Monitors user activity to detect idle state
   * Requirements: 13.1, 14.4
   * 
   * @private
   */
  private setupIdleDetection(): void {
    // Idle detection is handled by PageStateManager
    // This method exists for clarity and future extensibility
    
    // The PageStateManager automatically:
    // - Starts idle timer on initialization
    // - Resets timer on user activity
    // - Marks user as idle after timeout
    // - Tracks idle start/end times
    
    // Set up periodic check for idle state changes
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.checkIdleState();
      }, 5000); // Check every 5 seconds
    }
  }

  /**
   * Check idle state and send update if user became idle
   * Requirements: 14.4
   * 
   * @private
   */
  private checkIdleState(): void {
    const pageState = this.pageStateManager.getState();
    
    // If user just became idle and we have a last event, send update
    if (pageState.isIdle && this.lastEventId) {
      const updateEvent = this.buildTrackingEvent('idle_update', {
        active_duration: this.pageStateManager.getActiveDuration(),
        idle_start: pageState.idleStartTime
      });
      
      updateEvent.id = this.lastEventId;
      this.eventQueue.enqueue('/update', updateEvent);
    }
  }

  /**
   * Handle page unload
   * Ensures all pending events are sent before page closes
   * Requirements: 13.1, 15.1, 15.3
   * 
   * @private
   */
  private handlePageUnload(): void {
    // Create unload handler
    this.unloadHandler = () => {
      try {
        // Send final event with complete state before flushing queue
        // Requirements: 15.3
        this.sendFinalEvent();
        
        // Flush all pending events using Beacon API
        // Requirements: 15.1
        this.eventQueue.flush();
        
        // Detect session end and clear session properties
        // Requirements: 8.4
        this.detectSessionEnd();
      } catch (error) {
        // Silently catch errors during unload to prevent blocking
        console.warn('Analytics Tracker: Error during page unload:', error);
      }
    };

    // Register unload handlers
    if (typeof window !== 'undefined') {
      // Use both events for maximum compatibility
      window.addEventListener('beforeunload', this.unloadHandler);
      window.addEventListener('pagehide', this.unloadHandler);
    }
  }

  /**
   * Track an event
   * Requirements: 1.1, 1.2, 1.3, 1.5, 2.3, 2.4, 16.4, 16.5
   * 
   * @param event - Event name
   * @param properties - Event properties (will be prefixed with e_)
   */
  track(event: string, properties?: Record<string, any>): void {
    // Build tracking event with all required fields
    const trackingEvent = this.buildTrackingEvent(event, properties);
    
    // Store the event ID for potential updates
    this.lastEventId = trackingEvent.id || this.generateEventId();
    trackingEvent.id = this.lastEventId;
    
    // Enqueue the event for sending
    // Requirements: 1.3
    this.eventQueue.enqueue('/track/', trackingEvent);
  }

  /**
   * Detect session start
   * Requirements: 8.4, 15.1
   * 
   * @private
   */
  private detectSessionStart(): void {
    // Session starts when tracker is initialized
    // This could be enhanced to check for session cookies or timeouts
    this.sessionStartTime = Date.now();
  }

  /**
   * Detect session end and clear session properties
   * Requirements: 8.4
   * 
   * @private
   */
  private detectSessionEnd(): void {
    // Clear session properties but keep project properties
    // Requirements: 8.4
    this.clearSessionProperties();
  }

  /**
   * Send final event with complete state before page unload
   * Requirements: 15.3, 11.3
   * 
   * @private
   */
  private sendFinalEvent(): void {
    const pageState = this.pageStateManager.getState();
    
    // Build final event with complete state
    const finalEvent = this.buildTrackingEvent('page_unload', {
      final_duration: this.pageStateManager.getActiveDuration(),
      final_scroll_depth: pageState.maxScrollDepth,
      session_duration: Date.now() - this.sessionStartTime
    });
    
    // If we have a last event ID, send as update instead
    if (this.lastEventId) {
      finalEvent.id = this.lastEventId;
      // Send as update to existing event
      this.eventQueue.enqueue('/update', finalEvent);
    } else {
      // Send as new event
      this.eventQueue.enqueue('/track/', finalEvent);
    }
  }

  /**
   * Generate a unique event ID
   * 
   * @private
   * @returns Unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Identify a visitor by setting visitor properties
   * Requirements: 3.1, 3.2, 3.3, 3.4
   * 
   * @param properties - Visitor properties (will be prefixed with u_)
   */
  identify(properties: Record<string, any>): void {
    // Store visitor properties for inclusion in future events
    // Requirements: 3.1, 3.2
    this.visitorData = {
      ...this.visitorData,
      ...properties
    };

    // Build identify event with visitor properties
    const identifyEvent = this.buildIdentifyEvent(properties);
    
    // Send to identify endpoint
    // Requirements: 3.4
    this.eventQueue.enqueue('/identify', identifyEvent);
  }

  /**
   * Update tracker configuration
   * Requirements: 13.1
   * 
   * @param options - Configuration options to update
   */
  config(options: Partial<TrackerConfig>): void {
    // Update configuration
    this.trackerConfig = {
      ...this.trackerConfig,
      ...options
    };

    // Update API client if endpoint changed
    if (options.endpoint) {
      this.apiClient = new APIClient({
        baseURL: options.endpoint,
        project: this.trackerConfig.project
      });
      this.eventQueue = new EventQueue(this.apiClient);
    }

    // Update auto tracker if tracking options changed
    if (
      options.click_tracking !== undefined ||
      options.download_tracking !== undefined ||
      options.outgoing_tracking !== undefined
    ) {
      this.autoTracker.destroy();
      this.autoTracker = new AutoTracker(
        (event: string, properties: Record<string, any>) => {
          this.track(event, properties);
        },
        {
          click_tracking: this.trackerConfig.click_tracking ?? false,
          download_tracking: this.trackerConfig.download_tracking ?? false,
          outgoing_tracking: this.trackerConfig.outgoing_tracking ?? false
        }
      );
      this.autoTracker.init();
    }

    // Update page state manager if idle timeout changed
    if (options.idle_timeout !== undefined) {
      this.pageStateManager.destroy();
      this.pageStateManager = new PageStateManager(options.idle_timeout);
    }
  }

  /**
   * Build a tracking event with all standard fields and property prefixes
   * Requirements: 1.5, 2.3, 2.4, 16.1, 16.2, 16.3, 16.4, 16.5
   * 
   * @param event - Event name
   * @param properties - Event-specific properties
   * @returns Complete tracking event object
   * @private
   */
  private buildTrackingEvent(
    event: string,
    properties?: Record<string, any>
  ): Record<string, any> {
    const now = Date.now();
    const pageState = this.pageStateManager.getState();

    // Start with standard fields (no prefix)
    // Requirements: 1.5, 16.5
    const trackingEvent: Record<string, any> = {
      // Standard fields - no prefix
      project: this.trackerConfig.project,
      event: event,
      cookie: this.cookieManager.getVisitorId(),
      timestamp: now,
      url: this.getPageURL(),
      title: this.getPageTitle(),
      domain: this.getPageDomain(),
      uri: this.getPageURI(),
      duration: this.pageStateManager.getActiveDuration(),
      scroll_depth: pageState.maxScrollDepth
    };

    // Add visitor properties with u_ prefix
    // Requirements: 16.1
    for (const [key, value] of Object.entries(this.visitorData)) {
      trackingEvent[`u_${key}`] = value;
    }

    // Add session properties with s_ prefix
    // Requirements: 16.2
    for (const [key, value] of Object.entries(this.sessionData)) {
      trackingEvent[`s_${key}`] = value;
    }

    // Add project properties with p_ prefix
    // Requirements: 16.3
    for (const [key, value] of Object.entries(this.projectData)) {
      trackingEvent[`p_${key}`] = value;
    }

    // Add event properties with e_ prefix
    // Requirements: 16.4
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        trackingEvent[`e_${key}`] = value;
      }
    }

    return trackingEvent;
  }

  /**
   * Build an identify event with visitor properties
   * Requirements: 3.3, 3.4
   * 
   * @param properties - Visitor properties
   * @returns Identify event object
   * @private
   */
  private buildIdentifyEvent(properties: Record<string, any>): Record<string, any> {
    const now = Date.now();

    // Start with standard fields
    const identifyEvent: Record<string, any> = {
      project: this.trackerConfig.project,
      cookie: this.cookieManager.getVisitorId(),
      timestamp: now
    };

    // Add visitor properties with u_ prefix
    // Requirements: 3.3
    for (const [key, value] of Object.entries(properties)) {
      identifyEvent[`u_${key}`] = value;
    }

    return identifyEvent;
  }

  /**
   * Get current page URL
   * Requirements: 1.5
   * @private
   */
  private getPageURL(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.href;
    }
    return '';
  }

  /**
   * Get current page title
   * Requirements: 1.5
   * @private
   */
  private getPageTitle(): string {
    if (typeof document !== 'undefined') {
      return document.title || '';
    }
    return '';
  }

  /**
   * Get current page domain
   * Requirements: 1.5
   * @private
   */
  private getPageDomain(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.hostname;
    }
    return '';
  }

  /**
   * Get current page URI (path + search)
   * Requirements: 1.5
   * @private
   */
  private getPageURI(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.pathname + window.location.search;
    }
    return '';
  }

  /**
   * Clean up resources and event listeners
   */
  destroy(): void {
    // Clean up auto tracker
    this.autoTracker.destroy();

    // Clean up page state manager
    this.pageStateManager.destroy();

    // Remove unload handler
    if (this.unloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.unloadHandler);
      window.removeEventListener('pagehide', this.unloadHandler);
      this.unloadHandler = null;
    }
  }

  /**
   * Set session properties
   * These properties will be included in all subsequent events with s_ prefix
   * Requirements: 8.1, 16.2
   * 
   * @param properties - Session properties
   */
  setSessionProperties(properties: Record<string, any>): void {
    this.sessionData = {
      ...this.sessionData,
      ...properties
    };
  }

  /**
   * Set project properties
   * These properties will be included in all subsequent events with p_ prefix
   * Requirements: 8.2, 16.3
   * 
   * @param properties - Project properties
   */
  setProjectProperties(properties: Record<string, any>): void {
    this.projectData = {
      ...this.projectData,
      ...properties
    };
  }

  /**
   * Clear session properties
   * Requirements: 8.4
   */
  clearSessionProperties(): void {
    this.sessionData = {};
  }
}
