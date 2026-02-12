/**
 * PageStateManager - Tracks page lifecycle state, scroll depth, and user activity
 * 
 * Requirements:
 * - 10.1, 10.2: Track page state changes (active, passive, hidden, frozen, terminated)
 * - 10.3: Calculate active state duration
 * - 10.4: Include page duration in events
 * - 11.1, 11.2: Track scroll depth
 * - 11.4: Calculate scroll depth percentage
 * - 14.1, 14.2, 14.3: Detect idle state and calculate active duration excluding idle time
 */

import { PageState, PageLifecycleState } from './types';

export class PageStateManager {
  private state: PageState;
  private idleTimeout: number;
  private idleTimer: number | null = null;
  private pageStartTime: number;

  constructor(idleTimeout: number = 30000) {
    this.idleTimeout = idleTimeout;
    this.pageStartTime = Date.now();
    
    // Initialize state
    this.state = {
      state: 'active',
      stateStartTime: this.pageStartTime,
      activeDuration: 0,
      scrollDepth: 0,
      maxScrollDepth: 0,
      isIdle: false,
      idleStartTime: null
    };

    // Set up event listeners
    this.setupEventListeners();
    
    // Start idle timer
    this.startIdleTimer();
  }

  /**
   * Get current page state
   */
  getState(): PageState {
    return { ...this.state };
  }

  /**
   * Get total page duration in milliseconds
   * Requirements: 10.4
   */
  getDuration(): number {
    return Date.now() - this.pageStartTime;
  }

  /**
   * Get active duration excluding idle time
   * Requirements: 14.3
   */
  getActiveDuration(): number {
    let duration = this.state.activeDuration;
    
    // If currently in active state and not idle, add current active period
    if (this.state.state === 'active' && !this.state.isIdle) {
      duration += Date.now() - this.state.stateStartTime;
    }
    
    return duration;
  }

  /**
   * Set up event listeners for page lifecycle and user activity
   */
  private setupEventListeners(): void {
    // Visibility change events
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // Page lifecycle events (freeze, resume, etc.)
    if (typeof document !== 'undefined') {
      document.addEventListener('freeze', this.handlePageLifecycle.bind(this));
      document.addEventListener('resume', this.handlePageLifecycle.bind(this));
      document.addEventListener('pageshow', this.handlePageLifecycle.bind(this));
      document.addEventListener('pagehide', this.handlePageLifecycle.bind(this));
    }

    // Scroll tracking
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }

    // User activity tracking for idle detection
    if (typeof document !== 'undefined') {
      const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      activityEvents.forEach(event => {
        document.addEventListener(event, this.handleUserActivity.bind(this), { passive: true });
      });
    }
  }

  /**
   * Handle visibility change events
   * Requirements: 10.1, 10.2, 10.3
   */
  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') return;

    const now = Date.now();
    const previousState = this.state.state;

    // Update active duration if transitioning from active state
    if (previousState === 'active' && !this.state.isIdle) {
      this.state.activeDuration += now - this.state.stateStartTime;
    }

    // Determine new state based on visibility
    let newState: PageLifecycleState;
    if (document.visibilityState === 'visible') {
      newState = 'active';
    } else if (document.visibilityState === 'hidden') {
      newState = 'hidden';
    } else {
      newState = 'passive';
    }

    // Update state
    this.state.state = newState;
    this.state.stateStartTime = now;

    // Reset idle timer when becoming active
    if (newState === 'active') {
      this.resetIdleTimer();
    }
  }

  /**
   * Handle page lifecycle events (freeze, resume, etc.)
   * Requirements: 10.1, 10.2, 10.3
   */
  private handlePageLifecycle(event: Event): void {
    const now = Date.now();
    const previousState = this.state.state;

    // Update active duration if transitioning from active state
    if (previousState === 'active' && !this.state.isIdle) {
      this.state.activeDuration += now - this.state.stateStartTime;
    }

    // Determine new state based on event type
    let newState: PageLifecycleState = this.state.state;
    
    switch (event.type) {
      case 'freeze':
        newState = 'frozen';
        break;
      case 'resume':
        newState = 'active';
        break;
      case 'pageshow':
        newState = 'active';
        break;
      case 'pagehide':
        newState = 'terminated';
        break;
    }

    // Update state
    this.state.state = newState;
    this.state.stateStartTime = now;

    // Reset idle timer when becoming active
    if (newState === 'active') {
      this.resetIdleTimer();
    }
  }

  /**
   * Handle scroll events to track scroll depth
   * Requirements: 11.1, 11.2
   */
  private handleScroll(): void {
    const depth = this.calculateScrollDepth();
    this.state.scrollDepth = depth;
    
    // Update max scroll depth
    if (depth > this.state.maxScrollDepth) {
      this.state.maxScrollDepth = depth;
    }
  }

  /**
   * Calculate current scroll depth percentage
   * Requirements: 11.4
   * Formula: (scrollPosition + windowHeight) / pageHeight * 100
   */
  private calculateScrollDepth(): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return 0;
    }

    const windowHeight = window.innerHeight;
    const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const pageHeight = document.documentElement.scrollHeight;

    // Avoid division by zero
    if (pageHeight === 0) {
      return 0;
    }

    const depth = ((scrollPosition + windowHeight) / pageHeight) * 100;
    
    // Cap at 100%
    return Math.min(Math.round(depth), 100);
  }

  /**
   * Handle user activity to reset idle timer
   * Requirements: 14.1, 14.2
   */
  private handleUserActivity(): void {
    // If user was idle, mark as no longer idle
    if (this.state.isIdle) {
      this.state.isIdle = false;
      this.state.idleStartTime = null;
    }

    // Reset the idle timer
    this.resetIdleTimer();
  }

  /**
   * Start the idle detection timer
   * Requirements: 14.1
   */
  private startIdleTimer(): void {
    if (typeof window === 'undefined') return;

    this.idleTimer = window.setTimeout(() => {
      // Mark user as idle
      this.state.isIdle = true;
      this.state.idleStartTime = Date.now();

      // Update active duration up to the point of going idle
      if (this.state.state === 'active') {
        this.state.activeDuration += this.state.idleStartTime - this.state.stateStartTime;
        this.state.stateStartTime = this.state.idleStartTime;
      }
    }, this.idleTimeout);
  }

  /**
   * Reset the idle detection timer
   * Requirements: 14.1, 14.2
   */
  private resetIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.startIdleTimer();
  }

  /**
   * Clean up event listeners and timers
   */
  destroy(): void {
    // Clear idle timer
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Remove event listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      document.removeEventListener('freeze', this.handlePageLifecycle.bind(this));
      document.removeEventListener('resume', this.handlePageLifecycle.bind(this));
      document.removeEventListener('pageshow', this.handlePageLifecycle.bind(this));
      document.removeEventListener('pagehide', this.handlePageLifecycle.bind(this));

      const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      activityEvents.forEach(event => {
        document.removeEventListener(event, this.handleUserActivity.bind(this));
      });
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    }
  }
}
