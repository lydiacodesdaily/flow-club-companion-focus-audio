// flowmate.content.js
// Runs on: https://flowmate.club/*
//
// Purpose:
// 1) Read Flow Club timer sync state from chrome.storage.local
// 2) Push it into the Flowmate page context via window.postMessage
// 3) Re-push whenever storage changes
//
// Debugging:
// Open DevTools on flowmate.club and filter console by "[Flowmate Sync]".

(() => {
  const TAG = "[Flowmate Sync]";

  // Keep this list in sync with what flowclub.content.js writes.
  const KEYS = [
    "flowclubTimerSeconds",
    "flowclubTimerUpdatedAt",
    "flowclubSessionDurationMinutes",
    "flowclubSessionTitle",
    "flowclubCurrentSessionIndex",
    "flowclubCurrentSessionType",
    "flowclubCompletedCount",
    "flowclubPhaseLabel",
    "flowclubSessionStyle",
    "flowclubCurrentBlock",
  ];

  // Optional: throttle resends to avoid spamming if keys update frequently
  const MIN_RESEND_INTERVAL_MS = 250; // tweak if you want
  let lastSendAt = 0;

  console.log(TAG, "content script loaded on", location.href);
  console.log(TAG, "watching keys:", KEYS);

  function pushIntoPage(payload) {
    try {
      console.log(TAG, "posting message → FLOWCLUB_TIMER_SYNC", payload);
      window.postMessage({ type: "FLOWCLUB_TIMER_SYNC", payload }, "*");
    } catch (err) {
      console.error(TAG, "failed to postMessage", err);
    }
  }

  function sendLatest(reason = "manual") {
    const now = Date.now();
    if (now - lastSendAt < MIN_RESEND_INTERVAL_MS) return;
    lastSendAt = now;

    chrome.storage.local.get(KEYS, (data) => {
      if (chrome.runtime?.lastError) {
        console.error(TAG, "chrome.storage.local.get error:", chrome.runtime.lastError);
        return;
      }

      console.log(TAG, `storage snapshot (${reason})`, data);

      // Guard: if Flow Club hasn't written anything yet, don't spam the page
      if (typeof data.flowclubTimerSeconds !== "number") {
        console.log(
          TAG,
          "flowclubTimerSeconds missing/not a number — Flow Club may not be open yet."
        );
        return;
      }

      pushIntoPage(data);
    });
  }

  // Initial push
  sendLatest("initial");

  // Re-send on any relevant storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    const changedKeys = Object.keys(changes || {});
    const relevant = changedKeys.some((k) => KEYS.includes(k));

    if (!relevant) return;

    console.log(TAG, "storage changed →", changedKeys);
    sendLatest("storage-change");
  });

  // Handy: allow you to trigger a manual push from console
  // window.__FLOWMATE_FORCE_SYNC__() on flowmate.club
  window.__FLOWMATE_FORCE_SYNC__ = () => sendLatest("forced");
  console.log(TAG, "manual helper ready: window.__FLOWMATE_FORCE_SYNC__()");
})();