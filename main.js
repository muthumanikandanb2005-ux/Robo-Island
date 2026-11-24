const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Power efficiency & Hardware Acceleration flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');

process.on('uncaughtException', (err) => {
    try { fs.appendFileSync(path.join(__dirname, 'crash.log'), `[${new Date().toISOString()}] Uncaught: ${err.stack || err}\n`); } catch(e){}
});
process.on('unhandledRejection', (reason) => {
    try { fs.appendFileSync(path.join(__dirname, 'crash.log'), `[${new Date().toISOString()}] Rejection: ${reason.stack || reason}\n`); } catch(e){}
});

const mediaService = require('./media-service');
const systemService = require('./system-service');

let mainWindow = null;
let tray = null;
let isPinned = false;
let isExpanded = false;
let isHidden = false;
let isAutoHideOnVideo = false;

// Geometry configuration: Ultra-compact, non-disturbing tiny eyes
const SIZES = {
    collapsed: { width: 110, height: 32, y: 4 },
    expanded: { width: 580, height: 380, y: 8 }
};

function getCenteredX(width) {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth } = primaryDisplay.workAreaSize;
        return Math.round((screenWidth - width) / 2);
    } catch (e) {
        return 600;
    }
}

app.name = 'Robo Island';
if (process.platform === 'win32') {
    app.setAppUserModelId('RoboIsland.App');
}

// Single Instance Lock: prevents duplicate processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            resizeIsland(true);
        }
    });
}

function createWindow() {
    // Configure auto-start safely inside whenReady
    try {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: process.execPath
        });
    } catch (e) {}

    const x = getCenteredX(SIZES.collapsed.width);
    
    mainWindow = new BrowserWindow({
        title: 'Robo Island',
        icon: path.join(__dirname, 'icon.ico'),
        width: SIZES.collapsed.width,
        height: SIZES.collapsed.height,
        x: x,
        y: SIZES.collapsed.y,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true, // Never show in taskbar
        resizable: false,
        hasShadow: false,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        }
    });

    mainWindow.loadFile('index.html');
    
    // Windows safe always on top (no invalid 'screen-saver' level)
    try {
        mainWindow.setAlwaysOnTop(true, 'floating');
    } catch (e) {
        mainWindow.setAlwaysOnTop(true);
    }

    // Smart Auto-Collapse on Blur (only if not pinned)
    mainWindow.on('blur', () => {
        if (isExpanded && !isPinned) {
            resizeIsland(false);
        }
    });

    // Register global toggle, visibility & media hotkeys
    try {
        globalShortcut.register('Alt+I', () => toggleIsland());
        globalShortcut.register('CommandOrControl+Shift+Space', () => toggleIsland());
        globalShortcut.register('Alt+H', () => toggleIslandVisibility());
        globalShortcut.register('CommandOrControl+Shift+H', () => toggleIslandVisibility());
        globalShortcut.register('Alt+M', () => mediaService.toggleMute());
        globalShortcut.register('Alt+.', () => mediaService.next());
        globalShortcut.register('Alt+,', () => mediaService.previous());
    } catch (e) {}

    // Wire Media Service events with Video Auto-Hide
    mediaService.on('update', (mediaData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-update', mediaData);

            // Auto-hide island while video is actively playing (if enabled)
            if (isAutoHideOnVideo && !isExpanded) {
                const isPlaying = (mediaData.status === 'Playing');
                const src = (mediaData.source || '').toLowerCase();
                const isVideo = src.includes('chrome') || src.includes('brave') || 
                                src.includes('msedge') || src.includes('firefox') || 
                                src.includes('youtube') || src.includes('vlc') || src.includes('netflix');
                if (isPlaying && isVideo && !isHidden) {
                    hideIsland();
                } else if (!isPlaying && isHidden) {
                    showIsland();
                }
            }
        }
    });

    // Wire System Service events
    systemService.on('stats', (statsData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('system-stats', statsData);
        }
    });

    createTray();
    startCursorTracking();
}

function resizeIsland(expanded) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    isExpanded = expanded;
    const targetSize = expanded ? SIZES.expanded : SIZES.collapsed;
    const targetX = getCenteredX(targetSize.width);

    systemService.setWindowState(expanded);

    mainWindow.setBounds({
        x: targetX,
        y: targetSize.y,
        width: targetSize.width,
        height: targetSize.height
    }, true);

    mainWindow.webContents.send('island-state-changed', { expanded, pinned: isPinned });
}

function toggleIsland() {
    if (isHidden) {
        showIsland();
        return;
    }
    resizeIsland(!isExpanded);
}

function hideIsland() {
    if (!mainWindow || mainWindow.isDestroyed() || isHidden) return;
    isHidden = true;
    mainWindow.webContents.send('island-visibility-changed', false);
    setTimeout(() => {
        if (isHidden && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
        }
    }, 180);
    updateTray();
}

function showIsland() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    isHidden = false;
    mainWindow.show();
    mainWindow.webContents.send('island-visibility-changed', true);
    updateTray();
}

function toggleIslandVisibility() {
    if (isHidden) {
        showIsland();
    } else {
        hideIsland();
    }
}

function updateTray() {
    if (!tray) return;
    try {
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Robo Island (Running)', enabled: false },
            { type: 'separator' },
            { label: isHidden ? 'Show Island (Alt + H)' : 'Hide Island (Alt + H)', click: () => toggleIslandVisibility() },
            { label: 'Toggle Expand (Alt + I)', click: () => toggleIsland() },
            { 
                label: 'Pin Expanded', 
                type: 'checkbox', 
                checked: isPinned, 
                click: (item) => {
                    isPinned = item.checked;
                    if (isPinned) resizeIsland(true);
                } 
            },
            { 
                label: 'Start on Windows Boot', 
                type: 'checkbox', 
                checked: true, 
                click: (item) => {
                    try { app.setLoginItemSettings({ openAtLogin: item.checked }); } catch(e){}
                } 
            },
            { type: 'separator' },
            { label: 'Open Task Manager', click: () => systemService.openTaskManager() },
            { label: 'Snipping Tool (Win+Shift+S)', click: () => systemService.openSnippingTool() },
            { type: 'separator' },
            { label: 'Quit Robo Island', click: () => app.quit() }
        ]);
        tray.setContextMenu(contextMenu);
    } catch(e) {}
}

function createTray() {
    try {
        let iconPath = path.join(__dirname, 'icon.ico');
        if (iconPath.includes('app.asar')) {
            const unpackedPath = iconPath.replace('app.asar', 'app.asar.unpacked');
            if (fs.existsSync(unpackedPath)) {
                iconPath = unpackedPath;
            }
        }
        
        const nImg = nativeImage.createFromPath(iconPath);
        tray = new Tray(nImg);
        tray.setToolTip('Robo Island');
        updateTray();
        tray.on('click', () => toggleIsland());
    } catch (err) {
        console.error('Tray icon init error:', err.message);
    }
}

// High-efficiency global desktop cursor tracking (< 0.01% CPU)
let lastCursorPos = { x: -1, y: -1 };
let cursorTrackingInterval = null;
let isTrackingEnabled = true;

function startCursorTracking() {
    if (cursorTrackingInterval) return;
    cursorTrackingInterval = setInterval(() => {
        if (!isTrackingEnabled || !mainWindow || mainWindow.isDestroyed()) return;
        try {
            const point = screen.getCursorScreenPoint();
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;

            // When island is hidden, moving mouse to top bezel (y <= 3) reveals it
            if (isHidden) {
                const centerX = screenWidth / 2;
                if (point.y <= 3 && Math.abs(point.x - centerX) < 160) {
                    showIsland();
                }
                return;
            }

            if (!mainWindow.isVisible()) return;

            if (point.x !== lastCursorPos.x || point.y !== lastCursorPos.y) {
                lastCursorPos = point;
                const bounds = mainWindow.getBounds();

                // Center of the current island on screen
                const islandCenterX = bounds.x + (bounds.width / 2);
                const islandCenterY = bounds.y + (bounds.height / 2);

                // Max spans for normalization to [-1, 1]
                const maxSpanX = Math.max(islandCenterX, screenWidth - islandCenterX) || 1;
                const maxSpanY = Math.max(islandCenterY, screenHeight - islandCenterY) || 1;

                const relX = Math.max(-1, Math.min(1, (point.x - islandCenterX) / maxSpanX));
                const relY = Math.max(-1, Math.min(1, (point.y - islandCenterY) / maxSpanY));

                mainWindow.webContents.send('global-cursor-move', {
                    relX,
                    relY,
                    cursorX: point.x,
                    cursorY: point.y
                });
            }
        } catch (e) {}
    }, 25);
}

function stopCursorTracking() {
    if (cursorTrackingInterval) {
        clearInterval(cursorTrackingInterval);
        cursorTrackingInterval = null;
    }
}

// Safe IPC Handlers (Guarded against undefined payload crashes)
ipcMain.on('expand-island', () => {
    resizeIsland(true);
});

ipcMain.on('collapse-island', () => {
    if (!isPinned) {
        resizeIsland(false);
    }
});

ipcMain.on('toggle-pin', (event, val) => {
    isPinned = (val !== undefined) ? val : !isPinned;
    event.reply('pin-status', isPinned);
});

ipcMain.on('tab-changed', (event, tabName) => {
    if (tabName) systemService.setWindowState(isExpanded, tabName);
});

ipcMain.on('toggle-cursor-tracking', (event, val) => {
    isTrackingEnabled = (val !== false);
    if (isTrackingEnabled) {
        startCursorTracking();
    } else {
        stopCursorTracking();
    }
});

ipcMain.on('media-action', (event, payload) => {
    if (!payload) return;
    const { action, param } = payload;
    switch (action) {
        case 'playpause': mediaService.playPause(); break;
        case 'next': mediaService.next(); break;
        case 'prev': mediaService.previous(); break;
        case 'volup': mediaService.volumeUp(); break;
        case 'voldown': mediaService.volumeDown(); break;
        case 'mute': mediaService.toggleMute(); break;
        case 'seek': mediaService.seek(param); break;
        case 'status': mediaService.requestStatus(); break;
    }
});

ipcMain.on('system-action', (event, payload) => {
    if (!payload) return;
    const { action, pid } = payload;
    switch (action) {
        case 'kill': if (pid) systemService.killProcess(pid); break;
        case 'taskmgr': systemService.openTaskManager(); break;
        case 'snip': systemService.openSnippingTool(); break;
        case 'settings': systemService.openSettings(); break;
        case 'calc': systemService.openCalculator(); break;
        case 'notepad': systemService.openNotepad(); break;
        case 'terminal': systemService.openTerminal(); break;
        case 'sound': systemService.openSoundSettings(); break;
        case 'trim-mem': systemService.trimMemory(); break;
        case 'lock': systemService.lockWorkstation(); break;
    }
});

ipcMain.on('toggle-visibility', () => toggleIslandVisibility());
ipcMain.on('hide-island', () => hideIsland());
ipcMain.on('show-island', () => showIsland());
ipcMain.on('set-autohide-video', (event, val) => {
    isAutoHideOnVideo = (val === true);
});

ipcMain.on('show-mini-context-menu', (event) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const miniMenu = Menu.buildFromTemplate([
        { label: 'Robo Island', enabled: false },
        { type: 'separator' },
        { label: isHidden ? 'Show Island (Alt + H)' : 'Hide Island (Alt + H)', click: () => toggleIslandVisibility() },
        { label: isExpanded ? 'Collapse Island' : 'Expand Island', click: () => toggleIsland() },
        { label: 'Play / Pause (Dbl-Click)', click: () => mediaService.playPause() },
        { label: 'Next Track (Alt + .)', click: () => mediaService.next() },
        { label: 'Previous Track (Alt + ,)', click: () => mediaService.previous() },
        { label: 'Toggle Mute (Alt + M)', click: () => mediaService.toggleMute() },
        { type: 'separator' },
        { 
            label: 'Pin Expanded', 
            type: 'checkbox', 
            checked: isPinned, 
            click: (item) => {
                isPinned = item.checked;
                if (isPinned) resizeIsland(true);
            }
        },
        { type: 'separator' },
        { 
            label: 'Mood Expression', 
            submenu: [
                { label: '😊 Neutral', click: () => mainWindow.webContents.send('set-mood', 'neutral') },
                { label: '😃 Happy', click: () => mainWindow.webContents.send('set-mood', 'happy') },
                { label: '💖 Love', click: () => mainWindow.webContents.send('set-mood', 'love') },
                { label: '👀 Curious', click: () => mainWindow.webContents.send('set-mood', 'curious') },
                { label: '😉 Wink', click: () => mainWindow.webContents.send('set-mood', 'wink') },
                { label: '😴 Sleepy', click: () => mainWindow.webContents.send('set-mood', 'sleepy') },
                { label: '💫 Dizzy', click: () => mainWindow.webContents.send('set-mood', 'dizzy') }
            ]
        },
        { type: 'separator' },
        { label: 'Quit Robo Island', click: () => app.quit() }
    ]);
    miniMenu.popup({ window: mainWindow });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopCursorTracking();
    mediaService.destroy();
    systemService.stopPolling();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch(e){}
    stopCursorTracking();
    mediaService.destroy();
    systemService.stopPolling();
});
