import type { Language } from './types';

/**
 * GTranslate (https://gtranslate.io/) integration.
 *
 * The widget (loaded in index.html, see `window.gtranslateSettings` +
 * cdn.gtranslate.net/widgets/latest/dwf.js) translates the live DOM from
 * the site's source language (Turkish) into the visitor's chosen language
 * by reading the standard `googtrans` cookie on load. This module owns
 * that cookie so the app's own header button (Header.tsx) can drive the
 * widget instead of showing GTranslate's default dropdown/flags UI.
 *
 * This fully replaces the old hand-maintained `en` dictionary in
 * lib/i18n.ts — UI copy is now written once, in Turkish, and GTranslate
 * produces the English version at render time.
 */

const COOKIE_NAME = 'googtrans';
const SOURCE_LANGUAGE: Language = 'tr';
const STORAGE_KEY = 'immaculate-lang';

function setCookie(name: string, value: string) {
  const oneYear = 60 * 60 * 24 * 365;
  const host = window.location.hostname;
  // Set both host-only and dot-domain variants so the widget script (which
  // may check either form) reliably picks it up.
  document.cookie = `${name}=${value}; path=/; max-age=${oneYear}`;
  if (host && host !== 'localhost') {
    document.cookie = `${name}=${value}; path=/; domain=.${host}; max-age=${oneYear}`;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Returns the language currently applied by GTranslate, if any. */
export function getGTranslateLanguage(): Language | null {
  const raw = readCookie(COOKIE_NAME); // format: "/tr/en"
  if (!raw) return null;
  const target = raw.split('/')[2];
  return target === 'en' ? 'en' : target === 'tr' ? 'tr' : null;
}

/**
 * Switches the site language. Setting the `googtrans` cookie and reloading
 * is the documented way to drive GTranslate's widget from custom UI — the
 * widget re-reads this cookie on every page load and translates
 * accordingly.
 */
export function setGTranslateLanguage(lang: Language) {
  localStorage.setItem(STORAGE_KEY, lang);
  if (lang === SOURCE_LANGUAGE) {
    // Clear the cookie so the page renders the original Turkish source
    // instead of round-tripping it through translation.
    setCookie(COOKIE_NAME, '');
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  } else {
    setCookie(COOKIE_NAME, `/${SOURCE_LANGUAGE}/${lang}`);
  }
  window.location.reload();
}

/** Resolves the language to use on boot: cookie wins, then stored pref. */
export function getInitialLanguage(): Language {
  const fromCookie = getGTranslateLanguage();
  if (fromCookie) return fromCookie;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'tr';
}
