function isDebugLoggingEnabled(): boolean {
  if (process.env.PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) return true;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('happier.voice.debug') === '1') return true;
  } catch { /* SSR / non-browser */ }
  return false;
}

/**
 * Static voice context configuration.
 *
 * This is intentionally environment-variable driven (build-time) and not user settings.
 */
export const VOICE_CONFIG = {
  /** Disable permission request forwarding */
  DISABLE_PERMISSION_REQUESTS: false,

  /** Disable session online/offline notifications */
  DISABLE_SESSION_STATUS: true,

  /** Disable message forwarding */
  DISABLE_MESSAGES: false,

  /** Disable session focus notifications */
  DISABLE_SESSION_FOCUS: false,

  /** Disable ready event notifications */
  DISABLE_READY_EVENTS: false,

  /** Enable debug logging for voice context updates.
   * Toggle at runtime via: localStorage.setItem('happier.voice.debug', '1') */
  get ENABLE_DEBUG_LOGGING() { return isDebugLoggingEnabled(); },
} as const;

