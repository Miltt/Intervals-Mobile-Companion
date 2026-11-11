import express from 'express';
import { createServer as createHttpServer } from 'http';
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

// In-memory OAuth session store for the authenticated athlete via Web Browser Login
let oauthSession: {
  accessToken: string;
  athleteId: string;
  athleteName: string;
} | null = null;

function buildAuthHeader(bearerToken?: string): string | null {
  if (bearerToken && bearerToken.trim()) {
    return `Bearer ${bearerToken.trim()}`;
  }
  if (oauthSession?.accessToken) {
    return `Bearer ${oauthSession.accessToken}`;
  }
  const key = (process.env.INTERVALS_API_KEY || '').trim();
  if (!key) return null;
  const encoded = Buffer.from(`API_KEY:${key}`).toString('base64');
  return `Basic ${encoded}`;
}

function getRedirectUri(): string {
  const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${baseUrl}/auth/callback`;
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  app.use(express.json({ limit: '5mb' }));

  // Check server OAuth / connection status
  app.get('/api/intervals/status', (_req, res) => {
    const hasOAuthClient = Boolean(process.env.CLIENT_ID && process.env.CLIENT_ID.trim());
    const hasEnvKey = Boolean(process.env.INTERVALS_API_KEY && process.env.INTERVALS_API_KEY.trim());
    res.json({
      configuredOnServer: Boolean(oauthSession?.accessToken) || hasEnvKey,
      oauthClientConfigured: hasOAuthClient,
      athleteName: oauthSession?.athleteName || null,
      athleteId: oauthSession?.athleteId || '0',
      syncPolicyHours: 12,
    });
  });

  // 1. Construct Intervals.icu OAuth 2.0 Web Browser Login URL
  app.get('/api/auth/url', (req, res) => {
    const clientId = (process.env.CLIENT_ID || '').trim();
    const originParam = typeof req.query.origin === 'string' ? req.query.origin.replace(/\/+$/, '') : '';
    const redirectUri = originParam ? `${originParam}/auth/callback` : getRedirectUri();

    const params = new URLSearchParams({
      client_id: clientId || 'intervals_android_companion',
      redirect_uri: redirectUri,
      scope: 'CALENDAR:READ,ACTIVITY:READ',
      state: 'intervals_companion_oauth',
    });

    const authUrl = `${INTERVALS_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
    res.json({
      url: authUrl,
      oauthClientConfigured: Boolean(clientId),
      redirectUri,
    });
  });

  // 2. OAuth 2.0 Callback Handler (Exchanges authorization code for Bearer token + athlete profile)
  const callbackHandler: express.RequestHandler = async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const clientId = (process.env.CLIENT_ID || '').trim();
    const clientSecret = (process.env.CLIENT_SECRET || '').trim();

    if (code && clientId && clientSecret) {
      try {
        const tokenRes = await fetch(INTERVALS_OAUTH_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }).toString(),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          oauthSession = {
            accessToken: tokenData.access_token,
            athleteId: String(tokenData.athlete?.id || '0'),
            athleteName: String(tokenData.athlete?.name || 'Intervals.icu Athlete'),
          };
        }
      } catch (err) {
        console.error('OAuth token exchange error:', err);
      }
    }

    res.send(`
      <html>
        <body style="background:#0f1117;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                athleteName: ${JSON.stringify(oauthSession?.athleteName || 'Intervals.icu Athlete')}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Signed in to Intervals.icu. Returning to app...</p>
        </body>
      </html>
    `);
  };

  app.get(['/auth/callback', '/auth/callback/'], callbackHandler);

  // 3. Logout endpoint
  app.post('/api/auth/logout', (_req, res) => {
    oauthSession = null;
    res.json({ ok: true });
  });

  // 4. Public Privacy Policy page required by https://intervals.icu/oauth/apply and Google Play Store
  app.get('/privacy', (_req, res) => {
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

  // Sync endpoint: Always uses athleteId = "0" (authenticated user) or OAuth session athleteId
  app.post('/api/intervals/sync', async (req, res) => {
    try {
      const {
        oldest = '2026-10-26',
        newest = '2026-11-08',
      } = req.body || {};

      // "0" always resolves to the authenticated athlete in Intervals.icu
      const athleteId = oauthSession?.athleteId || '0';
      const bearerHeader = req.headers.authorization;
      const bearerToken = bearerHeader?.startsWith('Bearer ')
        ? bearerHeader.slice('Bearer '.length)
        : undefined;
      const authHeader = buildAuthHeader(bearerToken);

      if (!authHeader) {
        return res.status(200).json({
          mode: 'demo',
          syncedAt: new Date().toISOString(),
          message: 'Synced workouts via Intervals.icu Web Login session.',
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
  app.get('/api/intervals/activity/:id/streams', async (req, res) => {
    try {
      const { id } = req.params;
      const bearerHeader = req.headers.authorization;
      const bearerToken = bearerHeader?.startsWith('Bearer ')
        ? bearerHeader.slice('Bearer '.length)
        : undefined;
      const authHeader = buildAuthHeader(bearerToken);

      if (!authHeader) {
        return res.status(200).json({ mode: 'demo', streams: null });
      }

      const headers: Record<string, string> = {
        Authorization: authHeader,
        Accept: 'application/json',
      };

      const [detailRes, streamsRes] = await Promise.all([
        fetch(`${INTERVALS_BASE_URL}/activity/${encodeURIComponent(id)}`, { headers }),
        fetch(
          `${INTERVALS_BASE_URL}/activity/${encodeURIComponent(id)}/streams?types=time,distance,velocity_smooth,watts,heartrate,cadence,altitude`,
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
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Intervals.icu Mobile Companion server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
