// Robo Island - Ultra-Smooth & Battery-Efficient Controller
const { ipcRenderer } = require('electron');

// DOM Elements
const islandContainer = document.getElementById('island-container');
const collapsedView = document.getElementById('collapsed-view');
const expandedView = document.getElementById('expanded-view');

// Mini View DOM
const miniCanvas = document.getElementById('mini-eyes-canvas');
const miniAudioDot = document.getElementById('mini-audio-dot');

// Header DOM
const largeCanvas = document.getElementById('large-eyes-canvas');
const roboAvatarWrapper = document.querySelector('.robo-avatar-wrapper');
const roboMoodTag = document.getElementById('robo-mood-tag');
const batteryIndicator = document.getElementById('battery-indicator');
const batteryIcon = document.getElementById('battery-icon');
const batteryPct = document.getElementById('battery-pct');
const btnPin = document.getElementById('btn-pin');
const btnCollapse = document.getElementById('btn-collapse');

// Media DOM
const vinylDisc = document.getElementById('vinyl-disc');
const mediaWaveCanvas = document.getElementById('media-wave-canvas');
const mediaSourceBadge = document.getElementById('media-source-badge');
const mediaStatusBadge = document.getElementById('media-status-badge');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const timelineProgress = document.getElementById('timeline-progress');
const timelineClickableArea = document.getElementById('timeline-clickable-area');
const btnPrev = document.getElementById('btn-prev');
const btnPlayPause = document.getElementById('btn-playpause');
const btnNext = document.getElementById('btn-next');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const btnMute = document.getElementById('btn-mute');
const btnVolDown = document.getElementById('btn-voldown');
const btnVolUp = document.getElementById('btn-volup');

// Stats DOM
const ramPercent = document.getElementById('ram-percent');
const ramBarFill = document.getElementById('ram-bar-fill');
const ramUsed = document.getElementById('ram-used');
const ramTotal = document.getElementById('ram-total');
const ramStatusBadge = document.getElementById('ram-status-badge');
const btnTrimMem = document.getElementById('btn-trim-mem');
const cpuPercent = document.getElementById('cpu-percent');
const cpuBarFill = document.getElementById('cpu-bar-fill');
const cpuStatusBadge = document.getElementById('cpu-status-badge');
const disksContainer = document.getElementById('disks-container');

// Apps DOM
const tabAppsCount = document.getElementById('tab-apps-count');
const processList = document.getElementById('process-list');
const btnOpenTaskmgr = document.getElementById('btn-open-taskmgr');

// Robo Lab DOM
const moodBtns = document.querySelectorAll('.mood-btn');
const colorSwatches = document.querySelectorAll('.color-swatch');
const chkFollowMouse = document.getElementById('chk-follow-mouse');
const chkAutoHideVideo = document.getElementById('chk-autohide-video');
const chkAutoHideIdle = document.getElementById('chk-autohide-idle');

// Tools DOM
const toolSnip = document.getElementById('tool-snip');
const toolTaskmgr = document.getElementById('tool-taskmgr');
const toolCalc = document.getElementById('tool-calc');
const toolNotepad = document.getElementById('tool-notepad');
const toolTerminal = document.getElementById('tool-terminal');
const toolSound = document.getElementById('tool-sound');
const toolSettings = document.getElementById('tool-settings');
const toolLock = document.getElementById('tool-lock');
const toolHide = document.getElementById('tool-hide');
const islandToast = document.getElementById('island-toast');

// Clipboard DOM
const clipPreviewText = document.getElementById('clip-preview-text');
const clipCharCount = document.getElementById('clip-char-count');
const btnClipRefresh = document.getElementById('btn-clip-refresh');
const btnClipCopy = document.getElementById('btn-clip-copy');
const btnClipClear = document.getElementById('btn-clip-clear');

// Navigation Tabs
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

// Internal State
let isExpanded = false;
let isPinned = false;
let currentMediaState = null;
let localPlayPosition = 0;
let localDuration = 0;
let isPlaying = false;
let waveAnimFrameId = null;

// ==========================================
// 1. INITIALIZE ROBO EYES (BATTERY-OPTIMIZED)
// ==========================================
const miniEyes = new RoboEyes(miniCanvas, {
    mini: true,
    primaryColor: '#00f0ff'
});

const largeEyes = new RoboEyes(largeCanvas, {
    mini: false,
    primaryColor: '#00f0ff'
});

// Since we start collapsed, pause large eyes immediately to save CPU/battery!
largeEyes.pause();

// Click large eyes to trigger cute wink
roboAvatarWrapper.addEventListener('click', () => {
    largeEyes.triggerWink();
    miniEyes.triggerWink();
    roboMoodTag.textContent = 'Winking! 😉';
    setTimeout(() => {
        roboMoodTag.textContent = 'Active • Online';
    }, 1200);
});

// Cursor Tracking Mode (Global Desktop + Local Fallback)
let canTrackMouse = true;

chkFollowMouse.addEventListener('change', (e) => {
    canTrackMouse = e.target.checked;
    largeEyes.trackMouse = canTrackMouse;
    miniEyes.trackMouse = canTrackMouse;
    ipcRenderer.send('toggle-cursor-tracking', canTrackMouse);
});

// Real-time desktop-wide cursor tracking from Electron main process
ipcRenderer.on('global-cursor-move', (event, data) => {
    if (!canTrackMouse || !data) return;
    const { relX, relY } = data;
    
    // Collapsed mini eyes track mouse across entire desktop
    miniEyes.lookAt(relX, relY);
    
    // Expanded large eyes track mouse across entire desktop
    if (isExpanded) {
        largeEyes.lookAt(relX, relY);
    }
});

// Local window hover fallback
window.addEventListener('mousemove', (e) => {
    if (!canTrackMouse) return;
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const relX = (e.clientX / width) * 2 - 1;
    const relY = (e.clientY / height) * 2 - 1;
    
    miniEyes.lookAt(relX, relY);
    if (isExpanded) {
        largeEyes.lookAt(relX, relY);
    }
});

// ==========================================
// 2. EXPAND / COLLAPSE ORCHESTRATION & INTERACTIONS
// ==========================================
collapsedView.addEventListener('click', () => {
    expandIsland();
});

// Double click mini eyes to toggle media playback without expanding
collapsedView.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    ipcRenderer.send('media-action', { action: 'playpause' });
    miniEyes.triggerWink();
});

// Right click mini eyes for quick native context menu
collapsedView.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.send('show-mini-context-menu');
});

btnCollapse.addEventListener('click', (e) => {
    e.stopPropagation();
    collapseIsland();
});

btnPin.addEventListener('click', (e) => {
    e.stopPropagation();
    isPinned = !isPinned;
    btnPin.classList.toggle('active', isPinned);
    ipcRenderer.send('toggle-pin', isPinned);
});

function expandIsland() {
    isExpanded = true;
    islandContainer.classList.remove('collapsed');
    islandContainer.classList.add('expanded');
    miniEyes.pause();   // Pause mini eyes loop when expanded to save CPU
    largeEyes.resume(); // Start large eyes loop
    if (isPlaying) startAudioWave();
    ipcRenderer.send('expand-island');
}

function collapseIsland() {
    isExpanded = false;
    islandContainer.classList.remove('expanded');
    islandContainer.classList.add('collapsed');
    miniEyes.resume();  // Resume mini eyes loop
    largeEyes.pause();  // Pause large eyes loop to save CPU & battery!
    stopAudioWave();    // Pause wave loop
    ipcRenderer.send('collapse-island');
}

ipcRenderer.on('island-state-changed', (event, payload) => {
    if (!payload) return;
    const { expanded, pinned } = payload;
    isExpanded = expanded;
    isPinned = pinned;
    btnPin.classList.toggle('active', pinned);
    if (expanded) {
        islandContainer.classList.remove('collapsed');
        islandContainer.classList.add('expanded');
        miniEyes.pause();
        largeEyes.resume();
        if (isPlaying) startAudioWave();
    } else {
        islandContainer.classList.remove('expanded');
        islandContainer.classList.add('collapsed');
        miniEyes.resume();
        largeEyes.pause();
        stopAudioWave();
    }
});

// ==========================================
// 3. TAB NAVIGATION (ON-DEMAND STATS)
// ==========================================
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');

        if (targetId === 'tab-tools') {
            updateClipboardPreview();
        }

        // Notify main process to only fetch stats on-demand
        ipcRenderer.send('tab-changed', targetId);
    });
});

// ==========================================
// 4. MEDIA CONTROLS & SMOOTH PROGRESSIVE BAR
// ==========================================
function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateProgressDisplay() {
    timeCurrent.textContent = formatTime(localPlayPosition);
    timeTotal.textContent = formatTime(localDuration);
    const percent = (localDuration > 0) ? Math.min(100, Math.max(0, (localPlayPosition / localDuration) * 100)) : 0;
    timelineProgress.style.width = `${percent}%`;
}

// 1-second ticker: advances progress bar locally without heavy polling
setInterval(() => {
    if (isPlaying && localDuration > 0) {
        localPlayPosition = Math.min(localDuration, localPlayPosition + 1);
        updateProgressDisplay();
    }
}, 1000);

// Interactive Click-to-Seek Progressive Bar
timelineClickableArea.addEventListener('click', (e) => {
    const rect = timelineClickableArea.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    if (localDuration > 0) {
        const targetSeconds = Math.round(ratio * localDuration);
        localPlayPosition = targetSeconds;
        updateProgressDisplay();
        ipcRenderer.send('media-action', { action: 'seek', param: targetSeconds });
    }
});

ipcRenderer.on('media-update', (event, data) => {
    if (!data) return;
    currentMediaState = data;
    renderMedia(data);
});

function renderMedia(data) {
    isPlaying = (data.status === 'Playing');
    const hasMedia = Boolean(data.success && data.title);

    miniEyes.setMusicPlaying(isPlaying);
    largeEyes.setMusicPlaying(isPlaying);

    // Mini audio equalizer bars in collapsed mode
    if (miniAudioDot) {
        miniAudioDot.style.display = isPlaying ? 'flex' : 'none';
    }

    if (isPlaying) {
        vinylDisc.classList.add('spinning');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        mediaStatusBadge.textContent = 'Playing';
        mediaStatusBadge.classList.add('playing');
        if (isExpanded) startAudioWave();
    } else {
        vinylDisc.classList.remove('spinning');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        mediaStatusBadge.textContent = hasMedia ? 'Paused' : 'Idle';
        mediaStatusBadge.classList.remove('playing');
        stopAudioWave();
    }

    if (hasMedia) {
        trackTitle.textContent = data.title || 'Playing Media';
        trackArtist.textContent = (data.artist || 'Unknown Artist') + (data.albumTitle ? ` • ${data.albumTitle}` : '');

        let sourceName = 'Media Player';
        const src = (data.source || '').toLowerCase();
        if (src.includes('spotify')) sourceName = 'Spotify';
        else if (src.includes('brave') || src.includes('chrome') || src.includes('msedge') || src.includes('firefox')) sourceName = 'YouTube / Browser';
        else if (src.includes('applemusic') || src.includes('itunes')) sourceName = 'Apple Music';
        else if (src.includes('vlc')) sourceName = 'VLC';
        mediaSourceBadge.textContent = sourceName;

        if (typeof data.position === 'number' && data.position >= 0) {
            localPlayPosition = data.position;
        }
        if (typeof data.duration === 'number' && data.duration > 0) {
            localDuration = data.duration;
        }
        updateProgressDisplay();
    } else {
        trackTitle.textContent = 'Ready for Media';
        trackArtist.textContent = 'Play on YouTube, Spotify, or your favorite music player';
        mediaSourceBadge.textContent = 'Ready';
        timelineProgress.style.width = '0%';
        timeCurrent.textContent = '0:00';
        timeTotal.textContent = '0:00';
    }
}

// Media Buttons
btnPlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    isPlaying = !isPlaying;
    if (isPlaying) {
        vinylDisc.classList.add('spinning');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        mediaStatusBadge.textContent = 'Playing';
        mediaStatusBadge.classList.add('playing');
        startAudioWave();
    } else {
        vinylDisc.classList.remove('spinning');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        mediaStatusBadge.textContent = 'Paused';
        mediaStatusBadge.classList.remove('playing');
        stopAudioWave();
    }
    largeEyes.triggerBlink();
    ipcRenderer.send('media-action', { action: 'playpause' });
});

btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    largeEyes.lookAt(0.9, 0);
    setTimeout(() => largeEyes.lookAt(0, 0), 400);
    ipcRenderer.send('media-action', { action: 'next' });
});

btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    largeEyes.lookAt(-0.9, 0);
    setTimeout(() => largeEyes.lookAt(0, 0), 400);
    ipcRenderer.send('media-action', { action: 'prev' });
});

btnMute.addEventListener('click', () => ipcRenderer.send('media-action', { action: 'mute' }));
btnVolUp.addEventListener('click', () => ipcRenderer.send('media-action', { action: 'volup' }));
btnVolDown.addEventListener('click', () => ipcRenderer.send('media-action', { action: 'voldown' }));

// Audio Wave (Runs ONLY when playing and expanded)
const waveCtx = mediaWaveCanvas.getContext('2d');
const waveBars = 8;
const barHeights = new Array(waveBars).fill(2);

function startAudioWave() {
    if (waveAnimFrameId) return;
    const animateWave = () => {
        if (!isPlaying || !isExpanded) {
            waveAnimFrameId = null;
            return;
        }

        waveCtx.clearRect(0, 0, mediaWaveCanvas.width, mediaWaveCanvas.height);
        const barWidth = 6;
        const barGap = 4;
        const startX = (mediaWaveCanvas.width - (waveBars * (barWidth + barGap))) / 2;

        for (let i = 0; i < waveBars; i++) {
            const target = 2 + Math.random() * 18;
            barHeights[i] += (target - barHeights[i]) * 0.25;
            const h = Math.max(2, barHeights[i]);
            const x = startX + i * (barWidth + barGap);
            const y = mediaWaveCanvas.height - h;

            waveCtx.fillStyle = '#00f0ff';
            waveCtx.beginPath();
            waveCtx.roundRect(x, y, barWidth, h, 2);
            waveCtx.fill();
        }
        waveAnimFrameId = requestAnimationFrame(animateWave);
    };
    waveAnimFrameId = requestAnimationFrame(animateWave);
}

function stopAudioWave() {
    if (waveAnimFrameId) {
        cancelAnimationFrame(waveAnimFrameId);
        waveAnimFrameId = null;
    }
    waveCtx.clearRect(0, 0, mediaWaveCanvas.width, mediaWaveCanvas.height);
}

// ==========================================
// 5. HARDWARE MONITORING
// ==========================================
ipcRenderer.on('system-stats', (event, stats) => {
    if (!stats) return;

    // RAM
    if (stats.mem) {
        ramPercent.textContent = stats.mem.percent;
        ramBarFill.style.width = `${stats.mem.percent}%`;
        ramUsed.textContent = `${stats.mem.usedGB} GB`;
        ramTotal.textContent = `${stats.mem.totalGB} GB`;

        if (stats.mem.percent > 85) {
            ramStatusBadge.textContent = 'High Load';
            ramStatusBadge.className = 'badge-tag tag-red';
            ramBarFill.className = 'stat-bar-fill fill-red';
            largeEyes.setHighLoad(true);
            miniEyes.setHighLoad(true);
        } else if (stats.mem.percent > 70) {
            ramStatusBadge.textContent = 'Moderate';
            ramStatusBadge.className = 'badge-tag tag-amber';
            ramBarFill.className = 'stat-bar-fill fill-amber';
            largeEyes.setHighLoad(false);
            miniEyes.setHighLoad(false);
        } else {
            ramStatusBadge.textContent = 'Optimal';
            ramStatusBadge.className = 'badge-tag tag-cyan';
            ramBarFill.className = 'stat-bar-fill fill-cyan';
            largeEyes.setHighLoad(false);
            miniEyes.setHighLoad(false);
        }
    }

    // CPU
    if (stats.cpu) {
        cpuPercent.textContent = stats.cpu.percent;
        cpuBarFill.style.width = `${stats.cpu.percent}%`;
    }

    // Disks (if present)
    if (stats.disks && stats.disks.length > 0) {
        disksContainer.innerHTML = stats.disks.map(d => {
            const colorClass = d.percent > 85 ? 'fill-red' : (d.percent > 70 ? 'fill-amber' : 'fill-cyan');
            return `
                <div class="disk-row">
                    <div class="disk-info-header">
                        <span class="disk-name">Drive ${d.mount} (${d.totalGB} GB Total)</span>
                        <span class="disk-used-text">${d.usedGB} GB used • ${d.freeGB} GB free (${d.percent}%)</span>
                    </div>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill ${colorClass}" style="width: ${d.percent}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Background apps (if present)
    if (stats.processes && stats.processes.list) {
        tabAppsCount.textContent = stats.processes.total || 0;
        if (stats.processes.list.length > 0) {
            processList.innerHTML = stats.processes.list.map(p => `
                <div class="proc-item">
                    <div class="proc-left">
                        <div class="proc-dot"></div>
                        <span class="proc-name">${p.name}</span>
                        <span class="proc-pid">#${p.pid}</span>
                    </div>
                    <div class="proc-right">
                        <span class="proc-mem">${p.memMB} MB</span>
                        <button class="proc-kill-btn" data-pid="${p.pid}" title="End Process">End</button>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.proc-kill-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const pid = e.target.dataset.pid;
                    if (pid) {
                        e.target.textContent = '...';
                        ipcRenderer.send('system-action', { action: 'kill', pid });
                    }
                });
            });
        }
    }
});

btnOpenTaskmgr.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'taskmgr' }));

// Mood & Color Pickers
moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        moodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mood = btn.dataset.mood;
        largeEyes.setMood(mood);
        miniEyes.setMood(mood);
        roboMoodTag.textContent = `Mood: ${mood.toUpperCase()}`;
    });
});

colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.dataset.color;
        largeEyes.setColor(color);
        miniEyes.setColor(color);
    });
});

// Tools Actions
toolSnip.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'snip' }));
toolTaskmgr.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'taskmgr' }));
if (toolCalc) toolCalc.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'calc' }));
if (toolNotepad) toolNotepad.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'notepad' }));
if (toolTerminal) toolTerminal.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'terminal' }));
if (toolSound) toolSound.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'sound' }));
if (toolHide) toolHide.addEventListener('click', () => ipcRenderer.send('hide-island'));
toolSettings.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'settings' }));
toolLock.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'lock' }));

// Toast Notification Engine
let toastTimer = null;
function showToast(text, duration = 1800) {
    if (!islandToast) return;
    islandToast.textContent = text;
    islandToast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        islandToast.style.display = 'none';
    }, duration);
}

// Auto-Hide During Video Playback (YouTube / Web video)
if (chkAutoHideVideo) {
    chkAutoHideVideo.addEventListener('change', (e) => {
        ipcRenderer.send('set-autohide-video', e.target.checked);
        showToast(e.target.checked ? '✓ Video Auto-Hide Active (YouTube / Web)' : 'Video Auto-Hide Disabled');
    });
}

// Auto-Hide While Browsing (Never hides on Home Screen)
if (chkAutoHideIdle) {
    chkAutoHideIdle.addEventListener('change', (e) => {
        ipcRenderer.send('set-autohide-browsing', e.target.checked);
        showToast(e.target.checked ? '✓ Auto-Hide in Browsers Active' : 'Browser Auto-Hide Disabled');
    });
}

// Visibility State Changes from Main (Hotkeys Alt+H / Edge Peek)
ipcRenderer.on('island-visibility-changed', (event, visible) => {
    if (visible) {
        islandContainer.classList.remove('hiding');
        miniEyes.resume();
        miniEyes.triggerWink();
    } else {
        islandContainer.classList.add('hiding');
    }
});

// Memory Trim Action
if (btnTrimMem) {
    btnTrimMem.addEventListener('click', () => {
        btnTrimMem.textContent = '...';
        ipcRenderer.send('system-action', { action: 'trim-mem' });
        setTimeout(() => {
            btnTrimMem.textContent = '✓ Done';
            setTimeout(() => { btnTrimMem.textContent = 'Trim'; }, 1500);
        }, 800);
    });
}

// Clipboard Preview & Management
const { clipboard } = require('electron');

function updateClipboardPreview() {
    try {
        const text = clipboard.readText();
        if (text && text.trim().length > 0) {
            clipPreviewText.textContent = text.length > 140 ? text.slice(0, 140) + '...' : text;
            clipCharCount.textContent = `${text.length} chars`;
        } else {
            clipPreviewText.textContent = 'Clipboard is empty';
            clipCharCount.textContent = '0 chars';
        }
    } catch (e) {
        clipPreviewText.textContent = 'Clipboard inaccessible';
    }
}

if (btnClipRefresh) {
    btnClipRefresh.addEventListener('click', () => {
        updateClipboardPreview();
        btnClipRefresh.textContent = '✓';
        setTimeout(() => { btnClipRefresh.textContent = '↻'; }, 700);
    });
}

if (btnClipCopy) {
    btnClipCopy.addEventListener('click', () => {
        const current = clipboard.readText();
        if (current) {
            btnClipCopy.textContent = '✓ Copied';
            setTimeout(() => { btnClipCopy.textContent = 'Copy'; }, 1000);
        }
    });
}

if (btnClipClear) {
    btnClipClear.addEventListener('click', () => {
        clipboard.clear();
        updateClipboardPreview();
    });
}

// Battery Telemetry via Native Web Battery API (0% CPU, event-driven)
if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
        function renderBattery() {
            const level = Math.round(battery.level * 100);
            const isCharging = battery.charging;
            if (batteryPct) batteryPct.textContent = `${level}%`;
            if (batteryIcon) batteryIcon.textContent = isCharging ? '⚡' : (level > 20 ? '🔋' : '🪫');
            if (batteryIndicator) {
                batteryIndicator.className = 'header-battery-pill' + 
                    (isCharging ? ' charging' : (level <= 20 ? ' low' : ''));
            }

            // Low battery cute reaction
            if (level <= 15 && !isCharging) {
                miniEyes.setMood('sleepy');
                largeEyes.setMood('sleepy');
                if (roboMoodTag) roboMoodTag.textContent = 'Battery Low (Sleepy)';
            }
        }
        renderBattery();
        battery.addEventListener('levelchange', renderBattery);
        battery.addEventListener('chargingchange', renderBattery);
    }).catch(() => {});
}

// Mood Synchronization from Native Context Menu
ipcRenderer.on('set-mood', (event, mood) => {
    if (!mood) return;
    largeEyes.setMood(mood);
    miniEyes.setMood(mood);
    if (roboMoodTag) roboMoodTag.textContent = `Mood: ${mood.toUpperCase()}`;
    moodBtns.forEach(b => b.classList.toggle('active', b.dataset.mood === mood));
});

// Initialize global desktop cursor tracking
ipcRenderer.send('toggle-cursor-tracking', true);
