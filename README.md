# Float Console

A floating console Chrome extension that captures logs, warnings, and errors for quick debugging without opening DevTools.

![Float Console](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-not%20ready-red)
![Release](https://img.shields.io/badge/release-not%20ready-red)

> ⚠️ **Note**: This project is currently under active development and **has not been released yet**. Features may change, bugs may exist, and the extension is not available in the Chrome Web Store. Use at your own risk and feel free to report any issues!

## Features

- **Floating Console Panel** - Draggable and resizable console that stays accessible
- **Comprehensive Log Capture** - Automatically captures `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug`, `console.table`, `console.group`, and `console.groupCollapsed`
- **Advanced Filtering** - Filter logs by text, type, or timestamp
- **Pin Important Logs** - Pin logs to keep them visible while scrolling
- **Copy Functionality** - Copy individual logs or all logs (filtered or unfiltered) to clipboard
- **Log Management** - Delete individual logs or clear all logs
- **Grouped Logs** - Collapsible groups for organized log viewing
- **Expandable Messages** - Expand/collapse long log messages with chevron controls
- **Lightweight & Performant** - Optimized with debouncing, memory management, and efficient rendering
- **Modern UI** - Clean design with dark/light theme support
- **Keyboard Shortcuts** - Quick toggle with `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
- **Customizable Settings**:
  - Position control (top-left, top-right, bottom-left, bottom-right)
  - Hover-to-show mode
  - Dark mode toggle
  - Custom font family and font size for logs
- **Persistent Settings** - Remembers your preferences across sessions
- **Privacy-Focused** - All data stays local, no external tracking
- **Secure** - Built with security best practices including XSS prevention and CSP compliance

## 🚀 Installation

### From Source

1. Clone this repository:

```bash
git clone https://github.com/milad-hub/float-console.git
cd float-console
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

### Basic Operations

1. **Toggle Console**: Click the floating button or press `Ctrl+Shift+X`
2. **Reposition**: Use the position buttons in settings or drag the floating button to any corner
3. **Resize**: Drag the resize handles on the console panel edges
4. **Clear Logs**: Click the "Clear" button in the console header
5. **Copy Logs**: Click the "Copy" button to copy all logs (or filtered logs) to clipboard
6. **Filter Logs**: Click the "Filter" button and type to filter logs by content, type, or time

### Log Management

- **Pin Logs**: Click the pin icon on any log entry to pin it to the top
- **Delete Logs**: Click the delete icon on any log entry to remove it
- **Copy Individual Logs**: Click the copy icon on any log entry
- **Expand/Collapse**: Click on truncated messages or group headers to expand/collapse
- **Group Navigation**: Use chevron icons to expand/collapse grouped logs

### Settings

Click the extension icon to access:

- **Position**: Choose from 4 corner positions
- **Hover to Show**: Enable hover mode to show console on button hover
- **Dark Mode**: Toggle between light and dark themes
- **Font Settings**: Customize log font family and size

## 🛠️ Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean build directory
npm run clean

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check code formatting
npm run format:check
```

### Code Quality

The project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Webpack** for bundling and optimization

## 🔧 Technical Details

### Architecture

- **Content Scripts**: Intercept console methods and inject logging functionality
- **Shadow DOM**: Isolated styling to prevent conflicts with page styles
- **Message Passing**: Secure communication between content scripts and extension
- **Memory Management**: Automatic log cleanup to prevent memory issues (10,000 log limit)

### Security Features

- XSS prevention through HTML escaping
- Content Security Policy (CSP) compliance
- Input sanitization
- Message origin validation
- Safe DOM manipulation

### Performance Optimizations

- Debounced filter input (300ms)
- Efficient log rendering
- Memory limit enforcement
- Optimized event handlers
- Tree shaking and code minification

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 📧 Support

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/milad-hub/float-console/issues).

---

Made with ❤️ for developers who want quick debugging without the DevTools hassle.
