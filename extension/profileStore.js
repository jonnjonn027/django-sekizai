const profileStore = (() => {
  const STORAGE_KEY = 'profiles';
  const VERSION_KEY = 'profileStoreVersion';
  const CURRENT_VERSION = 1;

  const storageGet = (keys) =>
    new Promise((resolve) => chrome.storage.local.get(keys, resolve));

  const storageSet = (values) =>
    new Promise((resolve) => chrome.storage.local.set(values, resolve));

  const ensureArray = (profiles) => {
    if (!profiles) {
      return [];
    }
    if (Array.isArray(profiles)) {
      return profiles;
    }
    if (typeof profiles === 'object') {
      return Object.values(profiles);
    }
    return [];
  };

  const normalizeProfile = (profile) => ({
    id: profile.id,
    name: profile.name ?? '',
    source: profile.source ?? '',
    notes: profile.notes ?? '',
    full_text: profile.full_text ?? '',
  });

  const migrateProfiles = async () => {
    const stored = await storageGet([VERSION_KEY, STORAGE_KEY]);
    const version = Number.isInteger(stored[VERSION_KEY])
      ? stored[VERSION_KEY]
      : 0;
    let profiles = ensureArray(stored[STORAGE_KEY]);

    if (version < 1) {
      profiles = profiles.map((profile) => normalizeProfile(profile));
    }

    if (version !== CURRENT_VERSION) {
      await storageSet({
        [VERSION_KEY]: CURRENT_VERSION,
        [STORAGE_KEY]: profiles,
      });
    }

    return profiles;
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `profile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const init = async () => {
    await migrateProfiles();
  };

  const getProfiles = async () => {
    const stored = await storageGet([STORAGE_KEY]);
    return ensureArray(stored[STORAGE_KEY]).map((profile) =>
      normalizeProfile(profile)
    );
  };

  const getProfileById = async (id) => {
    if (!id) {
      return null;
    }
    const profiles = await getProfiles();
    return profiles.find((profile) => profile.id === id) ?? null;
  };

  const saveProfile = async (profile) => {
    const profiles = await getProfiles();
    const normalized = normalizeProfile({
      ...profile,
      id: profile.id || generateId(),
    });
    const existingIndex = profiles.findIndex(
      (item) => item.id === normalized.id
    );

    if (existingIndex >= 0) {
      profiles[existingIndex] = normalized;
    } else {
      profiles.unshift(normalized);
    }

    await storageSet({ [STORAGE_KEY]: profiles });
    return normalized;
  };

  const searchProfiles = async (query) => {
    const profiles = await getProfiles();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return profiles;
    }
    return profiles.filter((profile) =>
      [profile.name, profile.source, profile.notes]
        .join(' ')
        .toLowerCase()
        .includes(trimmed)
    );
  };

  return {
    init,
    getProfiles,
    getProfileById,
    saveProfile,
    searchProfiles,
  };
})();

if (typeof window !== 'undefined') {
  window.profileStore = profileStore;
}

if (typeof self !== 'undefined') {
  self.profileStore = profileStore;
}
