(function () {
  const IT = window.IntentTube;
  const VIDEO_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-reel-item-renderer",
    "ytm-rich-item-renderer",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer",
    "yt-lockup-view-model"
  ].join(",");

  const SECTION_SELECTORS = [
    "ytd-rich-grid-renderer",
    "ytd-section-list-renderer",
    "ytd-item-section-renderer",
    "ytd-watch-next-secondary-results-renderer",
    "ytm-rich-grid-renderer",
    "ytm-section-list-renderer"
  ].join(",");

  let state = IT.normalizeState({});
  let observer = null;
  let filterTimer = 0;
  let currentUrl = location.href;

  document.documentElement.classList.add("intenttube-gated");

  IT.getState((saved) => {
    state = saved;
    injectGate();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    IT.getState((next) => {
      state = next;
      applyCurrentState();
    });
  });

  function onReady(callback) {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function injectGate() {
    onReady(() => {
      if (document.getElementById("intenttube-gate")) return;
      const gate = document.createElement("div");
      gate.id = "intenttube-gate";
      gate.setAttribute("role", "dialog");
      gate.setAttribute("aria-modal", "true");
      gate.innerHTML = `
        <section class="intenttube-gate-card" aria-labelledby="intenttube-gate-title">
          <h1 class="intenttube-gate-title" id="intenttube-gate-title">What are you here for?</h1>
          <div class="intenttube-mode-grid">
            ${IT.getModeIds(state).map(modeButtonHtml).join("")}
          </div>
          <div class="intenttube-gate-footer">
            <span class="intenttube-muted">IntentTube filters this page locally.</span>
            ${state.lastMode ? `<button class="intenttube-chip" type="button" data-use-last>Use ${IT.getModeMeta(state.lastMode, state).label}</button>` : ""}
          </div>
        </section>
      `;
      gate.addEventListener("click", (event) => {
        const modeButton = event.target.closest("[data-mode]");
        if (modeButton) chooseMode(modeButton.dataset.mode);
        if (event.target.closest("[data-use-last]")) chooseMode(state.lastMode);
      });
      document.body.appendChild(gate);
      const firstButton = gate.querySelector("[data-mode]");
      if (firstButton) firstButton.focus();
    });
  }

  function modeButtonHtml(mode) {
    const meta = IT.getModeMeta(mode, state);
    return `
      <button class="intenttube-mode-button" type="button" data-mode="${mode}" aria-label="${meta.label}">
        ${IT.iconSvg(meta.icon)}
        <span>${meta.label}</span>
      </button>
    `;
  }

  function chooseMode(mode, options) {
    IT.setMode(mode, (next) => {
      state = next;
      applyCurrentState({ keepGate: true, immediate: true });
      closeGate(options || {});
    });
  }

  function closeGate(options) {
    document.documentElement.classList.remove("intenttube-gated");
    const gate = document.getElementById("intenttube-gate");
    if (!gate) return;
    if (options.skipAnimation) {
      gate.remove();
      return;
    }
    gate.classList.add("intenttube-fade-out");
    window.setTimeout(() => gate.remove(), 180);
  }

  function applyCurrentState(options) {
    const opts = options || {};
    ensureObserver();
    setStatusPill();
    setRootFlags();
    applyAutoplay();
    if (opts.immediate) {
      filterVisibleVideos();
    } else {
      scheduleFilter();
    }
    if (!opts.keepGate) closeGate({ skipAnimation: true });
  }

  function ensureObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        clearPlaceholders();
      }
      scheduleFilter();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function setStatusPill() {
    onReady(() => {
      let pill = document.querySelector(".intenttube-status-pill");
      if (state.paused || state.currentMode === "normal") {
        if (pill) pill.remove();
        return;
      }
      if (!pill) {
        pill = document.createElement("div");
        pill.className = "intenttube-status-pill";
        document.body.appendChild(pill);
      }
      const meta = IT.getModeMeta(state.currentMode, state);
      pill.innerHTML = `${IT.iconSvg(meta.icon)} <span>${meta.label} filtering active</span>`;
    });
  }

  function setRootFlags() {
    const settings = getModeSettings();
    const inactive = state.paused || state.currentMode === "normal";
    document.documentElement.classList.toggle("intenttube-filter-active", !inactive);
    toggleSelector("ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], ytd-mini-guide-entry-renderer[aria-label='Shorts'], a[title='Shorts']", !inactive && settings.hideShorts);
    toggleSelector("ytd-comments, ytd-comments-entry-point-header-renderer, ytm-comment-section-renderer", !inactive && settings.hideComments);
    toggleSelector("#secondary, ytd-watch-next-secondary-results-renderer", !inactive && settings.hideSidebar);
  }

  function toggleSelector(selector, hide) {
    document.querySelectorAll(selector).forEach((node) => {
      node.classList.toggle("intenttube-hidden", hide);
    });
  }

  function applyAutoplay() {
    if (state.paused || state.currentMode === "normal") return;
    if (!getModeSettings().disableAutoplay) return;
    const toggles = document.querySelectorAll("button[aria-label*='Autoplay'], tp-yt-paper-toggle-button[aria-label*='Autoplay']");
    toggles.forEach((toggle) => {
      const pressed = toggle.getAttribute("aria-pressed");
      const checked = toggle.getAttribute("aria-checked");
      if (pressed === "true" || checked === "true" || toggle.classList.contains("checked")) {
        toggle.click();
      }
    });
  }

  function scheduleFilter() {
    window.clearTimeout(filterTimer);
    filterTimer = window.setTimeout(filterVisibleVideos, 120);
  }

  function filterVisibleVideos() {
    if (!document.body) return;
    const inactive = state.paused || state.currentMode === "normal";
    const cards = Array.from(document.querySelectorAll(VIDEO_SELECTORS));
    cards.forEach((card) => {
      if (inactive) {
        card.classList.remove("intenttube-collapsed");
        card.classList.remove("intenttube-checked");
        return;
      }
      const shouldHideShort = getModeSettings().hideShorts && isShortsCard(card);
      card.classList.toggle("intenttube-collapsed", shouldHideShort || !matchesMode(card));
      card.classList.add("intenttube-checked");
    });
    if (inactive || !getModeSettings().hideShorts) {
      restoreShortsLinkCards();
    } else {
      hideShortsLinkCards();
    }
    setRootFlags();
    applyAutoplay();
    updatePlaceholders();
  }

  function matchesMode(card) {
    const mode = state.currentMode;
    const settings = getModeSettings();
    const title = getTitle(card);
    const channel = getChannel(card);
    const haystack = `${title} ${channel} ${card.innerText || ""}`.toLowerCase();

    if (containsAny(channel, settings.blockedChannels)) return false;
    if (containsAny(haystack, settings.blockedKeywords)) return false;
    if (settings.allowedChannels.length && containsAny(channel, settings.allowedChannels)) return true;
    if (settings.allowedKeywords.length && containsAny(haystack, settings.allowedKeywords)) return true;

    if (mode === "chill") return true;
    if (mode === "normal") return true;

    return containsAny(haystack, IT.getModeMeta(mode, state).keywords);
  }

  function getModeSettings() {
    return state.modeSettings[state.currentMode] || IT.DEFAULT_MODE_SETTINGS.normal;
  }

  function getTitle(card) {
    const titleNode = card.querySelector("#video-title, h3, .media-item-headline, yt-formatted-string[aria-label]");
    return (titleNode && (titleNode.getAttribute("title") || titleNode.getAttribute("aria-label") || titleNode.textContent) || "").trim();
  }

  function getChannel(card) {
    const channelNode = card.querySelector("#channel-name, ytd-channel-name, .ytm-badge-and-byline-item-byline, .subhead");
    return (channelNode && channelNode.textContent || "").trim().toLowerCase();
  }

  function containsAny(text, needles) {
    const normalized = String(text || "").toLowerCase();
    return (needles || []).some((needle) => normalized.includes(String(needle).toLowerCase()));
  }

  function isShortsCard(card) {
    const text = String(card.innerText || "").toLowerCase();
    const hrefs = Array.from(card.querySelectorAll("a[href]")).map((link) => link.getAttribute("href") || "");
    return hrefs.some((href) => href.includes("/shorts/")) || /\bshorts\b/.test(text);
  }

  function hideShortsLinkCards() {
    document.querySelectorAll('a[href*="/shorts/"]').forEach((link) => {
      const card = link.closest(`${VIDEO_SELECTORS}, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-item-section-renderer`);
      if (card) card.classList.add("intenttube-collapsed");
    });
  }

  function restoreShortsLinkCards() {
    document.querySelectorAll('a[href*="/shorts/"]').forEach((link) => {
      const card = link.closest(`${VIDEO_SELECTORS}, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-item-section-renderer`);
      if (card) card.classList.remove("intenttube-collapsed");
    });
  }

  function updatePlaceholders() {
    clearPlaceholders();
    if (state.paused || state.currentMode === "normal") return;
    document.querySelectorAll(SECTION_SELECTORS).forEach((section) => {
      const cards = Array.from(section.querySelectorAll(VIDEO_SELECTORS));
      if (cards.length < 3) return;
      const visible = cards.some((card) => !card.classList.contains("intenttube-collapsed"));
      if (visible) return;
      section.appendChild(createPlaceholder());
    });
  }

  function clearPlaceholders() {
    document.querySelectorAll(".intenttube-placeholder").forEach((placeholder) => placeholder.remove());
  }

  function createPlaceholder() {
    const meta = IT.getModeMeta(state.currentMode, state);
    const wrapper = document.createElement("div");
    wrapper.className = "intenttube-placeholder";
    wrapper.innerHTML = `
      <div class="intenttube-placeholder-row">
        <div>
          <strong>No matching videos here</strong>
          <span class="intenttube-muted">${meta.label} mode is filtering this section.</span>
        </div>
        <div class="intenttube-placeholder-actions">
          <a class="intenttube-link-button" href="/results?search_query=">Search</a>
          <a class="intenttube-link-button" href="/feed/subscriptions">Subscriptions</a>
          <button class="intenttube-link-button" type="button" data-intenttube-switch>Switch mode</button>
        </div>
      </div>
    `;
    wrapper.querySelector("[data-intenttube-switch]").addEventListener("click", () => {
      document.documentElement.classList.add("intenttube-gated");
      injectGate();
    });
    return wrapper;
  }
})();
