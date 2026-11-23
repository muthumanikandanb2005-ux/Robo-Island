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

    // Register global toggle hotkey: Alt+I or Ctrl+Shift+Space
    try {
        globalShortcut.register('Alt+I', () => toggleIsland());
        globalShortcut.register('CommandOrControl+Shift+Space', () => toggleIsland());
    } catch (e) {}

    // Wire Media Service events
    mediaService.on('update', (mediaData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-update', mediaData);
        }
    });

    // Wire System Service events
    systemService.on('stats', (statsData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('system-stats', statsData);
        }
    });

    createTray();
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
    resizeIsland(!isExpanded);
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

        const contextMenu = Menu.buildFromTemplate([
            { label: 'Robo Island (Running)', enabled: false },
            { type: 'separator' },
            { label: 'Toggle Island (Alt + I)', click: () => toggleIsland() },
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
        tray.on('click', () => toggleIsland());
    } catch (err) {
        console.error('Tray icon init error:', err.message);
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
        case 'lock': systemService.lockWorkstation(); break;
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    mediaService.destroy();
    systemService.stopPolling();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch(e){}
    mediaService.destroy();
    systemService.stopPolling();
});
