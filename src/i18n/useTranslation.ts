import { useCallback, useEffect, useState } from 'react';
import indexManifest from '../../public/locales/index.json';
import enDict from '../../public/locales/en.json';
import esDict from '../../public/locales/es.json';
import deDict from '../../public/locales/de.json';
import ruDict from '../../public/locales/ru.json';
import frDict from '../../public/locales/fr.json';
import itDict from '../../public/locales/it.json';

export interface LocaleMeta {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  file: string;
}

export type TranslationDict = Record<string, string>;

const BUNDLED_DICTIONARIES: Record<string, TranslationDict> = {
  en: enDict,
  es: esDict,
  de: deDict,
  ru: ruDict,
  fr: frDict,
  it: itDict,
};

const REMOTE_MANIFEST_CACHE_KEY = 'intervals_icu_locales_manifest_v2';
const REMOTE_DICTS_CACHE_KEY = 'intervals_icu_locales_dicts_v2';
export const GITHUB_LOCALES_BASE_URL =
  'https://raw.githubusercontent.com/Miltt/Intervals-Mobile-Companion/main/public/locales';

export function detectDefaultLanguage(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const short = navigator.language.slice(0, 2).toLowerCase();
    if (BUNDLED_DICTIONARIES[short]) {
      return short;
    }
  }
  return 'en';
}

function loadCachedManifest(): LocaleMeta[] {
  try {
    const raw = localStorage.getItem(REMOTE_MANIFEST_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return indexManifest.languages;
}

function loadCachedRemoteDicts(): Record<string, TranslationDict> {
  try {
    const raw = localStorage.getItem(REMOTE_DICTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

export function useLocalization(selectedLanguage: string) {
  const [availableLanguages, setAvailableLanguages] = useState<LocaleMeta[]>(
    () => loadCachedManifest()
  );
  const [remoteDicts, setRemoteDicts] = useState<Record<string, TranslationDict>>(
    () => loadCachedRemoteDicts()
  );
  const [isSyncingLocales, setIsSyncingLocales] = useState<boolean>(false);

  // If the user selects a non-bundled language that was listed in index.json, fetch its JSON file
  const fetchLanguageDict = useCallback(
    async (langCode: string, fileName?: string) => {
      const targetFile = fileName || `${langCode}.json`;
      try {
        // 1. Try public GitHub repository raw URL first
        const ghRes = await fetch(`${GITHUB_LOCALES_BASE_URL}/${targetFile}`, {
          cache: 'no-store',
        }).catch(() => null);

        let dictData: TranslationDict | null = null;
        if (ghRes && ghRes.ok) {
          dictData = await ghRes.json();
        } else {
          // 2. Fallback to local /locales/<file>
          const localRes = await fetch(`/locales/${targetFile}`).catch(() => null);
          if (localRes && localRes.ok) {
            dictData = await localRes.json();
          }
        }

        if (dictData && typeof dictData === 'object') {
          setRemoteDicts((prev) => {
            const next = { ...prev, [langCode]: dictData! };
            try {
              localStorage.setItem(REMOTE_DICTS_CACHE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
        }
      } catch {
        // Offline fallback uses bundled dictionaries
      }
    },
    []
  );

  // Sync available languages list and current language dictionary from the public GitHub repo
  const syncLanguagesFromGitHub = useCallback(async (): Promise<number> => {
    setIsSyncingLocales(true);
    try {
      let manifestData: { languages?: LocaleMeta[] } | null = null;

      const ghRes = await fetch(`${GITHUB_LOCALES_BASE_URL}/index.json`, {
        cache: 'no-store',
      }).catch(() => null);

      if (ghRes && ghRes.ok) {
        manifestData = await ghRes.json();
      } else {
        const localRes = await fetch('/locales/index.json').catch(() => null);
        if (localRes && localRes.ok) {
          manifestData = await localRes.json();
        }
      }

      const list =
        manifestData?.languages && Array.isArray(manifestData.languages)
          ? manifestData.languages
          : indexManifest.languages;

      setAvailableLanguages(list);
      try {
        localStorage.setItem(REMOTE_MANIFEST_CACHE_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }

      const currentMeta = list.find((l) => l.code === selectedLanguage);
      await fetchLanguageDict(selectedLanguage, currentMeta?.file);

      return list.length;
    } finally {
      setIsSyncingLocales(false);
    }
  }, [selectedLanguage, fetchLanguageDict]);

  useEffect(() => {
    if (!BUNDLED_DICTIONARIES[selectedLanguage] && !remoteDicts[selectedLanguage]) {
      const meta = availableLanguages.find((l) => l.code === selectedLanguage);
      fetchLanguageDict(selectedLanguage, meta?.file);
    }
  }, [selectedLanguage, availableLanguages, remoteDicts, fetchLanguageDict]);

  // Translation lookup with automatic English fallback and {placeholder} interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const activeDict =
        remoteDicts[selectedLanguage] ||
        BUNDLED_DICTIONARIES[selectedLanguage] ||
        enDict;

      let template =
        activeDict[key] ??
        BUNDLED_DICTIONARIES[selectedLanguage]?.[key] ??
        (enDict as TranslationDict)[key] ??
        key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return template;
    },
    [selectedLanguage, remoteDicts]
  );

  return {
    t,
    availableLanguages,
    isSyncingLocales,
    syncLanguagesFromGitHub,
  };
}
