(function () {
  const MODE_ORDER = ["study", "work", "chill", "music", "normal"];

  const MODE_META = {
    study: {
      label: "Study",
      icon: "book",
      keywords: [
        "study",
        "learn",
        "lecture",
        "course",
        "tutorial",
        "explained",
        "education",
        "science",
        "math",
        "history",
        "programming",
        "coding",
        "documentary"
      ]
    },
    work: {
      label: "Work",
      icon: "briefcase",
      keywords: [
        "productivity",
        "research",
        "business",
        "startup",
        "design",
        "engineering",
        "programming",
        "coding",
        "tutorial",
        "documentation",
        "conference",
        "interview"
      ]
    },
    chill: {
      label: "Chill",
      icon: "play",
      keywords: []
    },
    music: {
      label: "Music",
      icon: "music",
      keywords: [
        "music",
        "song",
        "album",
        "playlist",
        "mix",
        "lofi",
        "live",
        "concert",
        "lyrics",
        "instrumental",
        "soundtrack"
      ]
    },
    normal: {
      label: "Normal",
      icon: "youtube",
      keywords: []
    }
  };

  const DEFAULT_MODE_SETTINGS = {
    study: {
      hideShorts: true,
      hideComments: true,
      hideSidebar: true,
      disableAutoplay: true,
      allowedChannels: [],
      blockedChannels: [],
      allowedKeywords: [],
      blockedKeywords: []
    },
    work: {
      hideShorts: true,
      hideComments: true,
      hideSidebar: false,
      disableAutoplay: true,
      allowedChannels: [],
      blockedChannels: [],
      allowedKeywords: [],
      blockedKeywords: []
    },
    chill: {
      hideShorts: false,
      hideComments: false,
      hideSidebar: false,
      disableAutoplay: false,
      allowedChannels: [],
      blockedChannels: [],
      allowedKeywords: [],
      blockedKeywords: []
    },
    music: {
      hideShorts: true,
      hideComments: true,
      hideSidebar: false,
      disableAutoplay: false,
      allowedChannels: [],
      blockedChannels: [],
      allowedKeywords: [],
      blockedKeywords: []
    },
    normal: {
      hideShorts: false,
      hideComments: false,
      hideSidebar: false,
      disableAutoplay: false,
      allowedChannels: [],
      blockedChannels: [],
      allowedKeywords: [],
      blockedKeywords: []
    }
  };

  const DEFAULT_CUSTOM_MODE_SETTINGS = {
    hideShorts: true,
    hideComments: true,
    hideSidebar: false,
    disableAutoplay: true,
    allowedChannels: [],
    blockedChannels: [],
    allowedKeywords: [],
    blockedKeywords: []
  };

  const DEFAULT_STATE = {
    currentMode: "normal",
    lastMode: "",
    rememberLastMode: false,
    paused: false,
    setupComplete: false,
    customModes: [],
    modeSettings: DEFAULT_MODE_SETTINGS
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueList(values) {
    const seen = new Set();
    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizeCustomModes(customModes) {
    const seen = new Set();
    return (customModes || [])
      .map((mode) => {
        const id = String(mode && mode.id || "").trim();
        const label = String(mode && mode.label || "").trim();
        if (!id || !label || seen.has(id) || MODE_ORDER.includes(id)) return null;
        seen.add(id);
        return {
          id,
          label,
          icon: "spark",
          keywords: uniqueList(mode.keywords || [])
        };
      })
      .filter(Boolean);
  }

  function getModeIds(state) {
    return MODE_ORDER.concat(normalizeCustomModes(state && state.customModes).map((mode) => mode.id));
  }

  function getModeMeta(mode, state) {
    if (MODE_META[mode]) return MODE_META[mode];
    const custom = normalizeCustomModes(state && state.customModes).find((item) => item.id === mode);
    if (custom) {
      return {
        label: custom.label,
        icon: custom.icon,
        keywords: custom.keywords
      };
    }
    return MODE_META.normal;
  }

  function mergeSettings(savedSettings, customModes) {
    const merged = clone(DEFAULT_MODE_SETTINGS);
    const source = savedSettings || {};
    MODE_ORDER.forEach((mode) => {
      merged[mode] = Object.assign({}, merged[mode], source[mode] || {});
    });
    normalizeCustomModes(customModes).forEach((mode) => {
      merged[mode.id] = Object.assign({}, DEFAULT_CUSTOM_MODE_SETTINGS, source[mode.id] || {});
    });
    Object.keys(source).forEach((mode) => {
      if (!merged[mode] && mode.indexOf("custom-") === 0) {
        merged[mode] = Object.assign({}, DEFAULT_CUSTOM_MODE_SETTINGS, source[mode] || {});
      }
    });
    Object.keys(merged).forEach((mode) => {
      ["allowedChannels", "blockedChannels", "allowedKeywords", "blockedKeywords"].forEach((key) => {
        merged[mode][key] = uniqueList(merged[mode][key] || []);
      });
    });
    return merged;
  }

  function normalizeState(saved) {
    const state = Object.assign({}, clone(DEFAULT_STATE), saved || {});
    state.customModes = normalizeCustomModes(state.customModes);
    const modeIds = getModeIds(state);
    if (!modeIds.includes(state.currentMode)) state.currentMode = "normal";
    if (state.lastMode && !modeIds.includes(state.lastMode)) state.lastMode = "";
    state.modeSettings = mergeSettings(state.modeSettings, state.customModes);
    return state;
  }

  function getState(callback) {
    chrome.storage.sync.get(DEFAULT_STATE, (saved) => {
      callback(normalizeState(saved));
    });
  }

  function setState(patch, callback) {
    chrome.storage.sync.get(DEFAULT_STATE, (saved) => {
      const next = normalizeState(Object.assign({}, saved, patch));
      chrome.storage.sync.set(next, () => {
        if (callback) callback(next);
      });
    });
  }

  function setMode(mode, callback) {
    getState((state) => {
      if (!getModeIds(state).includes(mode)) return;
      setState({ currentMode: mode, lastMode: mode }, callback);
    });
  }

  function setModeSetting(mode, key, value, callback) {
    getState((state) => {
      if (!getModeIds(state).includes(mode)) return;
      const modeSettings = clone(state.modeSettings);
      const defaults = mode.indexOf("custom-") === 0 ? DEFAULT_CUSTOM_MODE_SETTINGS : DEFAULT_MODE_SETTINGS[mode];
      modeSettings[mode] = Object.assign({}, defaults || DEFAULT_CUSTOM_MODE_SETTINGS, modeSettings[mode] || {});
      modeSettings[mode][key] = value;
      setState({ modeSettings }, callback);
    });
  }

  function iconSvg(name) {
    const attrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const paths = {
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/>',
      briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/>',
      play: '<path d="M8 5v14l11-7z"/>',
      music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      youtube: '<path d="M22 12s0-3.5-.45-5.1a2.8 2.8 0 0 0-2-2C17.9 4.5 12 4.5 12 4.5s-5.9 0-7.55.4a2.8 2.8 0 0 0-2 2C2 8.5 2 12 2 12s0 3.5.45 5.1a2.8 2.8 0 0 0 2 2c1.65.4 7.55.4 7.55.4s5.9 0 7.55-.4a2.8 2.8 0 0 0 2-2C22 15.5 22 12 22 12z"/><path d="m10 15 5-3-5-3z"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .35 1.85l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.85.35l-.05.05A2 2 0 1 1 3.47 16.8l.05-.05A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.35-1.85l-.05-.05A2 2 0 1 1 6.2 3.47l.05.05A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.85-.35l.05-.05A2 2 0 1 1 19.53 6.2l-.05.05A1.7 1.7 0 0 0 19.4 8c.22.38.44.73.6 1 .28.4.67.6 1.1.6H22a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.1.4c-.28.27-.48.6-.6 1z"/>',
      spark: '<path d="M12 2 14.8 9.2 22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/>'
    };
    return `<svg ${attrs}>${paths[name] || paths.play}</svg>`;
  }

  window.IntentTube = {
    MODE_ORDER,
    MODE_META,
    DEFAULT_MODE_SETTINGS,
    DEFAULT_CUSTOM_MODE_SETTINGS,
    DEFAULT_STATE,
    clone,
    uniqueList,
    getModeIds,
    getModeMeta,
    normalizeState,
    getState,
    setState,
    setMode,
    setModeSetting,
    iconSvg
  };
})();
