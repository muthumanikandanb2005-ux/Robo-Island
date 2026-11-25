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
const settingsService = require('./settings-service');

let mainWindow = null;
let tray = null;
let isPinned = settingsService.get('isPinned', false);
let isExpanded = false;
let isHidden = false;
let isAutoHideOnVideo = settingsService.get('autohideVideo', false);
let isAutoHideBrowsing = settingsService.get('autohideBrowsing', false);
let isHoverPeekEnabled = settingsService.get('hoverPeek', true);
let isAlwaysOnTop = settingsService.get('alwaysOnTop', true);

// Peeking & Hover Protection for Flawless Auto-Hide
let isPeeking = false;
let isMouseOverIsland = false;
let peekLeaveTimer = null;
let lastMediaState = null;

// Geometry configuration: Ultra-compact, non-disturbing tiny eyes
const SIZES = {
    collapsed: { width: 110, height: 32, y: 4 },
    expanded: { width: 580, height: 380, y: 8 }
};

let cachedDisplayBounds = { width: 1920, height: 1080 };

function updateCachedDisplay() {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        if (primaryDisplay && primaryDisplay.bounds) {
            cachedDisplayBounds = primaryDisplay.bounds;
        }
    } catch (e) {}
}

function getCenteredX(width) {
    try {
        const screenWidth = cachedDisplayBounds.width || 1920;
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
            if (isHidden) showIsland();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            resizeIsland(true);
        }
    });
}

function createWindow() {
    updateCachedDisplay();
    try {
        screen.on('display-metrics-changed', updateCachedDisplay);
        screen.on('display-added', updateCachedDisplay);
        screen.on('display-removed', updateCachedDisplay);
    } catch(e) {}

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

    // Wire Media Service & Active Window events with Smart Auto-Hide
    mediaService.on('update', (mediaData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-update', mediaData);
            evaluateAutoHide(mediaData);
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

function evaluateAutoHide(mediaData) {
    if (mediaData) lastMediaState = mediaData;
    const data = lastMediaState || {};

    const isDesktop = (data.isDesktop === true);
    const isBrowser = (data.isBrowser === true);
    const isYouTube = (data.isYouTube === true) || 
                      ((data.title || '').toLowerCase().includes('youtube')) ||
                      ((data.artist || '').toLowerCase().includes('youtube'));
    const isVideoApp = (data.isVideoApp === true);
    const isPlaying = (data.status === 'Playing');

    // Rule 0: Never hide if pinned or expanded
    if (isExpanded || isPinned) {
        if (isHidden) showIsland();
        return;
    }

    // Rule 1: Never hide if user is currently peeking or hovering over the island
    if (isPeeking || isMouseOverIsland) {
        return;
    }

    // Rule 2: Home Screen (Desktop): ALWAYS VISIBLE! NEVER HIDE!
    if (isDesktop) {
        if (isHidden) {
            showIsland();
        }
        return;
    }

    // Rule 3: Browser or Video playback auto-hide
    const shouldHideInBrowser = isAutoHideBrowsing && isBrowser;
    const shouldHideInVideo = isAutoHideOnVideo && (isYouTube || isVideoApp || (isBrowser && isPlaying));
    const shouldHide = shouldHideInBrowser || shouldHideInVideo;

    if (shouldHide) {
        if (!isHidden) {
            hideIsland();
        }
    } else if (isHidden) {
        showIsland();
    }
}

function resizeIsland(expanded) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    isExpanded = expanded;
    if (expanded && isHidden) {
        showIsland();
    }
    const targetSize = expanded ? SIZES.expanded : SIZES.collapsed;
    const targetX = getCenteredX(targetSize.width);

    systemService.setWindowState(expanded);

    mainWindow.setBounds({
        x: targetX,
        y: targetSize.y,
        width: targetSize.width,
        height: targetSize.height
    }, true);

    if (expanded) {
        mainWindow.show();
        mainWindow.focus();
    }

    mainWindow.webContents.send('island-state-changed', { expanded, pinned: isPinned });
}

function toggleIsland() {
    if (isHidden) {
        showIsland();
    }
    resizeIsland(!isExpanded);
}

function hideIsland() {
    if (!mainWindow || mainWindow.isDestroyed() || isHidden || isPinned || isExpanded || isPeeking || isMouseOverIsland) return;
    isHidden = true;
    mainWindow.webContents.send('island-visibility-changed', false);
    setTimeout(() => {
        if (isHidden && mainWindow && !mainWindow.isDestroyed() && !isPeeking && !isMouseOverIsland) {
            mainWindow.hide();
        }
    }, 220);
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
                    settingsService.set('isPinned', isPinned);
                    if (isPinned) resizeIsland(true);
                } 
            },
            { 
                label: 'Start on Windows Boot', 
                type: 'checkbox', 
                checked: settingsService.get('startOnBoot', true), 
                click: (item) => {
                    settingsService.set('startOnBoot', item.checked);
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
            const screenWidth = cachedDisplayBounds.width || 1920;
            const screenHeight = cachedDisplayBounds.height || 1080;
            const bounds = mainWindow.getBounds();
            const centerX = bounds.x + (bounds.width / 2);

            // Check if cursor is over or near island
            const overX = point.x >= (bounds.x - 25) && point.x <= (bounds.x + bounds.width + 25);
            const overY = point.y >= (bounds.y - 12) && point.y <= (bounds.y + bounds.height + 30);
            isMouseOverIsland = overX && overY;

            // When island is auto-hidden: moving cursor to top bezel (y <= 5) near center peeks the island
            if (isHidden) {
                if (isHoverPeekEnabled && point.y <= 5 && Math.abs(point.x - centerX) < 180) {
                    isPeeking = true;
                    if (peekLeaveTimer) { clearTimeout(peekLeaveTimer); peekLeaveTimer = null; }
                    showIsland();
                }
                return;
            }

            // When island was peeked: keep it visible while mouse is near; start cooldown once mouse leaves
            if (isPeeking) {
                if (isMouseOverIsland) {
                    if (peekLeaveTimer) { clearTimeout(peekLeaveTimer); peekLeaveTimer = null; }
                } else if (!peekLeaveTimer) {
                    peekLeaveTimer = setTimeout(() => {
                        peekLeaveTimer = null;
                        isPeeking = false;
                        evaluateAutoHide();
                    }, 1400);
                }
            }

            if (!mainWindow.isVisible()) return;

            if (point.x !== lastCursorPos.x || point.y !== lastCursorPos.y) {
                lastCursorPos = point;

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
    settingsService.set('isPinned', isPinned);
    event.reply('pin-status', isPinned);
});

ipcMain.on('tab-changed', (event, tabName) => {
    if (tabName) systemService.setWindowState(isExpanded, tabName);
});

ipcMain.on('get-settings', (event) => {
    event.reply('settings-loaded', settingsService.getAll());
});

ipcMain.on('save-setting', (event, payload) => {
    if (!payload || !payload.key) return;
    const { key, value } = payload;
    settingsService.set(key, value);

    if (key === 'autohideVideo') {
        isAutoHideOnVideo = (value === true);
        evaluateAutoHide();
    } else if (key === 'autohideBrowsing') {
        isAutoHideBrowsing = (value === true);
        evaluateAutoHide();
    } else if (key === 'hoverPeek') {
        isHoverPeekEnabled = (value !== false);
    } else if (key === 'alwaysOnTop') {
        isAlwaysOnTop = (value !== false);
        try { mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'floating'); } catch (e) {}
    } else if (key === 'startOnBoot') {
        try { app.setLoginItemSettings({ openAtLogin: (value === true) }); } catch (e) {}
    }
});

ipcMain.on('save-all-settings', (event, newSettings) => {
    if (newSettings && typeof newSettings === 'object') {
        settingsService.updateMultiple(newSettings);
        if ('autohideVideo' in newSettings) isAutoHideOnVideo = (newSettings.autohideVideo === true);
        if ('autohideBrowsing' in newSettings) isAutoHideBrowsing = (newSettings.autohideBrowsing === true);
        if ('hoverPeek' in newSettings) isHoverPeekEnabled = (newSettings.hoverPeek !== false);
        if ('isPinned' in newSettings) isPinned = (newSettings.isPinned === true);
        evaluateAutoHide();
    }
});

ipcMain.on('toggle-cursor-tracking', (event, val) => {
    isTrackingEnabled = (val !== false);
    settingsService.set('followMouse', isTrackingEnabled);
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
    settingsService.set('autohideVideo', isAutoHideOnVideo);
    evaluateAutoHide();
});

ipcMain.on('set-autohide-browsing', (event, val) => {
    isAutoHideBrowsing = (val === true);
    settingsService.set('autohideBrowsing', isAutoHideBrowsing);
    evaluateAutoHide();
});

ipcMain.on('set-hover-peek', (event, val) => {
    isHoverPeekEnabled = (val !== false);
    settingsService.set('hoverPeek', isHoverPeekEnabled);
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
                settingsService.set('isPinned', isPinned);
                if (isPinned) resizeIsland(true);
            }
        },
        { type: 'separator' },
        { 
            label: 'Mood Expression', 
            submenu: [
                { label: '😊 Neutral', click: () => mainWindow.webContents.send('set-mood', 'neutral') },
                { label: '😃 Happy', click: () => mainWindow.webContents.send('set-mood', 'happy') },
                { label: '🤩 Excited', click: () => mainWindow.webContents.send('set-mood', 'excited') },
                { label: '🕶️ Cyber Visor', click: () => mainWindow.webContents.send('set-mood', 'cool') },
                { label: '⚡ Focus Matrix', click: () => mainWindow.webContents.send('set-mood', 'focus') },
                { label: '💖 Love', click: () => mainWindow.webContents.send('set-mood', 'love') },
                { label: '👀 Curious', click: () => mainWindow.webContents.send('set-mood', 'curious') },
                { label: '😉 Wink', click: () => mainWindow.webContents.send('set-mood', 'wink') },
                { label: '😴 Sleepy', click: () => mainWindow.webContents.send('set-mood', 'sleepy') },
                { label: '😮 Alert', click: () => mainWindow.webContents.send('set-mood', 'alert') },
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
