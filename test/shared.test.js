const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadIntentTube(initialStore = {}) {
  const store = JSON.parse(JSON.stringify(initialStore));
  const sandbox = {
    window: {},
    chrome: {
      storage: {
        sync: {
          get(defaults, callback) {
            callback(Object.assign({}, JSON.parse(JSON.stringify(defaults)), JSON.parse(JSON.stringify(store))));
          },
          set(next, callback) {
            Object.assign(store, JSON.parse(JSON.stringify(next)));
            if (callback) callback();
          }
        }
      }
    }
  };
  sandbox.window.chrome = sandbox.chrome;
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "shared.js"), "utf8");
  vm.runInNewContext(source, sandbox);
  return { IT: sandbox.window.IntentTube, store };
}

function getState(IT) {
  return new Promise((resolve) => IT.getState(resolve));
}

function setModeSetting(IT, mode, key, value) {
  return new Promise((resolve) => IT.setModeSetting(mode, key, value, resolve));
}

test("mode checkbox settings can be unchecked and stay false", async () => {
  const { IT } = loadIntentTube({ currentMode: "study" });

  let state = await getState(IT);
  assert.equal(state.modeSettings.study.hideShorts, true);

  state = await setModeSetting(IT, "study", "hideShorts", false);
  assert.equal(state.modeSettings.study.hideShorts, false);

  state = await getState(IT);
  assert.equal(state.modeSettings.study.hideShorts, false);
});

test("mode checkbox settings can be checked again", async () => {
  const { IT } = loadIntentTube({
    currentMode: "study",
    modeSettings: {
      study: {
        hideShorts: false,
        hideComments: true,
        hideSidebar: true,
        disableAutoplay: true
      }
    }
  });

  const state = await setModeSetting(IT, "study", "hideShorts", true);
  assert.equal(state.modeSettings.study.hideShorts, true);
});

test("custom mode checkbox settings can be unchecked", async () => {
  const { IT } = loadIntentTube({
    currentMode: "custom-deep-work",
    customModes: [{ id: "custom-deep-work", label: "Deep Work", keywords: ["lecture"] }],
    modeSettings: {
      "custom-deep-work": {
        hideShorts: true,
        hideComments: true,
        hideSidebar: false,
        disableAutoplay: true
      }
    }
  });

  const state = await setModeSetting(IT, "custom-deep-work", "disableAutoplay", false);
  assert.equal(state.modeSettings["custom-deep-work"].disableAutoplay, false);
});

test("normalization preserves explicit false values", async () => {
  const { IT } = loadIntentTube({
    modeSettings: {
      study: {
        hideShorts: false,
        hideComments: false,
        hideSidebar: false,
        disableAutoplay: false
      }
    }
  });

  const state = await getState(IT);
  assert.equal(state.modeSettings.study.hideShorts, false);
  assert.equal(state.modeSettings.study.hideComments, false);
  assert.equal(state.modeSettings.study.hideSidebar, false);
  assert.equal(state.modeSettings.study.disableAutoplay, false);
});
