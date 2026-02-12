/**
 * Unit tests for PageStateManager
 */

import { PageStateManager } from '../src/PageStateManager';

describe('PageStateManager', () => {
  let manager: PageStateManager;

  beforeEach(() => {
    // Reset timers
    jest.useFakeTimers();
    manager = new PageStateManager(30000);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize with active state', () => {
      const state = manager.getState();
      expect(state.state).toBe('active');
      expect(state.activeDuration).toBe(0);
      expect(state.scrollDepth).toBe(0);
      expect(state.maxScrollDepth).toBe(0);
      expect(state.isIdle).toBe(false);
      expect(state.idleStartTime).toBeNull();
    });

    test('should use custom idle timeout', () => {
      const customManager = new PageStateManager(60000);
      expect(customManager).toBeDefined();
      customManager.destroy();
    });
  });

  describe('getDuration', () => {
    test('should return total page duration', () => {
      const startTime = Date.now();
      jest.advanceTimersByTime(5000);
      
      const duration = manager.getDuration();
      expect(duration).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('getActiveDuration', () => {
    test('should return active duration when in active state', () => {
      jest.advanceTimersByTime(5000);
      
      const activeDuration = manager.getActiveDuration();
      expect(activeDuration).toBeGreaterThanOrEqual(5000);
    });

    test('should exclude idle time from active duration', () => {
      // Advance time but don't trigger any activity
      jest.advanceTimersByTime(35000); // Past idle timeout
      
      const state = manager.getState();
      expect(state.isIdle).toBe(true);
      
      // Active duration should be around 30000ms (idle timeout)
      const activeDuration = manager.getActiveDuration();
      expect(activeDuration).toBeLessThan(35000);
    });
  });

  describe('Idle Detection', () => {
    test('should mark user as idle after timeout', () => {
      // Initially not idle
      expect(manager.getState().isIdle).toBe(false);
      
      // Advance past idle timeout
      jest.advanceTimersByTime(31000);
      
      // Should now be idle
      const state = manager.getState();
      expect(state.isIdle).toBe(true);
      expect(state.idleStartTime).not.toBeNull();
    });

    test('should reset idle state on user activity', () => {
      // Become idle
      jest.advanceTimersByTime(31000);
      expect(manager.getState().isIdle).toBe(true);
      
      // Simulate user activity
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);
      
      // Should no longer be idle
      const state = manager.getState();
      expect(state.isIdle).toBe(false);
      expect(state.idleStartTime).toBeNull();
    });
  });

  describe('Scroll Depth Tracking', () => {
    test('should calculate scroll depth correctly', () => {
      // Mock window and document properties
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      });
      
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 200
      });
      
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        writable: true,
        configurable: true,
        value: 2000
      });
      
      // Trigger scroll event
      const scrollEvent = new Event('scroll');
      window.dispatchEvent(scrollEvent);
      
      const state = manager.getState();
      // (200 + 800) / 2000 * 100 = 50%
      expect(state.scrollDepth).toBe(50);
    });

    test('should track maximum scroll depth', () => {
      // Mock properties
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      });
      
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        writable: true,
        configurable: true,
        value: 2000
      });
      
      // Scroll to 50%
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 200
      });
      window.dispatchEvent(new Event('scroll'));
      
      expect(manager.getState().scrollDepth).toBe(50);
      expect(manager.getState().maxScrollDepth).toBe(50);
      
      // Scroll to 75%
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 700
      });
      window.dispatchEvent(new Event('scroll'));
      
      expect(manager.getState().scrollDepth).toBe(75);
      expect(manager.getState().maxScrollDepth).toBe(75);
      
      // Scroll back to 50%
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 200
      });
      window.dispatchEvent(new Event('scroll'));
      
      expect(manager.getState().scrollDepth).toBe(50);
      expect(manager.getState().maxScrollDepth).toBe(75); // Max should remain 75
    });

    test('should handle zero page height', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      });
      
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 0
      });
      
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        writable: true,
        configurable: true,
        value: 0
      });
      
      window.dispatchEvent(new Event('scroll'));
      
      expect(manager.getState().scrollDepth).toBe(0);
    });

    test('should cap scroll depth at 100%', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      });
      
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 1200
      });
      
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        writable: true,
        configurable: true,
        value: 2000
      });
      
      window.dispatchEvent(new Event('scroll'));
      
      expect(manager.getState().scrollDepth).toBe(100);
    });
  });

  describe('Visibility Change', () => {
    test('should update state on visibility change to hidden', () => {
      // Mock document.visibilityState
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      });
      
      // Trigger visibility change
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
      
      const state = manager.getState();
      expect(state.state).toBe('hidden');
    });

    test('should update state on visibility change to visible', () => {
      // First set to hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Then back to visible
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
      
      const state = manager.getState();
      expect(state.state).toBe('active');
    });

    test('should calculate active duration when transitioning from active', () => {
      // Stay active for 5 seconds
      jest.advanceTimersByTime(5000);
      
      // Change to hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));
      
      const state = manager.getState();
      expect(state.activeDuration).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Page Lifecycle Events', () => {
    test('should handle freeze event', () => {
      const event = new Event('freeze');
      document.dispatchEvent(event);
      
      const state = manager.getState();
      expect(state.state).toBe('frozen');
    });

    test('should handle resume event', () => {
      // First freeze
      document.dispatchEvent(new Event('freeze'));
      
      // Then resume
      document.dispatchEvent(new Event('resume'));
      
      const state = manager.getState();
      expect(state.state).toBe('active');
    });

    test('should handle pagehide event', () => {
      const event = new Event('pagehide');
      document.dispatchEvent(event);
      
      const state = manager.getState();
      expect(state.state).toBe('terminated');
    });

    test('should handle pageshow event', () => {
      const event = new Event('pageshow');
      document.dispatchEvent(event);
      
      const state = manager.getState();
      expect(state.state).toBe('active');
    });
  });

  describe('destroy', () => {
    test('should clean up timers and event listeners', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      manager.destroy();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
