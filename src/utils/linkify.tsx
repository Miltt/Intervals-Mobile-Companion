import React from 'react';
import { ExternalLink } from 'lucide-react';
import { isStandaloneCapacitorApk } from './intervalsClient';
import { triggerHaptic } from './haptics';

/**
 * Regex matching http://, https://, or www. URLs in plain text coach notes.
 */
const URL_CANDIDATE_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>()[\]{}"']+)/gi;

/**
 * Trailing punctuation characters that often appear after a URL in a sentence
 * (e.g. "Check this video: https://youtu.be/xyz123.") and should not be part of the URL.
 */
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)'"\]]+$/;

/**
 * Validates that a candidate string is a genuine, safe HTTP/HTTPS web URL
 * with a valid domain name and TLD. Returns the normalized URL string or null.
 */
export function validateWebUrl(rawCandidate: string): string | null {
  if (!rawCandidate || typeof rawCandidate !== 'string') return null;
  const trimmed = rawCandidate.trim();
  if (!trimmed) return null;

  const normalized = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    // Require a valid domain with at least one dot and a 2+ character alphabetic TLD
    if (
      !host ||
      !host.includes('.') ||
      host.startsWith('.') ||
      host.endsWith('.') ||
      !/^[a-z0-9.-]+$/i.test(host)
    ) {
      return null;
    }

    const parts = host.split('.');
    const tld = parts[parts.length - 1];
    if (!tld || tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

interface LinkifiedTextProps {
  text: string;
  isLight?: boolean;
}

/**
 * Splits plain text (such as Coach Notes) into text and validated clickable web links.
 */
export const LinkifiedText: React.FC<LinkifiedTextProps> = ({
  text,
  isLight = false,
}) => {
  if (!text) return null;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_CANDIDATE_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const rawToken = match[0];

    // Strip trailing sentence punctuation from the candidate URL
    const trailingMatch = rawToken.match(TRAILING_PUNCTUATION_REGEX);
    const cleanCandidate = trailingMatch
      ? rawToken.slice(0, rawToken.length - trailingMatch[0].length)
      : rawToken;
    const trailingChars = trailingMatch ? trailingMatch[0] : '';

    const validatedHref = validateWebUrl(cleanCandidate);

    if (matchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchStart));
    }

    if (validatedHref) {
      nodes.push(
        <a
          key={`link-${matchStart}`}
          href={validatedHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');

            if (isStandaloneCapacitorApk() && typeof window !== 'undefined') {
              const cap = (
                window as Window & {
                  Capacitor?: {
                    Plugins?: {
                      Browser?: {
                        open?: (opts: { url: string }) => Promise<void>;
                      };
                    };
                  };
                }
              ).Capacitor;

              if (cap?.Plugins?.Browser?.open) {
                e.preventDefault();
                cap.Plugins.Browser.open({ url: validatedHref }).catch(() => {
                  window.location.assign(validatedHref);
                });
              }
            }
          }}
          className={`inline-flex items-center gap-0.5 underline underline-offset-2 font-medium break-all transition-colors ${
            isLight
              ? 'text-indigo-600 hover:text-indigo-800 decoration-indigo-400'
              : 'text-cyan-400 hover:text-cyan-300 decoration-cyan-500/70'
          }`}
        >
          <span>{cleanCandidate}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
      if (trailingChars) {
        nodes.push(trailingChars);
      }
    } else {
      // Failed strict URL validation — render as plain text
      nodes.push(rawToken);
    }

    lastIndex = matchStart + rawToken.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
};
