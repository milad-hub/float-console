# FloatConsole

A floating console Chrome extension that captures logs, warnings, and errors for quick debugging without opening DevTools.

![FloatConsole](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-under%20development-yellow)
![Release](https://img.shields.io/badge/release-not%20released-red)

> ⚠️ **Note**: This project is currently under active development and **has not been released yet**. Features may change, bugs may exist, and the extension is not available in the Chrome Web Store. Use at your own risk and feel free to report any issues!

## ✨ Features

- 🎯 **Floating Console Panel** - Draggable and resizable console that stays accessible
- 📊 **Log Capture** - Automatically captures `console.log`, `console.warn`, `console.error`, and more
- ⚡ **Lightweight** - Minimal performance impact on web pages
- 🎨 **Modern UI** - Clean, glassmorphic design with dark theme
- ⌨️ **Keyboard Shortcuts** - Quick toggle with `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
- 💾 **Persistent Settings** - Remembers your preferences across sessions
- 🔒 **Privacy-Focused** - All data stays local, no external tracking

## 🚀 Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/milad-hub/floatconsole.git
cd floatconsole
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## 📖 Usage

1. **Toggle Console**: Click the floating button or press `Ctrl+Shift+X`
2. **Reposition**: Drag the floating button to any corner - it will snap automatically
3. **Resize**: Drag the resize handles on the console panel
4. **Clear Logs**: Click the "Clear" button in the console header
5. **Configure**: Click the extension icon to open settings popup

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run build:dev

# Production build
npm run build

# Clean build directory
npm run clean
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## 📧 Support

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/milad-hub/floatconsole/issues).

---

Made with ❤️ for developers who want quick debugging without the DevTools hassle.
