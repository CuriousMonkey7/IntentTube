const IT = window.IntentTube;
let state = IT.normalizeState({});
let selectedMode = "study";
let saveTimer = 0;
let statusTimer = 0;

const saveStatus = document.getElementById("save-status");
const defaultMode = document.getElementById("default-mode");
const rememberLast = document.getElementById("remember-last");
const modeTabs = document.getElementById("mode-tabs");
const toggles = document.getElementById("toggles");
const lists = document.getElementById("lists");
const customForm = document.getElementById("custom-form");
const customName = document.getElementById("custom-name");
const deleteCustom = document.getElementById("delete-custom");

IT.getState((next) => {
  state = next;
  selectedMode = state.currentMode === "normal" ? "study" : state.currentMode;
  render();
});

defaultMode.addEventListener("change", () => {
  IT.setState({ currentMode: defaultMode.value, lastMode: defaultMode.value, setupComplete: true }, afterSave);
});

rememberLast.addEventListener("change", () => {
  IT.setState({ rememberLastMode: rememberLast.checked, setupComplete: true }, afterSave);
});

modeTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  selectedMode = button.dataset.mode;
  renderModeEditor();
});

customForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const label = customName.value.trim();
  if (!label) return;
  const customModes = IT.clone(state.customModes);
  const id = `custom-${Date.now()}`;
  customModes.push({ id, label, icon: "spark", keywords: [] });
  const modeSettings = IT.clone(state.modeSettings);
  modeSettings[id] = IT.clone(IT.DEFAULT_CUSTOM_MODE_SETTINGS);
  IT.setState({ customModes, modeSettings, currentMode: id, lastMode: id, setupComplete: true }, (next) => {
    state = next;
    selectedMode = id;
    customName.value = "";
    render();
    showSaved();
  });
});

deleteCustom.addEventListener("click", () => {
  if (!selectedMode.startsWith("custom-")) return;
  const customModes = state.customModes.filter((mode) => mode.id !== selectedMode);
  const modeSettings = IT.clone(state.modeSettings);
  delete modeSettings[selectedMode];
  const nextMode = "study";
  IT.setState({ customModes, modeSettings, currentMode: nextMode, lastMode: nextMode }, (next) => {
    state = next;
    selectedMode = nextMode;
    render();
    showSaved();
  });
});

toggles.addEventListener("change", (event) => {
  const input = event.target.closest("[data-toggle]");
  if (!input) return;
  IT.setModeSetting(selectedMode, input.dataset.toggle, input.checked, afterSave);
});

lists.addEventListener("input", (event) => {
  const field = event.target.closest("[data-list]");
  if (!field) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const modeSettings = IT.clone(state.modeSettings);
    modeSettings[selectedMode][field.dataset.list] = parseList(field.value);
    persistSettings(modeSettings);
  }, 260);
});

function render() {
  defaultMode.innerHTML = IT.getModeIds(state).map((mode) => {
    const label = IT.getModeMeta(mode, state).label;
    return `<option value="${mode}">${label}</option>`;
  }).join("");
  defaultMode.value = state.currentMode;
  rememberLast.checked = state.rememberLastMode;
  modeTabs.innerHTML = IT.getModeIds(state).map((mode) => {
    const meta = IT.getModeMeta(mode, state);
    return `
      <button class="tab ${mode === selectedMode ? "active" : ""}" type="button" data-mode="${mode}">
        ${IT.iconSvg(meta.icon)}
        <span>${meta.label}</span>
      </button>
    `;
  }).join("");
  renderModeEditor();
}

function renderModeEditor() {
  modeTabs.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === selectedMode);
  });
  const settings = state.modeSettings[selectedMode] || IT.DEFAULT_CUSTOM_MODE_SETTINGS;
  deleteCustom.hidden = !selectedMode.startsWith("custom-");
  toggles.innerHTML = [
    ["hideShorts", "Hide Shorts"],
    ["hideComments", "Hide comments"],
    ["hideSidebar", "Hide sidebar"],
    ["disableAutoplay", "Disable autoplay"]
  ].map(([key, label]) => `
    <label class="toggle-row">
      <span>${label}</span>
      <input type="checkbox" data-toggle="${key}" ${settings[key] ? "checked" : ""}>
    </label>
  `).join("");

  lists.innerHTML = [
    ["allowedChannels", "Allowed channels"],
    ["blockedChannels", "Blocked channels"],
    ["allowedKeywords", "Allowed keywords"],
    ["blockedKeywords", "Blocked keywords"]
  ].map(([key, label]) => `
    <label class="field">
      <strong>${label}</strong>
      <span>One item per line.</span>
      <textarea data-list="${key}" spellcheck="false">${escapeHtml(settings[key].join("\n"))}</textarea>
    </label>
  `).join("");
}

function parseList(value) {
  return IT.uniqueList(String(value || "").split(/\n|,/));
}

function persistSettings(modeSettings) {
  IT.setState({ modeSettings, setupComplete: true }, afterSave);
}

function afterSave(next) {
  state = next;
  showSaved();
}

function showSaved() {
  saveStatus.textContent = "Saved";
  saveStatus.style.opacity = "1";
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    saveStatus.style.opacity = "0.68";
  }, 900);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
