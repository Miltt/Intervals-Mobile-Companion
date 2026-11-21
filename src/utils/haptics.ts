export type HapticStyle = 'light' | 'medium' | 'heavy';

interface AndroidHapticsBridge {
  trigger?: (style: string) => void;
}

declare global {
  interface Window {
    AndroidHaptics?: AndroidHapticsBridge;
  }
}

let lastHapticTimestamp = 0;

/**
 * Triggers native Android LRA haptic feedback (via MainActivity JavascriptInterface)
 * with a fallback to the Web Vibration API on mobile browsers.
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined') return;

  const now = performance.now();
  // Prevent duplicate triggers if both an explicit handler and global button listener fire on the same tap
  if (now - lastHapticTimestamp < 35) {
    return;
  }
  lastHapticTimestamp = now;

  try {
    if (window.AndroidHaptics && typeof window.AndroidHaptics.trigger === 'function') {
      window.AndroidHaptics.trigger(style);
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const durationMs = style === 'heavy' ? 18 : style === 'medium' ? 10 : 6;
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignore on desktop browsers that block vibration
  }
}
