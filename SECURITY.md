# Security Policy

## Supported Versions

Only the latest version on the `main` branch and the latest published Android APK release are actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2.0 | :x:                |

## Security Architecture

- **OAuth 2.0 + PKCE (`S256`) Public Client:** Intervals Companion authenticates with Intervals.icu using approved Public Client ID `#1781` with dynamic per-session PKCE (`S256`) code challenges and read-only scopes (`CALENDAR:READ`, `ACTIVITY:READ`). No `client_secret` or personal API key is embedded in the source code or APK.
- **Local-Only Token Storage:** OAuth bearer tokens and cached workout data are stored strictly on the user's device and are never transmitted to any third-party analytics or external servers.
- **Rate Limiting & Input Validation:** The companion web/PWA server (`server.ts`) enforces strict request rate limiting (`express-rate-limit`), input format validation, and HTML output escaping.

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, please report vulnerabilities privately using GitHub's built-in **Private Vulnerability Reporting**:
1. Navigate to the [**Security**](https://github.com/Miltt/Intervals-Mobile-Companion/security) tab of this repository.
2. Click **Report a vulnerability** (under *Advisories*) to open a private security advisory directly with the maintainer.
3. Include steps to reproduce, potential impact, and any suggested remediation.

You can expect an initial acknowledgment within **72 hours** and a resolution or mitigation plan as quickly as possible.
