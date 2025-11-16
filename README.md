# Float Console

A simple floating console for Chrome that shows your logs without opening DevTools. Sometimes you just need to see what's being logged, you know?

![Float Console](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-not%20ready-red)
![Release](https://img.shields.io/badge/release-not%20ready-red)

> ⚠️ **Heads up**: This is still being worked on and hasn't been released yet. Things might break, features might change, and it's not in the Chrome Web Store. Use at your own risk!

> ⚠️ **Important**: This is just a simple log viewer, okay? It's not Chrome DevTools. It won't debug your code, won't show you network requests, won't profile performance, none of that fancy stuff. It just shows console logs. If you need real debugging, use DevTools like everyone else.

## What it does

Basically, it's a floating window that shows your `console.log`, `console.warn`, `console.error`, and other console stuff. That's it. Nothing fancy.

Here's what you can do:

- **See your logs** - All the console methods you're used to (log, warn, error, info, debug, table, group, etc.)
- **Filter stuff** - Search through logs or filter by type
- **Pin logs** - Keep important ones at the top
- **Copy logs** - Copy individual logs or everything
- **Groups** - Expand/collapse grouped logs
- **Long messages** - Expand messages that are too long
- **Move it around** - Drag it wherever you want
- **Resize it** - Make it bigger or smaller
- **Dark mode** - Because dark mode is better
- **Custom fonts** - Change the font if you want
- **Keyboard shortcut** - Set your own shortcut to toggle it

## What it doesn't do

Just to be clear:

- It's not DevTools. Don't expect breakpoints, network inspection, or any of that.
- Log formatting might look slightly different than DevTools (we tried, but it's hard to match perfectly)
- Objects are shown as text, not interactive inspectors
- No debugging features - can't set breakpoints or step through code
- Error details might be simpler than what DevTools shows

If you need real debugging, use Chrome DevTools. This is just for quick log viewing.

## Installation

### Build it yourself

1. Clone the repo:

```bash
git clone https://github.com/milad-hub/float-console.git
cd float-console
```

2. Install dependencies:

```bash
npm install
```

3. Build it:

```bash
npm run build
```

4. Load it in Chrome:
   - Go to `chrome://extensions/`
   - Turn on "Developer mode" (top right)
   - Click "Load unpacked"
   - Pick the `dist` folder

## How to use it

It's pretty straightforward. Click the floating button (or use your keyboard shortcut) to show/hide the console.

- **Move it**: Drag the floating button around
- **Resize**: Drag the edges of the console window
- **Filter**: Type in the filter box or use the Types dropdown
- **Pin logs**: Click the pin icon on any log
- **Delete logs**: Click the X icon
- **Copy**: Click the copy icon (or use the Copy button for all logs)
- **Expand groups**: Click the chevron to expand/collapse groups
- **Expand long messages**: Click the chevron on truncated messages

The settings are in the extension popup (click the extension icon). You can change the position, enable dark mode, adjust fonts, etc.

## Development

If you want to hack on this:

```bash
# Install stuff
npm install

# Watch mode for development
npm run dev

# Build for production
npm run build

# Clean up
npm run clean

# Lint
npm run lint

# Fix linting
npm run lint:fix

# Format code
npm run format
```

We use ESLint and Prettier, so the code should be reasonably clean.

## How it works

- Content scripts intercept console calls and send them to the extension
- Uses Shadow DOM so it doesn't mess with page styles
- Messages are passed securely between content scripts and the extension
- Logs are limited to 10,000 to keep memory usage reasonable
- Everything stays local - no tracking, no external calls

## License

MIT - do whatever you want with it.

## Issues

Found a bug? Want a feature? Open an issue on GitHub: https://github.com/milad-hub/float-console/issues

---

Made for developers who just want to see their logs without the DevTools overhead.