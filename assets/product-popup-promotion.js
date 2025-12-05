import { Component } from '@theme/component';

/**
 * Product Popup Promotion Component
 *
 * Displays a promotional popup for a featured product on page load.
 * When closed, minimizes to a small button in the bottom left corner.
 */
class ProductPopupPromotion extends Component {
  constructor() {
    super();

    this.enabled = this.dataset.enabled === 'true';
    this.showDelay = parseFloat(this.dataset.showDelay || '1') * 1000; // Convert to milliseconds
  }

  connectedCallback() {
    super.connectedCallback();

    if (!this.enabled) {
      return;
    }

    // Show popup on page load after delay
    this.schedulePopup();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Schedule popup to show after delay
   */
  schedulePopup() {
    setTimeout(() => {
      this.showPopup();
    }, this.showDelay);
  }

  /**
   * Show the popup (maximize)
   */
  showPopup() {
    this.classList.add('active');
    this.classList.remove('minimized');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // Dispatch custom event for analytics or other purposes
    this.dispatchEvent(new CustomEvent('popup:shown', {
      bubbles: true,
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Minimize the popup to bottom left button
   */
  minimizePopup() {
    this.classList.add('minimized');
    document.body.style.overflow = ''; // Restore scrolling

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('popup:minimized', {
      bubbles: true,
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Setup event listeners for minimize and maximize actions
   */
  setupEventListeners() {
    // Close button click - minimize instead of hide
    if (this.refs.closeButton) {
      this.refs.closeButton.addEventListener('click', () => {
        this.minimizePopup();
      });
    }

    // Minimized button click - show popup again
    if (this.refs.minimizedButton) {
      this.refs.minimizedButton.addEventListener('click', () => {
        this.showPopup();
      });
    }

    // Overlay click (click outside modal) - minimize
    if (this.refs.overlay) {
      this.refs.overlay.addEventListener('click', (e) => {
        // Only minimize if clicking the overlay itself, not the modal content
        if (e.target === this.refs.overlay) {
          this.minimizePopup();
        }
      });
    }

    // Escape key to minimize
    this.handleEscape = (e) => {
      if (e.key === 'Escape' && this.classList.contains('active') && !this.classList.contains('minimized')) {
        this.minimizePopup();
      }
    };
    document.addEventListener('keydown', this.handleEscape);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // Cleanup event listeners
    document.removeEventListener('keydown', this.handleEscape);

    // Restore scrolling if popup was active
    if (this.classList.contains('active') && !this.classList.contains('minimized')) {
      document.body.style.overflow = '';
    }
  }
}

customElements.define('product-popup-promotion', ProductPopupPromotion);
