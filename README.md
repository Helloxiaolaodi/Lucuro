<a id="readme-top"></a>

# Lucuro - 鹿客司南

Stay lucky, stay curious. 指引数字世界的琉璃司南。

极简开箱的纯前端浏览器起始页。搭载毛玻璃古典美学、自定义每日语录与随身手记，无缝跨屏同步，为你指引数字世界的探索之旅。

**GitHub:** [https://github.com/Helloxiaolaodi/Lucuro](https://github.com/Helloxiaolaodi/Lucuro)

Language: **English** | [简体中文](./README.zh-CN.md) | [Issues](https://github.com/Helloxiaolaodi/Lucuro/issues)

Detailed build guide: see the deployment notes under `docs/` and the browser store publishing checklist below.

Stack: Vue 3 | Vite | Vue I18n | lucide-vue-next | SortableJS | webextension-polyfill | Cloudflare Workers | rollup-plugin-visualizer

![License](https://img.shields.io/github/license/Helloxiaolaodi/Lucuro?style=flat-square)
![Stars](https://img.shields.io/github/stars/Helloxiaolaodi/Lucuro?style=flat-square)
![Forks](https://img.shields.io/github/forks/Helloxiaolaodi/Lucuro?style=flat-square)
![Issues](https://img.shields.io/github/issues/Helloxiaolaodi/Lucuro?style=flat-square)
![Vue](https://img.shields.io/badge/Vue-3.5.13-42B883?style=flat-square&logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0.5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-V3-black?style=flat-square)

## Contents

1. [Overview](#overview)
2. [What Lucuro Includes](#what-lucuro-includes)
3. [Architecture and Sync Model](#architecture-and-sync-model)
4. [Quick Start](#quick-start)
5. [Data and Sync Workflows](#data-and-sync-workflows)
6. [Bookmark Import and Popup Workflows](#bookmark-import-and-popup-workflows)
7. [Maintenance Notes](#maintenance-notes)
8. [Tech Stack and References](#tech-stack-and-references)
9. [Security Considerations](#security-considerations)
10. [Acknowledgements](#acknowledgements)
11. [License](#license)


- The default theme is a light glassmorphism gradient; deep dark mode uses a indigo/night palette.
- The custom daily quote is now a "一言" feature that users can edit from settings.
- Pocket notes support Markdown input with debounced auto-save.
- Local snapshot history keeps up to eight restore points.
- Optional Chrome bookmark import reads the browser bookmark tree without uploading data.
- The toolbar popup can add the current page and toggle the new tab override.
- Native sync uses `chrome.storage.sync` with a `chrome.storage.local` fallback.
- Pickup-code sharing uses a temporary Cloudflare Worker and a 6-digit code that expires after 10 minutes.
- Overseas support uses Ko-fi; domestic support uses the WeChat QR code shipped with the extension.
- `rollup-plugin-visualizer` writes `stats.html` after every build for bundle size review.

## Overview

Lucuro is a Manifest V3 browser extension built with Vue 3. It replaces the browser new tab page with a personal navigation workbench and provides a compact toolbar popup for quick capture and settings.

- **New Tab Dashboard**: sidebar categories, search box, recommended cards, year/day progress, draggable link grid, custom quote, and pocket notes.
- **Toolbar Popup**: add the current page to a selected category, toggle the new tab override, and open settings.
- **Settings**: theme, glass blur, quote text, search engine, layout lock, sync, bookmark import, and support.
- **Local Data**: links, settings, click statistics, and snapshot history are stored in browser extension storage.
- **Sync**: browser-managed native sync for personal devices, plus an ephemeral pickup code for cross-account or cross-browser transfers.
- **Privacy**: core usage requires no account, analytics, or telemetry; outbound requests only happen when the user triggers a pickup-code share.

The wuxia-inspired glass look is the default skin, not a hard constraint. Users can customize quotes, links, theme, and layout without changing code.

### Preview Media

Store listing screenshots are maintained separately from the extension source. The dashboard background and profile avatar are user-configurable, so no repository media files are required to run the extension.

## What Lucuro Includes

### End-user capabilities

#### Search & Discovery

- Search bookmarks or enter a search command from the center search box.
- Switch search engines from the settings panel.
- See recommended cards based on local click frequency.
- Use keyboard shortcuts such as `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+L`, `Ctrl/Cmd+Shift+N`, and `Ctrl/Cmd+Shift+Q`.

#### Visual Layout

- Organize links into sidebar categories.
- Drag cards into a custom order with SortableJS.
- Enable layout lock to prevent accidental drag changes.
- Sort by default, frequency, alphabetical order, or added time.
- Add, edit, and remove categories and cards from the local editor.
- Adjust glass blur and switch between light and dark themes.

#### Quote & Notes

- Show a custom daily quote, or "一言", from the settings panel.
- Refresh the displayed quote with one click.
- Write pocket notes with Markdown formatting.
- Notes auto-save after a short debounce.

#### Progress & Focus

- View year and day progress bars on the dashboard.
- Keep the dashboard light so it opens almost instantly in a new tab.
- Store all personal data locally instead of depending on a remote account.

#### Sync & Backup

- Use browser-native `chrome.storage.sync` for personal multi-device sync.
- Create local snapshot history with up to eight restore points.
- Share a full configuration snapshot with another account or browser using a 6-digit pickup code.
- Manually force a push or pull from the settings panel when needed.

#### Popup & Browser Integration

- Add the current page to Lucuro from the toolbar popup.
- Toggle whether Lucuro owns the new tab.
- When the override is disabled, the extension redirects to a blank new tab page.
- Optionally import the Chrome bookmark tree after granting the `bookmarks` optional permission.

### For fork users

- The core is pure frontend and local-first, so it can be packaged for Chrome, Edge, and Firefox.
- The permission surface is intentionally small: `storage`, `unlimitedStorage`, `activeTab`, and optional `bookmarks`.
- The only external host is the optional Worker domain used for pickup-code sharing.
- Data structure and settings are generic enough to support new themes, quote sources, and navigation layouts.

## Architecture and Sync Model

Lucuro separates three concerns:

- Local data in browser extension storage
- Browser-managed native sync through `chrome.storage.sync`
- Optional ephemeral sharing through a Cloudflare Worker + KV

Recommended production layout:

1. Build the extension with `npm run build`
2. Load the unpacked `dist/` folder for local testing
3. Package `dist/` for Chrome Web Store, Microsoft Edge Add-ons, or Firefox AMO
4. Deploy the pickup-code Worker only when cross-account sharing is required

### Current sync strategy

- Native sync is browser-managed and requires the same browser account on multiple devices.
- Writes are debounced to avoid quota churn.
- If sync is unavailable, the extension falls back to local storage.
- Pickup-code sharing uses `POST /api/share` and `GET /api/share/:code`.
- Codes are six digits and expire after 10 minutes.
- The default Worker endpoint is `https://lucuro-share.helloxiaolaodi.workers.dev`.
- Favicon CDN URLs keep icon payloads out of storage, so configuration remains small enough for native sync.

## Quick Start

### 1. Install

```bash
git clone https://github.com/Helloxiaolaodi/Lucuro.git
cd Lucuro
npm install
```

### 2. Run locally

```bash
npm run dev
```

For extension testing, open `chrome://extensions/`, enable Developer mode, and load the built extension folder.

### 3. Build for production

```bash
npm run build
```

The build writes `dist/index.html`, `dist/popup.html`, `dist/blank.html`, `dist/manifest.json`, `dist/assets/`, and `dist/icons/`. It also writes `stats.html` with gzip and brotli sizes for bundle analysis.

### 4. Package for a browser store

```bash
npm run build
```

Zip only the files inside `dist/`, with `manifest.json` at the zip root. Verify:

- `manifest_version` is `3`
- `chrome_url_overrides.newtab` points to `index.html`
- `action.default_popup` points to `popup.html`
- `icons` includes 16, 32, 48, and 128 pixel PNG assets
- `permissions` are limited to `storage`, `unlimitedStorage`, and `activeTab`
- `optional_permissions` includes only `bookmarks`
- `host_permissions` is limited to the Worker domain

### 5. Publish

1. Upload the ZIP to Chrome Web Store and fill in the store listing, privacy policy, screenshots, and icon.
2. Upload the same ZIP to Microsoft Edge Add-ons.
3. For Firefox, verify the `browser_specific_settings` gecko ID and submit through Firefox Add-ons.
4. If the store rejects the package, inspect `stats.html`, manifest validity, icon sizes, and permission declarations before resubmitting.

## Data and Sync Workflows

### Where data is stored

The extension uses these storage keys:

- `lucuro_links_v1`: link tree, categories, cards, icons, and ordering
- `lucuro_settings_v1`: theme, quote, engine, layout lock, and preferences
- `lucuro_stats_v1`: click frequency for recommended cards
- `lucuro_history_v1`: bounded local snapshot history, maximum eight entries

Data is plain JSON and does not contain image payloads.

### Native sync

Native sync is the default personal-device flow:

1. The user signs into the same browser account on multiple devices.
2. Lucuro writes debounced configuration changes to `chrome.storage.sync`.
3. The browser handles background synchronization.
4. If sync is unavailable, Lucuro falls back to local storage.

Users can force a push or pull from settings when automatic sync is delayed.

### Pickup-code sharing

Pickup-code sharing is for cross-account or cross-browser transfers:

1. The sending device posts a configuration snapshot to the Worker.
2. The Worker stores the payload under a random 6-digit code with a 10-minute TTL.
3. The receiving device enters the code.
4. The receiving device fetches the payload and applies it locally.

The Worker stores only temporary payloads and does not retain user accounts or long-term history.

### Snapshot history

- Snapshots are local and bounded.
- Restore only overwrites the selected data scope.
- Settings can be preserved when intended.
- Restore is tested as a real user workflow, not an optional utility.

## Bookmark Import and Popup Workflows

### Bookmark import

Bookmark import is optional:

1. The user grants the `bookmarks` optional permission from settings.
2. Lucuro calls `chrome.bookmarks.getTree()`.
3. The bookmark tree is converted into Lucuro categories and cards.
4. The user reviews the result before saving.

No bookmark data leaves the browser during this flow.

### Popup

The toolbar popup provides:

- Add current page
- Select the target category
- Toggle the new tab override
- Open settings

The popup and the new tab page share the same storage keys.

## Maintenance Notes

### Repository structure

- `index.html`: new tab page HTML entry
- `popup.html`: toolbar popup HTML entry
- `src/`: Vue components, stores, utilities, styles, and locales
- `public/`: manifest, static assets, icons, blank page, profile image, and WeChat QR code
- `worker/`: optional pickup-code Worker template
- `docs/`: deployment and maintenance notes

### Minimal files to keep

Keep these for the current feature set:

- `src/`
- `index.html`
- `popup.html`
- `public/manifest.json`
- `public/icons/`
- `public/blank.html`
- `public/qrcode-wechat.png`
- `vite.config.js`
- `package.json`

Default favicon assets that are not used by a deployment can be removed.

### Build and bundle analysis

Run:

```bash
npm run build
```

Then check `stats.html` to see gzip and brotli sizes. If a dependency or component grows unexpectedly, refactor or lazy-load it before shipping.

### Validation

Recommended checks before push:

```bash
npm run build
```

Verify the new tab page, popup, settings, storage, sync, bookmark import, snapshot restore, and pickup-code share with real browser extension storage.

## Tech Stack and References

Lucuro builds on an open-source stack for UI rendering, local storage, extension APIs, and bundle analysis.

| Tool | Version | Function | Reference |
| --- | --- | --- | --- |
| [Vue](https://vuejs.org/guide/introduction.html) | `^3.5.13` | UI framework | Official guide |
| [Vite](https://vite.dev/guide/) | `^6.0.5` | Build tool | Official guide |
| [Vue I18n](https://vue-i18n.intlify.dev/) | `^9.14.2` | English and Chinese interface text | Official docs |
| [lucide-vue-next](https://lucide.dev/guide/packages/lucide-vue-next) | `^0.468.0` | Icon set | Official docs |
| [SortableJS](https://github.com/SortableJS/Sortable) | `^1.15.6` | Draggable card grid | GitHub repository |
| [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) | `^0.12.0` | Cross-browser extension API compatibility | GitHub repository |
| [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) | `^5.12.0` | Bundle size visualization | GitHub repository |
| [sharp](https://sharp.pixelplumbing.com/) | `^0.35.3` | Icon processing workflows | Official docs |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/) | latest | Optional pickup-code sharing endpoint | Official docs |

Additional community link:

- [LINUX DO](https://linux.do/) - A next-generation Linux community

## Security Considerations

### Local-first privacy

- Core navigation does not require an account, analytics, or telemetry.
- User notes, tokens, and private configuration stay in browser extension storage.
- No data is uploaded unless the user explicitly triggers a pickup-code share.

### Least privilege

- Use only `storage`, `unlimitedStorage`, `activeTab`, and optional `bookmarks`.
- Do not add `<all_urls>` or unrelated permissions.
- Keep the manifest honest for store review and user trust.

### Worker boundary

- Restrict `host_permissions` to the Worker domain.
- The Worker accepts bounded payloads and enforces TTLs.
- The Worker does not store user accounts or long-term history.

### CSP

- Local scripts only.
- No remote code execution.
- `connect-src` allows only the Worker domain used by Lucuro.

### Store review readiness

- Publish a privacy policy.
- Explain native sync, optional Worker sharing, and optional bookmark import.
- Avoid hidden permissions.
- Keep the package free of secrets and developer paths.

### Support links

- Overseas support: [Ko-fi](https://ko-fi.com/helloxiaolaodi)
- Domestic support: WeChat QR code at `public/qrcode-wechat.png`
- No third-party payment SDK is required.

## Acknowledgements

### Repository builder

This Lucuro repository is maintained by **Helloxiaolaodi**.

### AI tools used during repository construction

Lucuro has also been developed with support from the following AI tools during planning, implementation, documentation, and iteration work:

- **GLM 5.1**
- **GPT 5.4**
- **DeepSeek V4 Pro**

### README media attribution

- Default background and avatar assets are archived outside the extension source.
- Users can configure their own avatar from settings without editing repository files.

## License

This project is licensed under the [MIT License](LICENSE).

[Back to top](#readme-top)

## Recent Updates

- Initial Manifest V3 release with new tab override and toolbar popup.
- Added default light gradient theme and deep indigo/night dark mode.
- Added custom daily quote as a "一言" feature.
- Added pocket notes with Markdown and debounced auto-save.
- Added draggable card grid, layout lock, and multiple sort modes.
- Added year/day progress bars and recommended cards.
- Added local snapshot history with up to eight restore points.
- Added optional Chrome bookmark import.
- Added popup add-current-page and new-tab toggle.
- Added native `chrome.storage.sync` with local fallback.
- Added 6-digit pickup-code sharing through a Cloudflare Worker.
- Added `rollup-plugin-visualizer` for gzip and brotli bundle analysis.
- Set overseas support to Ko-fi and domestic support to WeChat QR code.
