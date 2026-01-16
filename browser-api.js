// browser-api.js
// Cross-browser compatibility layer for Chrome and Firefox extensions
// Firefox uses the `browser` namespace (Promise-based)
// Chrome uses the `chrome` namespace (callback-based, but also supports Promises in MV3)

// Detect which browser we're running in
const isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
const isChrome = typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';

// Export unified API
// Firefox's `browser` API is Promise-based and standards-compliant
// Chrome's `chrome` API works similarly in MV3
const browserAPI = (() => {
  if (isFirefox) {
    return browser;
  }
  if (isChrome) {
    return chrome;
  }
  // Fallback for edge cases (shouldn't happen in extension context)
  console.warn('[Browser API] No browser API detected');
  return null;
})();

// Helper to check if extension context is valid
function isExtensionContextValid() {
  try {
    return browserAPI?.runtime?.id !== undefined;
  } catch (err) {
    return false;
  }
}

// Export for use in other scripts
// Using global assignment since this is a simple extension without a bundler
if (typeof window !== 'undefined') {
  window.browserAPI = browserAPI;
  window.isExtensionContextValid = isExtensionContextValid;
  window.isFirefoxBrowser = isFirefox;
  window.isChromeBrowser = isChrome;
}
