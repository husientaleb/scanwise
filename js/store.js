// store.js — local persistence for guests (localStorage). The shapes mirror
// the Supabase schema in supabase/schema.sql so registered-user sync can be
// added later without remodeling.

const KEYS = {
  scans: 'scanwise.scans.v1',
  prefs: 'scanwise.prefs.v1',       // legacy single-profile prefs (migrated)
  profiles: 'scanwise.profiles.v1', // family profiles
  onboarded: 'scanwise.onboarded.v1',
  usage: 'scanwise.usage.v1',
};

// Free-plan allowance. A soft limit while billing is inert: the app informs
// and nudges toward the pricing page but never blocks a scan mid-flow.
export const FREE_SCANS_PER_MONTH = 20;

export const DEFAULT_PREFS = {
  lowerSugar: false,
  lowerSodium: false,
  higherProtein: false,
  higherFiber: false,
  vegetarian: false,
  vegan: false,
  glutenAvoidance: false,
  dairyAvoidance: false,
  peanutAllergy: false,
  treeNutAllergy: false,
  sesameAllergy: false,
  avoidArtificialColors: false,
  avoidIngredients: '',
};

export const PREF_LABELS = {
  lowerSugar: 'Lower sugar',
  lowerSodium: 'Lower sodium',
  higherProtein: 'Higher protein',
  higherFiber: 'Higher fiber',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  glutenAvoidance: 'Gluten avoidance',
  dairyAvoidance: 'Dairy avoidance',
  peanutAllergy: 'Peanut allergy',
  treeNutAllergy: 'Tree-nut allergy',
  sesameAllergy: 'Sesame allergy',
  avoidArtificialColors: 'Avoid artificial colors',
};

// Preferences that map onto major-allergen or avoidance alerts in reports.
export const PREF_ALLERGEN_MAP = {
  peanutAllergy: 'Peanuts',
  treeNutAllergy: 'Tree nuts',
  sesameAllergy: 'Sesame',
  dairyAvoidance: 'Milk',
  glutenAvoidance: 'Wheat',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('Storage write failed (quota?):', err);
    return false;
  }
}

// ——— Scans ———

export function getScans() {
  return read(KEYS.scans, []);
}

export function getScan(id) {
  return getScans().find((s) => s.id === id) || null;
}

/**
 * Save a scan record. Shape mirrors the `scans` table:
 * { id, productName, brand, thumbnail, extracted:{...}, analysis, scoreDetail,
 *   overallScore, createdAt, isFavorite, demo }
 */
export function saveScan(scan) {
  const scans = getScans().filter((s) => s.id !== scan.id);
  scans.unshift(scan);
  // Free tier keeps a bounded history; also protects localStorage quota.
  const trimmed = scans.slice(0, 50);
  if (!write(KEYS.scans, trimmed)) {
    // Retry without thumbnails if quota was hit.
    write(KEYS.scans, trimmed.map((s) => ({ ...s, thumbnail: null })));
  }
  return scan;
}

export function deleteScan(id) {
  write(KEYS.scans, getScans().filter((s) => s.id !== id));
}

/** Remove only the stored image for a scan (privacy control). */
export function deleteScanImage(id) {
  const scans = getScans().map((s) => (s.id === id ? { ...s, thumbnail: null } : s));
  write(KEYS.scans, scans);
}

export function toggleFavorite(id) {
  let nowFavorite = false;
  const scans = getScans().map((s) => {
    if (s.id === id) {
      nowFavorite = !s.isFavorite;
      return { ...s, isFavorite: nowFavorite };
    }
    return s;
  });
  write(KEYS.scans, scans);
  return nowFavorite;
}

export function searchScans(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return getScans();
  return getScans().filter((s) =>
    (s.productName || '').toLowerCase().includes(q) ||
    (s.brand || '').toLowerCase().includes(q) ||
    (s.mainConcern || '').toLowerCase().includes(q));
}

export function clearAllData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ——— Family profiles ———
// One account can hold several profiles (Me, Kid, Grandma…), each with its
// own preferences. Reports can be re-interpreted per profile instantly.

function defaultProfilesState() {
  // Migrate legacy single-profile prefs into the first profile.
  const legacy = read(KEYS.prefs, null);
  return {
    activeId: 'p-me',
    profiles: [
      { id: 'p-me', name: 'Me', emoji: '🙂', prefs: { ...DEFAULT_PREFS, ...(legacy || {}) } },
    ],
  };
}

export function getProfilesState() {
  const state = read(KEYS.profiles, null);
  if (state && Array.isArray(state.profiles) && state.profiles.length) return state;
  const fresh = defaultProfilesState();
  write(KEYS.profiles, fresh);
  return fresh;
}

function saveProfilesState(state) {
  write(KEYS.profiles, state);
}

export function getProfiles() {
  return getProfilesState().profiles;
}

export function getActiveProfile() {
  const state = getProfilesState();
  return state.profiles.find((p) => p.id === state.activeId) || state.profiles[0];
}

export function setActiveProfile(id) {
  const state = getProfilesState();
  if (state.profiles.some((p) => p.id === id)) {
    state.activeId = id;
    saveProfilesState(state);
  }
  return getActiveProfile();
}

export function addProfile(name, emoji = '👤') {
  const state = getProfilesState();
  if (state.profiles.length >= 6) return null; // sensible cap
  const profile = {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: (name || 'New profile').slice(0, 24),
    emoji,
    prefs: { ...DEFAULT_PREFS },
  };
  state.profiles.push(profile);
  state.activeId = profile.id;
  saveProfilesState(state);
  return profile;
}

export function deleteProfile(id) {
  const state = getProfilesState();
  if (state.profiles.length <= 1) return false; // always keep one
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.activeId === id) state.activeId = state.profiles[0].id;
  saveProfilesState(state);
  return true;
}

export function renameProfile(id, name) {
  const state = getProfilesState();
  const p = state.profiles.find((x) => x.id === id);
  if (p) { p.name = (name || p.name).slice(0, 24); saveProfilesState(state); }
}

// ——— Preferences (of the active profile) ———

export function getPrefs() {
  return { ...DEFAULT_PREFS, ...getActiveProfile().prefs };
}

export function savePrefs(prefs) {
  const state = getProfilesState();
  const p = state.profiles.find((x) => x.id === state.activeId) || state.profiles[0];
  p.prefs = { ...DEFAULT_PREFS, ...p.prefs, ...prefs };
  saveProfilesState(state);
}

// ——— Free-plan scan usage ———

/** Month key like "2026-07" for the given date (defaults to now). */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** { month, count, limit, remaining, over } for the current month. */
export function getScanUsage(date = new Date()) {
  const key = monthKey(date);
  const raw = read(KEYS.usage, null);
  const count = raw && raw.month === key ? raw.count : 0;
  return {
    month: key,
    count,
    limit: FREE_SCANS_PER_MONTH,
    remaining: Math.max(0, FREE_SCANS_PER_MONTH - count),
    over: count >= FREE_SCANS_PER_MONTH,
  };
}

/** Count one real (non-demo) scan against this month's free allowance. */
export function incrementScanUsage(date = new Date()) {
  const usage = getScanUsage(date);
  write(KEYS.usage, { month: usage.month, count: usage.count + 1 });
  return getScanUsage(date);
}

// ——— Onboarding ———

export function hasOnboarded() {
  return read(KEYS.onboarded, false) === true;
}

export function setOnboarded() {
  write(KEYS.onboarded, true);
}

export function newId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
