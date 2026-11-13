import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer } from 'http';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';
const INTERVALS_OAUTH_AUTHORIZE_URL = 'https://intervals.icu/oauth/authorize';
const INTERVALS_OAUTH_TOKEN_URL = 'https://intervals.icu/api/oauth/token';

// Approved Public OAuth Client ID for Intervals Mobile Companion (PKCE S256)
const DEFAULT_OAUTH_CLIENT_ID = '1781';

// Strict input validators (recognized by CodeQL taint analysis as sanitizers)
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// In-memory OAuth session store for the authenticated athlete via Web Browser Login
let oauthSession: {
  accessToken: string;
  athleteId: string;
  athleteName: string;
} | null = null;

// In-memory PKCE verifier store keyed by OAuth state parameter
const pkceStore = new Map<string, { codeVerifier: string; redirectUri: string }>();

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function computeCodeChallengeS256(verifier: string): string {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

function buildAuthHeader(bearerToken?: string): string | null {
  if (bearerToken && bearerToken.trim()) {
    return `Bearer ${bearerToken.trim()}`;
  }
  return null;
}

function getRedirectUri(originParam?: string): string {
  if (originParam && originParam.length <= 256) {
    try {
      const parsed = new URL(originParam);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return `${parsed.origin}/auth/callback`;
      }
    } catch {
      // fall through
    }
  }
  const envUrl = (process.env.OAUTH_REDIRECT_URI || '').trim();
  if (envUrl) return envUrl;
  try {
    const parsedApp = new URL((process.env.APP_URL || 'http://localhost:3000').trim());
    return `${parsedApp.origin}/auth/callback`;
  } catch {
    return 'http://localhost:3000/auth/callback';
  }
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  app.use(express.json({ limit: '5mb' }));

  // Global rate limiter to prevent DoS on API and static file routes (CodeQL js/missing-rate-limiting)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // max 300 requests per 15-minute window per IP
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(generalLimiter);

  // Check server OAuth / connection status
  app.get('/api/intervals/status', generalLimiter, (_req, res) => {
    const clientId = (process.env.CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID).trim();
    res.json({
      configuredOnServer: Boolean(oauthSession?.accessToken),
      oauthClientConfigured: Boolean(clientId),
      oauthClientId: clientId,
      accessToken: oauthSession?.accessToken || null,
      athleteName: oauthSession?.athleteName || null,
      athleteId: oauthSession?.athleteId || '0',
      syncPolicyHours: 24,
    });
  });

  // 1. Construct Intervals.icu OAuth 2.0 + PKCE (S256) Web Browser Login URL
  app.get('/api/auth/url', authLimiter, (req, res) => {
    const clientId = (process.env.CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID).trim();
    const originParam = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
    const redirectUri = getRedirectUri(originParam);

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = computeCodeChallengeS256(codeVerifier);
    const state = `ic_${crypto.randomBytes(12).toString('hex')}`;

    pkceStore.set(state, { codeVerifier, redirectUri });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'CALENDAR:READ,ACTIVITY:READ',
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    const authUrl = `${INTERVALS_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
    res.json({
      url: authUrl,
      oauthClientConfigured: Boolean(clientId),
      clientId,
      redirectUri,
    });
  });

  // 2. OAuth 2.0 + PKCE Callback Handler (Exchanges authorization code + code_verifier for Bearer token)
  const callbackHandler: express.RequestHandler = async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const clientId = (process.env.CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID).trim();
    const clientSecret = (process.env.CLIENT_SECRET || '').trim();

    const pkceEntry = state ? pkceStore.get(state) : undefined;
    if (state) {
      pkceStore.delete(state);
    }

    let authError = '';

    if (code && clientId) {
      try {
        const tokenParams: Record<string, string> = {
          client_id: clientId,
          code,
          grant_type: 'authorization_code',
        };
        if (pkceEntry?.codeVerifier) {
          tokenParams.code_verifier = pkceEntry.codeVerifier;
        }
        if (pkceEntry?.redirectUri) {
          tokenParams.redirect_uri = pkceEntry.redirectUri;
        }
        if (clientSecret) {
          tokenParams.client_secret = clientSecret;
        }

        const tokenRes = await fetch(INTERVALS_OAUTH_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(tokenParams).toString(),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          oauthSession = {
            accessToken: String(tokenData.access_token || ''),
            athleteId: String(tokenData.athlete?.id || '0'),
            athleteName: String(tokenData.athlete?.name || 'Intervals.icu Athlete'),
          };
        } else {
          authError = `HTTP ${tokenRes.status}`;
          console.error('Intervals OAuth token error:', authError);
        }
      } catch (err) {
        authError = err instanceof Error ? err.message : 'Token exchange failed';
        console.error('OAuth token exchange error:', err);
      }
    }

    const safeErrorHtml = authError ? escapeHtml(`Note: ${authError}`) : 'Returning to Intervals Companion...';

    res.send(`
      <html>
        <body style="background:#0f1117;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;">
          <script>
            try {
              const token = ${JSON.stringify(oauthSession?.accessToken || '')};
              const athleteName = ${JSON.stringify(oauthSession?.athleteName || 'Intervals.icu Athlete')};
              const athleteId = ${JSON.stringify(oauthSession?.athleteId || '0')};
              if (token) {
                localStorage.setItem('intervals_icu_oauth_token_v5', JSON.stringify({
                  accessToken: token,
                  athleteName: athleteName,
                  athleteId: athleteId,
                  savedAt: new Date().toISOString()
                }));
              }
            } catch (e) {}

            if (window.opener) {
              window.opener.postMessage({
                type: ${JSON.stringify(oauthSession?.accessToken ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR')},
                accessToken: ${JSON.stringify(oauthSession?.accessToken || '')},
                athleteName: ${JSON.stringify(oauthSession?.athleteName || 'Intervals.icu Athlete')},
                athleteId: ${JSON.stringify(oauthSession?.athleteId || '0')},
                error: ${JSON.stringify(authError)}
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div>
            <h3 style="color:#38bdf8;margin-bottom:8px;">${
              oauthSession?.accessToken
                ? 'Signed in to Intervals.icu!'
                : 'Completing Intervals.icu Sign-In...'
            }</h3>
            <p style="font-size:13px;color:#94a3b8;">${safeErrorHtml}</p>
          </div>
        </body>
      </html>
    `);
  };

  app.get(['/auth/callback', '/auth/callback/'], authLimiter, callbackHandler);

  // 3. Logout endpoint — kills active server OAuth session and PKCE state
  app.post('/api/auth/logout', authLimiter, (_req, res) => {
    oauthSession = null;
    pkceStore.clear();
    res.json({ ok: true });
  });

  // 4. Public Privacy Policy page required by https://intervals.icu/oauth/apply and Google Play Store
  app.get('/privacy', generalLimiter, (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Intervals Companion</title>
  <style>
    body { background: #0f1117; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 720px; margin: 40px auto; padding: 0 20px; }
    h1, h2 { color: #38bdf8; }
    .card { background: #161923; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; margin-top: 20px; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #67e8f9; }
  </style>
</head>
<body>
  <h1>Privacy Policy — Intervals Companion</h1>
  <p>Last updated: November 2026</p>
  <div class="card">
    <h2>1. Data We Access</h2>
    <p>Intervals Companion connects to your <strong>Intervals.icu</strong> account via official OAuth 2.0 authorization using read-only scopes (<code>CALENDAR:READ</code> and <code>ACTIVITY:READ</code>) to display your scheduled workouts and completed training activities.</p>
    <h2>2. How Your Data Is Stored</h2>
    <p>Your OAuth access token and cached workout schedule are stored locally on your Android device (using Android EncryptedSharedPreferences and local cache) to allow fast offline viewing and scheduled background refreshes.</p>
    <h2>3. Data Sharing</h2>
    <p>We do not sell, rent, or share your personal profile or workout data with any third parties or advertising networks. You can revoke access at any time from your Intervals.icu Settings or by logging out in the app.</p>
    <h2>4. Contact</h2>
    <p>For questions or data deletion requests, please open an issue on the project's GitHub repository.</p>
  </div>
</body>
</html>`);
  });

  // Sync endpoint: Always uses athleteId = "0" (authenticated user) or validated OAuth session athleteId
  app.post('/api/intervals/sync', generalLimiter, async (req, res) => {
    try {
      const now = new Date();
      const defaultOldest = new Date(now.getTime() - 28 * 86400000).toISOString().slice(0, 10);
      const defaultNewest = new Date(now.getTime() + 28 * 86400000).toISOString().slice(0, 10);
      const rawOldest = typeof req.body?.oldest === 'string' ? req.body.oldest : defaultOldest;
      const rawNewest = typeof req.body?.newest === 'string' ? req.body.newest : defaultNewest;

      const oldest = ISO_DATE_REGEX.test(rawOldest) ? rawOldest : defaultOldest;
      const newest = ISO_DATE_REGEX.test(rawNewest) ? rawNewest : defaultNewest;

      // "0" always resolves to the authenticated athlete in Intervals.icu
      const rawAthleteId = oauthSession?.athleteId || '0';
      const athleteId = SAFE_ID_REGEX.test(rawAthleteId) ? rawAthleteId : '0';

      const bearerHeader = req.headers.authorization;
      const bearerToken = bearerHeader?.startsWith('Bearer ')
        ? bearerHeader.slice('Bearer '.length)
        : undefined;
      const authHeader = buildAuthHeader(bearerToken);

      if (!authHeader) {
        return res.status(200).json({
          mode: 'unauthenticated',
          syncedAt: new Date().toISOString(),
          message: 'Not signed in.',
        });
      }

      const headers: Record<string, string> = {
        Authorization: authHeader,
        Accept: 'application/json',
      };

      const [athleteRes, eventsRes, activitiesRes, wellnessRes] = await Promise.all([
        fetch(`${INTERVALS_BASE_URL}/athlete/${encodeURIComponent(athleteId)}`, { headers }),
        fetch(
          `${INTERVALS_BASE_URL}/athlete/${encodeURIComponent(athleteId)}/events?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}&resolve=true`,
          { headers }
        ),
        fetch(
          `${INTERVALS_BASE_URL}/athlete/${encodeURIComponent(athleteId)}/activities?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`,
          { headers }
        ),
        fetch(
          `${INTERVALS_BASE_URL}/athlete/${encodeURIComponent(athleteId)}/wellness?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`,
          { headers }
        ),
      ]);

      if (!eventsRes.ok && !activitiesRes.ok) {
        const errText = await eventsRes.text().catch(() => 'Intervals API error');
        return res.status(eventsRes.status || 502).json({
          error: `Intervals.icu API returned ${eventsRes.status}: ${errText.slice(0, 200)}`,
        });
      }

      const athlete = athleteRes.ok ? await athleteRes.json().catch(() => null) : null;
      const events = eventsRes.ok ? await eventsRes.json().catch(() => []) : [];
      const activities = activitiesRes.ok ? await activitiesRes.json().catch(() => []) : [];
      const wellness = wellnessRes.ok ? await wellnessRes.json().catch(() => []) : [];

      return res.json({
        mode: 'live',
        syncedAt: new Date().toISOString(),
        athlete,
        events,
        activities,
        wellness,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error syncing with Intervals.icu';
      return res.status(500).json({ error: msg });
    }
  });

  // Activity streams endpoint for completed workout diagrams
  app.get('/api/intervals/activity/:id/streams', generalLimiter, async (req, res) => {
    try {
      const rawId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!SAFE_ID_REGEX.test(rawId)) {
        return res.status(400).json({ error: 'Invalid activity ID format' });
      }

      const bearerHeader = req.headers.authorization;
      const bearerToken = bearerHeader?.startsWith('Bearer ')
        ? bearerHeader.slice('Bearer '.length)
        : undefined;
      const authHeader = buildAuthHeader(bearerToken);

      if (!authHeader) {
        return res.status(200).json({ mode: 'unauthenticated', streams: null });
      }

      const headers: Record<string, string> = {
        Authorization: authHeader,
        Accept: 'application/json',
      };

      const [detailRes, streamsRes] = await Promise.all([
        fetch(`${INTERVALS_BASE_URL}/activity/${encodeURIComponent(rawId)}`, { headers }),
        fetch(
          `${INTERVALS_BASE_URL}/activity/${encodeURIComponent(rawId)}/streams?types=time,distance,velocity_smooth,watts,heartrate,cadence,altitude`,
          { headers }
        ),
      ]);

      const activity = detailRes.ok ? await detailRes.json().catch(() => null) : null;
      const streams = streamsRes.ok ? await streamsRes.json().catch(() => null) : null;

      return res.json({
        mode: 'live',
        activity,
        streams,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch activity streams';
      return res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(generalLimiter, express.static(distPath));
    app.get('*', generalLimiter, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Intervals.icu Mobile Companion server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

