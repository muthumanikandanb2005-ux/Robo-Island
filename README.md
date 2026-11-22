# 🏝️ Windows Dynamic Island with Animated Robo Eyes

An ultra-sleek, Apple-inspired **Dynamic Island for Windows 10 & 11** built with Electron, Canvas 60FPS vector physics, and native Windows SMTC (System Media Transport Controls) integration.

---

## ✨ Features

### 1. 🤖 Procedural Animated Robo Eyes
- **Living Character Engine**: Natural saccadic eye movements (organic darting and glances) and spontaneous realistic blinks.
- **Cursor Tracking**: Robo eyes track your mouse pointer as you move across the screen.
- **Dynamic Moods & Expressions**:
  - 😊 **Neutral**: Calm breathing cycle and gentle observation.
  - 😃 **Happy**: Bouncy crescent eyes with cute smiles.
  - 👀 **Curious**: Inquisitive squinting.
  - 😴 **Sleepy**: Heavy drooped eyelids.
  - 💖 **Love**: Heart-shaped eyes.
  - 💫 **Dizzy**: Triggered automatically when RAM/CPU > 85% or on demand.
  - 😉 **Wink**: Click on the Robo Eyes avatar to make it wink at you!
- **OLED Eye Color Themes**: Cyber Cyan, Neon Emerald, Solar Amber, Laser Magenta, Electric Blue, and Pure White.
- **Beat Reactive**: Eyes subtly pulse and bounce in sync with playing music.

---

### 2. 🎵 Universal Media Controls (Spotify, YouTube & All Platforms)
- **Universal SMTC Integration**: Works out-of-the-box with:
  - **Spotify** Desktop App
  - **YouTube** (Chrome, Brave, Microsoft Edge, Firefox, Opera)
  - **Apple Music / iTunes**
  - **Tidal, Amazon Music**
  - **VLC, Windows Media Player, Groove**
- **Now Playing Display**: Real-time Song Title, Artist name, Album name, and Source badge.
- **Controls**:
  - ⏪ **Previous Track** (`VK_MEDIA_PREV`)
  - ⏯️ **Play / Pause Toggle** (`VK_MEDIA_PLAY_PAUSE`)
  - ⏩ **Next Track** (`VK_MEDIA_NEXT`)
  - 🔊 **Master Volume**: Volume Up, Volume Down, and Instant Mute toggle.
- **Visuals**: Animated spinning vinyl disc + dynamic 8-band audio frequency visualizer wave.
- **Timeline**: Current playback position and total track length in `MM:SS`.

---

### 3. ⚡ Live System Metrics & Hardware Monitor
- **RAM (Memory)**:
  - Accurate live percentage and progress bar.
  - Real-time used memory in GB vs total capacity (e.g. `12.1 GB / 15.8 GB`).
  - Automatic status badge: `Optimal` (cyan) ➔ `Moderate` (amber) ➔ `High Load` (red).
- **Storage / Disks**:
  - Automatic detection of all internal and external drives (`C:`, `D:`, etc.).
  - Used vs free space with visual progress bars.
- **CPU Load**:
  - Real-time CPU percentage monitor and load indicator.

---

### 4. 📱 Background Applications Hub
- Total active background tasks counter.
- Live ranking of top memory-consuming background applications (e.g., browsers, IDEs, language servers).
- **1-Click End Task**: Terminate unresponsive or heavy processes directly from the island.
- **Task Manager Shortcut**: Instant 1-click button to launch Windows Task Manager.

---

### 5. 🛠️ Quick Tools & Shortcuts
- ✂️ **Snipping Tool**: One-click screen capture (`Win + Shift + S`).
- ⚙️ **Windows Settings**: Quick launcher for Windows Settings.
- 🔒 **Lock PC**: Fast workstation lock (`Win + L`).
- 📌 **Pin Mode**: Toggle keeping the island permanently expanded.

---

## 🚀 Quick Start

### 1. Launching the App
Double-click **`start.bat`** or run:

```bash
cd "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows"
npm start
```

### 2. Hotkeys & Controls
| Action | Shortcut |
| :--- | :--- |
| **Expand / Collapse Island** | `Alt + I` or `Ctrl + Shift + Space` |
| **Pin Island Expanded** | Click the 📌 icon in header |
| **Play / Pause** | Space or ⏯️ button |
| **Wink Animation** | Click the Robo Eyes face |
| **Minimize to Pill** | Click ✕ or outside when unpinned |

---

## 📁 Project Architecture

- **`main.js`**: Electron main process managing transparent frameless window, system tray, window resizing, and global hotkeys.
- **`media-service.js`**: Persistent Node.js bridge communicating with PowerShell SMTC daemon.
- **`media_daemon.ps1`**: High-performance persistent WinRT SMTC process query engine with user32 fallback.
- **`system-service.js`**: Real-time hardware and process monitoring using `systeminformation`.
- **`robo-eyes.js`**: Standalone 60FPS procedural vector Canvas animation engine for the robotic eyes.
- **`index.html`**: Glassmorphic layout for compact pill and expanded island dashboard.
- **`styles.css`**: Apple iOS + Windows Fluent dark glassmorphism styling (`backdrop-filter: blur(30px)`).
- **`island-app.js`**: Frontend controller orchestrating animations, visualizers, and state updates.
