import { LiveIntervalsPayload } from './formatters';

const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';
const INTERVALS_OAUTH_AUTHORIZE_URL = 'https://intervals.icu/oauth/authorize';
const INTERVALS_OAUTH_TOKEN_URL = 'https://intervals.icu/api/oauth/token';

export const INTERVALS_CLIENT_ID = '1781';
export const INTERVALS_NATIVE_REDIRECT_URI = 'intervalscompanion://oauth/callback';
export const INTERVALS_SCOPES = 'CALENDAR:READ,ACTIVITY:READ';

const PKCE_VERIFIER_STORAGE_KEY = 'intervals_icu_pkce_verifier_v5';
const PKCE_STATE_STORAGE_KEY = 'intervals_icu_pkce_state_v5';

interface CapacitorWindow {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: {
      Browser?: {
        open?: (options: { url: string; windowName?: string; toolbarColor?: string }) => Promise<void>;
        close?: () => Promise<void>;
      };
    };
  };
}

/**
 * Returns true when running inside the compiled Android APK (Capacitor runtime or VITE_CAPACITOR_BUILD=true).
 */
export function isStandaloneCapacitorApk(): boolean {
  if (import.meta.env.VITE_CAPACITOR_BUILD === 'true') {
    return true;
  }
  if (typeof window !== 'undefined') {
    const cap = (window as unknown as CapacitorWindow).Capacitor;
    if (cap?.isNativePlatform?.()) {
      return true;
    }
  }
  return false;
}

/**
 * Navigates to the Intervals.icu OAuth 2.0 + PKCE page directly inside the Capacitor WebView.
 * MainActivity's BridgeWebViewClient intercepts the `intervalscompanion://oauth/callback?code=...`
 * redirect and returns directly to `https://localhost/?code=...` with zero leftover browser tabs.
 */
export async function openNativeOAuthBrowser(url: string): Promise<void> {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

/**
 * No-op helper kept for compatibility (in-app WebView OAuth leaves no external browser tab open).
 */
export async function closeNativeOAuthBrowser(): Promise<void> {
  // Handled automatically by in-app BridgeWebViewClient redirect
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomUrlSafeString(byteLength: number): string {
  const array = new Uint8Array(byteLength);
  window.crypto.getRandomValues(array);
  return toBase64Url(array);
}

async function computeS256Challenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
}

/**
 * Generates an Intervals.icu OAuth 2.0 + PKCE (S256) authorization URL directly on the client
 * using the registered `intervalscompanion://oauth/callback` deep-link redirect URI.
 */
export async function createNativePkceAuthorizeUrl(): Promise<string> {
  const codeVerifier = generateRandomUrlSafeString(48);
  const codeChallenge = await computeS256Challenge(codeVerifier);
  const state = generateRandomUrlSafeString(16);

  try {
    localStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier);
    localStorage.setItem(PKCE_STATE_STORAGE_KEY, state);
  } catch {
    // ignore storage errors
  }

  const params = new URLSearchParams({
    client_id: INTERVALS_CLIENT_ID,
    redirect_uri: INTERVALS_NATIVE_REDIRECT_URI,
    scope: INTERVALS_SCOPES,
    state,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${INTERVALS_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export interface OAuthExchangeResult {
  accessToken: string;
  athleteId: string;
  athleteName: string;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

/**
 * Exchanges an OAuth 2.0 authorization `code` + stored PKCE `code_verifier` directly with Intervals.icu.
 */
export async function exchangeNativePkceCode(
  code: string,
  returnedState?: string
): Promise<OAuthExchangeResult> {
  let codeVerifier = '';
  let expectedState = '';
  try {
    codeVerifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY) || '';
    expectedState = localStorage.getItem(PKCE_STATE_STORAGE_KEY) || '';
  } catch {
    // ignore
  }

  if (returnedState && expectedState && returnedState !== expectedState) {
    throw new Error('OAuth security state mismatch (CSRF check). Please sign in again.');
  }

  const formParams = new URLSearchParams();
  formParams.set('client_id', INTERVALS_CLIENT_ID);
  formParams.set('code', code);
  formParams.set('grant_type', 'authorization_code');
  formParams.set('redirect_uri', INTERVALS_NATIVE_REDIRECT_URI);
  if (codeVerifier) {
    formParams.set('code_verifier', codeVerifier);
  }

  const tokenRes = await fetchWithTimeout(INTERVALS_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formParams.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => 'Token exchange failed');
    throw new Error(`Intervals.icu token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = String(tokenData.access_token || '');
  if (!accessToken) {
    throw new Error('Intervals.icu did not return an access_token');
  }

  let athleteId = tokenData.athlete?.id ? String(tokenData.athlete.id) : '0';
  let athleteName = tokenData.athlete?.name ? String(tokenData.athlete.name) : '';

  if (!athleteName) {
    try {
      const profileRes = await fetchWithTimeout(`${INTERVALS_BASE_URL}/athlete/0`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile?.id) athleteId = String(profile.id);
        if (profile?.name) athleteName = String(profile.name);
      }
    } catch {
      // ignore
    }
  }

  try {
    localStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.removeItem(PKCE_STATE_STORAGE_KEY);
  } catch {
    // ignore
  }

  return {
    accessToken,
    athleteId: athleteId || '0',
    athleteName: athleteName || 'Intervals.icu Athlete',
  };
}

/**
 * Syncs athlete profile, planned events, completed activities, and wellness directly from Intervals.icu REST API.
 */
export async function syncIntervalsDirect(
  accessToken: string,
  oldest: string,
  newest: string
): Promise<LiveIntervalsPayload> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  const [athleteRes, eventsRes, activitiesRes, wellnessRes] = await Promise.all([
    fetchWithTimeout(`${INTERVALS_BASE_URL}/athlete/0`, { headers }),
    fetchWithTimeout(
      `${INTERVALS_BASE_URL}/athlete/0/events?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`,
      { headers }
    ),
    fetchWithTimeout(
      `${INTERVALS_BASE_URL}/athlete/0/activities?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`,
      { headers }
    ),
    fetchWithTimeout(
      `${INTERVALS_BASE_URL}/athlete/0/wellness?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`,
      { headers }
    ),
  ]);

  if (eventsRes.status === 401 || activitiesRes.status === 401) {
    throw new Error('Intervals.icu session expired or revoked. Please reconnect in Settings → Account.');
  }

  if (!eventsRes.ok && !activitiesRes.ok) {
    const errText = await eventsRes.text().catch(() => 'Intervals API error');
    throw new Error(`Intervals.icu API returned ${eventsRes.status}: ${errText.slice(0, 160)}`);
  }

  const athlete = athleteRes.ok ? await athleteRes.json().catch(() => null) : null;
  const events = eventsRes.ok ? await eventsRes.json().catch(() => []) : [];
  const activities = activitiesRes.ok ? await activitiesRes.json().catch(() => []) : [];
  const wellness = wellnessRes.ok ? await wellnessRes.json().catch(() => []) : [];

  return {
    athlete,
    events: Array.isArray(events) ? events : [],
    activities: Array.isArray(activities) ? activities : [],
    wellness: Array.isArray(wellness) ? wellness : [],
  };
}

export interface DirectActivityDetailAndStreams {
  activity: Record<string, unknown> | null;
  streams: Array<{ type: string; data: unknown[] }>;
}

/**
 * Fetches activity detail (including icu_intervals and icu_hr_zone_times) and streams directly from Intervals.icu REST API.
 */
export async function fetchActivityStreamsDirect(
  accessToken: string,
  activityId: string
): Promise<DirectActivityDetailAndStreams> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  const [detailRes, streamsRes] = await Promise.all([
    fetchWithTimeout(`${INTERVALS_BASE_URL}/activity/${encodeURIComponent(activityId)}?intervals=true`, {
      headers,
    }).catch(() => null),
    fetchWithTimeout(
      `${INTERVALS_BASE_URL}/activity/${encodeURIComponent(activityId)}/streams?types=time,distance,velocity_smooth,watts,heartrate,cadence,altitude`,
      { headers }
    ).catch(() => null),
  ]);

  const activity =
    detailRes && detailRes.ok ? await detailRes.json().catch(() => null) : null;
  const streamsRaw =
    streamsRes && streamsRes.ok ? await streamsRes.json().catch(() => []) : [];

  return {
    activity: activity && typeof activity === 'object' ? (activity as Record<string, unknown>) : null,
    streams: Array.isArray(streamsRaw) ? streamsRaw : [],
  };
}
