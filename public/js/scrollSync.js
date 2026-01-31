/**
 * Scroll Synchronization
 * Keeps both panels scrolled to the same position
 */

const ScrollSync = {
  leftPanel: null,
  rightPanel: null,
  isScrolling: false,
  scrollTimeout: null,

  init() {
    this.leftPanel = document.getElementById('left-content');
    this.rightPanel = document.getElementById('right-content');

    this.leftPanel.addEventListener('scroll', () => this.handleScroll('left'));
    this.rightPanel.addEventListener('scroll', () => this.handleScroll('right'));
  },

  handleScroll(source) {
    // Prevent feedback loops
    if (this.isScrolling) return;

    this.isScrolling = true;

    const sourcePanel = source === 'left' ? this.leftPanel : this.rightPanel;
    const targetPanel = source === 'left' ? this.rightPanel : this.leftPanel;

    // Sync both vertical and horizontal scroll
    requestAnimationFrame(() => {
      // Sync vertical scroll
      const verticalPercentage = sourcePanel.scrollTop / (sourcePanel.scrollHeight - sourcePanel.clientHeight);
      const targetScrollTop = verticalPercentage * (targetPanel.scrollHeight - targetPanel.clientHeight);

      if (isFinite(targetScrollTop)) {
        targetPanel.scrollTop = targetScrollTop;
      }

      // Sync horizontal scroll (use absolute position for tables)
      targetPanel.scrollLeft = sourcePanel.scrollLeft;

      // Debounce to prevent feedback
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 50);
    });
  },

  reset() {
    if (this.leftPanel) {
      this.leftPanel.scrollTop = 0;
      this.leftPanel.scrollLeft = 0;
    }
    if (this.rightPanel) {
      this.rightPanel.scrollTop = 0;
      this.rightPanel.scrollLeft = 0;
    }
  },
};
