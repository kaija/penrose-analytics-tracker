/**
 * Auto Tracker
 * Automatically tracks user interactions including clicks, downloads, and outgoing links
 * 
 * Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 */

import { AutoTrackerConfig } from './types';

// File extensions that indicate download links
const DOWNLOAD_EXTENSIONS = [
  '.pdf', '.zip', '.rar', '.tar', '.gz', '.7z',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.json', '.xml',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv',
  '.jpg', '.jpeg', '.png', '.gif', '.svg',
  '.exe', '.dmg', '.pkg', '.deb', '.rpm'
];

export class AutoTracker {
  private config: AutoTrackerConfig;
  private trackCallback: (event: string, properties: Record<string, any>) => void;
  private clickHandler: ((event: MouseEvent) => void) | null = null;

  constructor(
    trackCallback: (event: string, properties: Record<string, any>) => void,
    config: AutoTrackerConfig
  ) {
    this.trackCallback = trackCallback;
    this.config = config;
  }

  /**
   * Initialize auto tracking based on configuration
   * Requirements: 5.1, 6.1, 7.1
   */
  init(): void {
    // Set up click tracking if any tracking feature is enabled
    if (this.config.click_tracking || this.config.download_tracking || this.config.outgoing_tracking) {
      this.setupClickTracking();
    }
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }
  }

  /**
   * Setup click tracking
   * Requirements: 5.1, 5.2
   * 
   * @private
   */
  private setupClickTracking(): void {
    this.clickHandler = (event: MouseEvent) => {
      this.handleClick(event);
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('click', this.clickHandler, true);
  }

  /**
   * Setup download tracking
   * Requirements: 6.1
   * 
   * Note: Download tracking is handled within handleClick method
   * @private
   */
  private setupDownloadTracking(): void {
    // Download tracking is integrated into click tracking
    // This method exists for clarity and future extensibility
  }

  /**
   * Setup outgoing link tracking
   * Requirements: 7.1
   * 
   * Note: Outgoing tracking is handled within handleClick method
   * @private
   */
  private setupOutgoingTracking(): void {
    // Outgoing tracking is integrated into click tracking
    // This method exists for clarity and future extensibility
  }

  /**
   * Handle click events and track relevant interactions
   * Requirements: 5.2, 5.3, 6.2, 6.3, 7.2, 7.3
   * 
   * @param event - Mouse click event
   * @private
   */
  private handleClick(event: MouseEvent): void {
    try {
      // Find the closest anchor element
      let element = event.target as HTMLElement | null;
      let anchor: HTMLAnchorElement | null = null;

      // Traverse up to find an anchor tag
      while (element && element !== document.body) {
        if (element.tagName === 'A') {
          anchor = element as HTMLAnchorElement;
          break;
        }
        element = element.parentElement;
      }

      // Handle link clicks
      if (anchor && anchor.href) {
        // Check for download links (highest priority)
        if (this.config.download_tracking && this.isDownloadLink(anchor)) {
          const downloadInfo = this.extractLinkInfo(anchor);
          this.trackCallback('download', {
            ...downloadInfo,
            file_type: this.getFileExtension(anchor.href)
          });
          return;
        }

        // Check for outgoing links (second priority)
        if (this.config.outgoing_tracking && this.isOutgoingLink(anchor)) {
          const outgoingInfo = this.extractLinkInfo(anchor);
          this.trackCallback('outgoing', outgoingInfo);
          return;
        }

        // Track as general click if enabled (lowest priority)
        if (this.config.click_tracking) {
          const linkInfo = this.extractLinkInfo(anchor);
          this.trackCallback('click', linkInfo);
          return;
        }
      } else {
        // Not a link click, track as general click if click_tracking is enabled
        if (this.config.click_tracking) {
          const clickInfo = this.extractElementInfo(event.target as HTMLElement);
          this.trackCallback('click', clickInfo);
        }
      }
    } catch (error) {
      console.warn('Error handling click event:', error);
    }
  }

  /**
   * Check if a link is a download link
   * Requirements: 6.2
   * 
   * @param element - Anchor element to check
   * @returns True if the link points to a downloadable file
   */
  private isDownloadLink(element: HTMLAnchorElement): boolean {
    try {
      // Check if element has download attribute
      if (element.hasAttribute('download')) {
        return true;
      }

      const href = element.href.toLowerCase();
      
      // Check file extension
      return DOWNLOAD_EXTENSIONS.some(ext => {
        // Check if URL ends with the extension (with or without query params)
        const urlWithoutQuery = href.split('?')[0].split('#')[0];
        return urlWithoutQuery.endsWith(ext);
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a link is an outgoing link (different domain)
   * Requirements: 7.2
   * 
   * @param element - Anchor element to check
   * @returns True if the link points to a different domain
   */
  private isOutgoingLink(element: HTMLAnchorElement): boolean {
    try {
      const linkHostname = element.hostname;
      const currentHostname = window.location.hostname;

      // Empty hostname means relative link
      if (!linkHostname) {
        return false;
      }

      // Compare hostnames
      return linkHostname !== currentHostname;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract information from a link element
   * Requirements: 5.3, 6.3, 7.3
   * 
   * @param element - Anchor element
   * @returns Object containing link information
   */
  private extractLinkInfo(element: HTMLAnchorElement): Record<string, any> {
    return {
      url: element.href,
      text: element.textContent?.trim() || '',
      target: element.target || '_self',
      id: element.id || undefined,
      class: element.className || undefined
    };
  }

  /**
   * Extract information from a general element
   * Requirements: 5.3
   * 
   * @param element - HTML element
   * @returns Object containing element information
   */
  private extractElementInfo(element: HTMLElement): Record<string, any> {
    return {
      tag: element.tagName.toLowerCase(),
      text: element.textContent?.trim().substring(0, 100) || '',
      id: element.id || undefined,
      class: element.className || undefined
    };
  }

  /**
   * Get file extension from URL
   * Requirements: 6.3
   * 
   * @param url - URL string
   * @returns File extension (e.g., 'pdf', 'zip')
   */
  private getFileExtension(url: string): string {
    try {
      const urlWithoutQuery = url.split('?')[0].split('#')[0];
      const parts = urlWithoutQuery.split('.');
      
      if (parts.length > 1) {
        return parts[parts.length - 1].toLowerCase();
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
}
