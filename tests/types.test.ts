/**
 * Type definition tests
 */

import {
  TrackerConfig,
  CookieConfig,
  TrackingEvent,
  PageState,
  QueuedEvent,
  AutoTrackerConfig,
  APIClientConfig
} from '../src/types';

describe('Type Definitions', () => {
  it('should define TrackerConfig interface', () => {
    const config: TrackerConfig = {
      project: 'test-project',
      endpoint: 'https://api.example.com'
    };
    
    expect(config.project).toBe('test-project');
    expect(config.endpoint).toBe('https://api.example.com');
  });

  it('should define CookieConfig interface', () => {
    const cookieConfig: CookieConfig = {
      domain: '.example.com',
      expire: 730,
      name: 'wooTracker',
      path: '/',
      secure: true
    };
    
    expect(cookieConfig.domain).toBe('.example.com');
    expect(cookieConfig.expire).toBe(730);
  });

  it('should define TrackingEvent interface', () => {
    const event: TrackingEvent = {
      project: 'test-project',
      event: 'pageview',
      cookie: 'visitor-123',
      timestamp: Date.now(),
      url: 'https://example.com',
      title: 'Test Page',
      domain: 'example.com',
      uri: '/'
    };
    
    expect(event.event).toBe('pageview');
    expect(event.cookie).toBe('visitor-123');
  });

  it('should define PageState interface', () => {
    const pageState: PageState = {
      state: 'active',
      stateStartTime: Date.now(),
      activeDuration: 0,
      scrollDepth: 0,
      maxScrollDepth: 0,
      isIdle: false,
      idleStartTime: null
    };
    
    expect(pageState.state).toBe('active');
    expect(pageState.isIdle).toBe(false);
  });

  it('should define QueuedEvent interface', () => {
    const queuedEvent: QueuedEvent = {
      id: 'event-123',
      endpoint: '/track/',
      data: { event: 'test' },
      timestamp: Date.now(),
      retries: 0
    };
    
    expect(queuedEvent.id).toBe('event-123');
    expect(queuedEvent.retries).toBe(0);
  });

  it('should define AutoTrackerConfig interface', () => {
    const autoConfig: AutoTrackerConfig = {
      click_tracking: true,
      download_tracking: true,
      outgoing_tracking: true
    };
    
    expect(autoConfig.click_tracking).toBe(true);
  });

  it('should define APIClientConfig interface', () => {
    const apiConfig: APIClientConfig = {
      baseURL: 'https://api.example.com',
      project: 'test-project'
    };
    
    expect(apiConfig.baseURL).toBe('https://api.example.com');
  });
});
