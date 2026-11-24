const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    // Create window
    const win = new BrowserWindow({
        width: 620,
        height: 440,
        show: true, // show so GPU renders full DOM immediately
        frame: false,
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    await win.loadFile(path.join(__dirname, 'index.html'));
    await new Promise(r => setTimeout(r, 1000));

    // Inject styles to disable transitions/animations and center island in frame
    await win.webContents.executeJavaScript(`
        (() => {
            const style = document.createElement('style');
            style.textContent = \`
                * {
                    transition: none !important;
                    animation: none !important;
                }
                body {
                    background: #040406 !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                }
                #island-container {
                    margin: auto !important;
                }
            \`;
            document.head.appendChild(style);

            // Populate all tabs with rich realistic mock data
            // Media
            document.getElementById('track-title').textContent = 'Starboy (feat. Daft Punk)';
            document.getElementById('track-artist').textContent = 'The Weeknd • Starboy';
            document.getElementById('time-current').textContent = '1:24';
            document.getElementById('time-total').textContent = '3:50';
            document.getElementById('timeline-progress').style.width = '36%';
            const sBadge = document.getElementById('media-status-badge');
            if (sBadge) { sBadge.textContent = 'PLAYING'; sBadge.className = 'status-badge playing'; }
            const srcBadge = document.getElementById('media-source-badge');
            if (srcBadge) srcBadge.textContent = 'SPOTIFY';

            // Battery
            document.getElementById('battery-pct').textContent = '95%';
            document.getElementById('battery-icon').textContent = '⚡';

            // Stats
            document.getElementById('cpu-percent').textContent = '14';
            document.getElementById('cpu-bar-fill').style.width = '14%';
            document.getElementById('ram-percent').textContent = '38';
            document.getElementById('ram-bar-fill').style.width = '38%';
            document.getElementById('ram-used').textContent = '6.1 GB';
            document.getElementById('ram-total').textContent = '16.0 GB';

            document.getElementById('disks-container').innerHTML = \`
                <div class="disk-row">
                    <div class="disk-info-header">
                        <span class="disk-name">Drive C: (NVMe SSD)</span>
                        <span class="disk-used-text">142.6 GB / 512.0 GB (28%)</span>
                    </div>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill fill-cyan" style="width: 28%;"></div>
                    </div>
                </div>
                <div class="disk-row" style="margin-top: 10px;">
                    <div class="disk-info-header">
                        <span class="disk-name">Drive D: (Data Storage)</span>
                        <span class="disk-used-text">380.2 GB / 1024.0 GB (37%)</span>
                    </div>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill fill-green" style="width: 37%;"></div>
                    </div>
                </div>
            \`;

            // Apps
            document.getElementById('tab-apps-count').textContent = '4';
            document.getElementById('process-list').innerHTML = \`
                <div class="proc-item">
                    <div class="proc-left">
                        <div class="proc-dot" style="background:#00f0ff; box-shadow:0 0 6px #00f0ff;"></div>
                        <span class="proc-name">chrome.exe</span>
                        <span class="proc-pid">PID: 8420</span>
                    </div>
                    <div class="proc-right">
                        <span class="proc-mem">420 MB</span>
                        <button class="proc-kill-btn">End Task</button>
                    </div>
                </div>
                <div class="proc-item">
                    <div class="proc-left">
                        <div class="proc-dot" style="background: #00ff88; box-shadow: 0 0 6px #00ff88;"></div>
                        <span class="proc-name">Spotify.exe</span>
                        <span class="proc-pid">PID: 12408</span>
                    </div>
                    <div class="proc-right">
                        <span class="proc-mem">185 MB</span>
                        <button class="proc-kill-btn">End Task</button>
                    </div>
                </div>
                <div class="proc-item">
                    <div class="proc-left">
                        <div class="proc-dot" style="background: #ff007f; box-shadow: 0 0 6px #ff007f;"></div>
                        <span class="proc-name">Code.exe</span>
                        <span class="proc-pid">PID: 19842</span>
                    </div>
                    <div class="proc-right">
                        <span class="proc-mem">310 MB</span>
                        <button class="proc-kill-btn">End Task</button>
                    </div>
                </div>
                <div class="proc-item">
                    <div class="proc-left">
                        <div class="proc-dot" style="background: #ffe600; box-shadow: 0 0 6px #ffe600;"></div>
                        <span class="proc-name">WindowsTerminal.exe</span>
                        <span class="proc-pid">PID: 6150</span>
                    </div>
                    <div class="proc-right">
                        <span class="proc-mem">95 MB</span>
                        <button class="proc-kill-btn">End Task</button>
                    </div>
                </div>
            \`;

            // Tools Clipboard
            document.getElementById('clip-preview-text').textContent = 'https://github.com/muthumanikandanb2005-ux/Robo-Island';
            document.getElementById('clip-char-count').textContent = '52 chars';

            // Expand Island Container
            const c = document.getElementById('island-container');
            c.classList.remove('collapsed');
            c.classList.add('expanded');
            c.style.width = '580px';
            c.style.height = '380px';

            document.getElementById('collapsed-view').style.display = 'none';
            const exp = document.getElementById('expanded-view');
            exp.style.display = 'flex';
            exp.style.opacity = '1';
        })();
    `);

    await new Promise(r => setTimeout(r, 600));

    // Helper to get element bounds
    const getBounds = async (selector) => {
        return await win.webContents.executeJavaScript(`
            (() => {
                const el = document.querySelector('${selector}');
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
            })()
        `);
    };

    const containerBounds = await getBounds('#island-container');
    console.log('Container Bounds:', containerBounds);

    const tabsToCapture = [
        { tabId: 'tab-media', file: 'screenshot-1-media.png' },
        { tabId: 'tab-stats', file: 'screenshot-2-stats.png' },
        { tabId: 'tab-apps', file: 'screenshot-3-apps.png' },
        { tabId: 'tab-robo', file: 'screenshot-4-robolab.png' },
        { tabId: 'tab-tools', file: 'screenshot-5-tools.png' },
    ];

    for (const item of tabsToCapture) {
        await win.webContents.executeJavaScript(`
            document.querySelector('.nav-tab[data-tab="${item.tabId}"]').click();
        `);
        await new Promise(r => setTimeout(r, 500));

        const img = await win.webContents.capturePage({
            x: containerBounds.x,
            y: containerBounds.y,
            width: containerBounds.width,
            height: containerBounds.height
        });

        const savePath = path.join(__dirname, item.file);
        fs.writeFileSync(savePath, img.toPNG());
        console.log(`Saved: ${item.file} (${img.toPNG().length} bytes)`);
    }

    // Capture Collapsed Mini Robot Eyes
    win.setSize(380, 140);
    await win.webContents.executeJavaScript(`
        (() => {
            const c = document.getElementById('island-container');
            c.className = 'island collapsed';
            c.style.width = '110px';
            c.style.height = '34px';
            c.style.margin = 'auto';
            c.style.background = '#000000';
            c.style.border = '1px solid rgba(0, 240, 255, 0.45)';
            c.style.borderRadius = '9999px';
            c.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.35)';

            document.getElementById('collapsed-view').style.display = 'flex';
            document.getElementById('collapsed-view').style.justifyContent = 'center';
            document.getElementById('collapsed-view').style.alignItems = 'center';
            document.getElementById('expanded-view').style.display = 'none';
        })();
    `);
    await new Promise(r => setTimeout(r, 500));

    const collapsedBounds = await getBounds('#island-container');
    // Capture with a neat border around it
    const collapsedImg = await win.webContents.capturePage({
        x: Math.max(0, collapsedBounds.x - 30),
        y: Math.max(0, collapsedBounds.y - 15),
        width: collapsedBounds.width + 60,
        height: collapsedBounds.height + 30
    });
    fs.writeFileSync(path.join(__dirname, 'screenshot-6-collapsed.png'), collapsedImg.toPNG());
    console.log(`Saved: screenshot-6-collapsed.png (${collapsedImg.toPNG().length} bytes)`);

    console.log('ALL 6 PRISTINE SCREENSHOTS GENERATED WITH 100% ACCURACY!');
    app.quit();
});
