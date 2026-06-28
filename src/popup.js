const IT = window.IntentTube;
let state = IT.normalizeState({});

const currentMode = document.getElementById("current-mode");
const modeList = document.getElementById("mode-list");
const paused = document.getElementById("paused");
const rememberLast = document.getElementById("remember-last");
const modeToggles = document.getElementById("mode-toggles");
const openOptions = document.getElementById("open-options");

openOptions.innerHTML = IT.iconSvg("settings");
openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

modeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  IT.setMode(button.dataset.mode, (next) => {
    state = next;
    render();
  });
});

paused.addEventListener("change", () => {
  IT.setState({ paused: paused.checked }, (next) => {
    state = next;
    render();
  });
});

rememberLast.addEventListener("change", () => {
  IT.setState({ rememberLastMode: rememberLast.checked }, (next) => {
    state = next;
    render();
  });
});

modeToggles.addEventListener("change", (event) => {
  const input = event.target.closest("[data-toggle]");
  if (!input) return;
  IT.setModeSetting(state.currentMode, input.dataset.toggle, input.checked, (next) => {
    state = next;
    render();
  });
});

IT.getState((next) => {
  state = next;
  render();
});

function render() {
  const mode = state.currentMode;
  currentMode.textContent = IT.getModeMeta(mode, state).label;
  paused.checked = state.paused;
  rememberLast.checked = state.rememberLastMode;
  modeList.innerHTML = IT.getModeIds(state).map((item) => {
    const meta = IT.getModeMeta(item, state);
    return `
      <button class="mode-button ${item === mode ? "active" : ""}" type="button" data-mode="${item}" aria-label="${meta.label}">
        ${IT.iconSvg(meta.icon)}
        <span>${meta.label}</span>
      </button>
    `;
  }).join("");

  const settings = state.modeSettings[mode] || IT.DEFAULT_CUSTOM_MODE_SETTINGS;
  modeToggles.innerHTML = [
    ["hideShorts", "Hide Shorts"],
    ["hideComments", "Hide comments"],
    ["hideSidebar", "Hide sidebar"],
    ["disableAutoplay", "Disable autoplay"]
  ].map(([key, label]) => `
    <label class="switch-row">
      <span>${label}</span>
      <input type="checkbox" data-toggle="${key}" ${settings[key] ? "checked" : ""}>
    </label>
  `).join("");
}
