# IntentTube

Open YouTube with intention.

IntentTube is a Chrome extension that asks what mood you are in before YouTube recommendations become usable. Pick Study, Work, Chill, Music, Normal, or a custom mood, and IntentTube locally filters the page so YouTube better matches why you opened it.

## Repo Description

Chrome extension that asks for your YouTube intent before showing recommendations, with Study, Work, Chill, Music, Normal, and custom modes.

## Why

YouTube is useful for learning, work, music, and relaxing, but the same recommendation feed can pull you in the wrong direction. IntentTube adds a small intent checkpoint before the feed appears, helping you choose the kind of YouTube session you actually want.

## Features

- Mood chooser appears before YouTube content becomes usable.
- Built-in modes: Study, Work, Chill, Music, and Normal.
- Custom moods with their own allow/block lists.
- Local rule-based filtering for visible YouTube video cards.
- Shorts hiding, including Shorts shown in search results.
- Per-mode controls for:
  - Hide Shorts
  - Hide comments
  - Hide sidebar recommendations
  - Disable autoplay
- Popup for quick mode switching.
- Options page for channels, keywords, custom moods, and defaults.
- No external API calls.

## Install for Development

1. Clone this repo.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the repo folder.
6. Open `https://www.youtube.com`.

After changing files, reload the unpacked extension from `chrome://extensions` and refresh YouTube.

## Testing

This repo includes a small Node test suite for shared state and settings behavior.

```bash
npm test
```

Syntax checks can be run with:

```bash
node --check src/shared.js
node --check src/content.js
node --check src/popup.js
node --check src/options.js
node --check src/background.js
```

## Privacy

IntentTube runs locally in your browser. It does not send your YouTube activity, settings, moods, keywords, or channel lists to any server.

Settings are stored with Chrome extension storage.

## Limitations

- Filtering is best-effort because YouTube frequently changes its page structure.
- IntentTube filters what is visible on the page; it does not change YouTube's recommendation algorithm.
- Normal mode leaves YouTube unfiltered.

## Status

Early public MVP. The core experience is working, but feedback and fixes are welcome.

## License

MIT
