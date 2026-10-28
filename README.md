# What Does My Browser Reveal?

A small, dependency-free web page (plain HTML, CSS and JavaScript) that shows **everything your browser and device tell websites while you surf the internet** – from the User-Agent and your time zone to your graphics card and a canvas fingerprint.

It is meant as an eye-opener: many of these values are sent automatically or can be read by any website without asking you. Combined, they can identify your browser surprisingly well, even without cookies.

## Features

- **13 categories of information**, including:
  - Request headers: User-Agent, `Accept-Language`, referrer, Do Not Track, Global Privacy Control
  - Client Hints (Chromium): browser brands, platform, architecture, device model
  - System & hardware: CPU cores, memory, touch support, automation flag
  - Screen & window: resolution, color depth, pixel density, HDR, color gamut
  - Display preferences: dark mode, reduced motion, contrast
  - Time, region & format: time zone, UTC offset, locale, number formats
  - Network: connection type, downlink, latency
  - Graphics card (WebGL / WebGPU)
  - Fingerprint traits: canvas hash, detected fonts, audio context, plugins
  - Devices, permissions & battery
  - Storage & history, supported browser features
  - *Optional:* public IP address, approximate location, ISP and a WebRTC IP leak test
- **Tooltips** on every entry explain what the value means and why it matters for privacy.
- **Language switch** (Deutsch / English). The page picks your browser language on first visit and remembers your choice.
- **Filter box** to search through all entries.
- **Export** the results as JSON (copy to clipboard or download).
- Automatic **dark mode**, responsive layout, keyboard-accessible tooltips.

## Getting started

1. Put `index.html`, `style.css` and `script.js` in the same folder.
2. Open `index.html` in your browser (double-click is enough).

Optionally, serve it locally, which gives the browser a "secure context" (some APIs such as the clipboard or battery status behave better there):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Project structure

| File         | Purpose                                                        |
|--------------|----------------------------------------------------------------|
| `index.html` | Page structure and static texts                                |
| `style.css`  | Layout, light/dark theme, tooltip and language switch styling  |
| `script.js`  | Data collection, translations (DE/EN), rendering, export       |
| `README.md`  | This file                                                      |

## Privacy

- All values are collected **locally in your browser**. Nothing is sent anywhere and nothing is stored, except your language choice (`localStorage`).
- The only network requests happen **after you click "Look up IP address & location"**: the page then queries [ipify.org](https://www.ipify.org/) and [ipapi.co](https://ipapi.co/), which naturally see your IP address. Without that click, the page works fully offline.
- The WebRTC leak test contacts a public STUN server to find out which IP addresses WebRTC exposes.

## Browser notes

Not every browser exposes every value. Chromium-based browsers (Chrome, Edge, Opera) reveal the most. Firefox, Safari, Brave and the Tor Browser deliberately block, round or randomize several values (for example Client Hints, battery status, canvas output or memory size) – which is exactly what you can verify with this page.

## Adding a language

All texts live in `script.js`:

- `UI` – interface texts
- `SEC` – section titles and descriptions
- `R` – row labels and tooltips
- `VT` – translatable values (e.g. "Not available")

Each entry stores the German text first and the English text second. To add another language, extend these tables with another position and adjust the `li()` helper and the language switch in `index.html`.

## Disclaimer

This tool is for education and self-diagnosis of your own browser. It does not track or profile anyone.
"# What-does-my-browser-reveal" 
