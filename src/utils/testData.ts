/**
 * Query used to build saved searches. "guide" matches the onboarding documents
 * every new Pics.io trial account gets, so the suite works on a fresh account.
 * Override with SEARCH_TEXT if your library has different content.
 */
export const SEARCH_TEXT = process.env.SEARCH_TEXT ?? 'guide';

/** Server-side limit found while exploring the API (400 above this). */
export const MAX_NAME_LENGTH = 50;
