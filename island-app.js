// Robo Island - Ultra-Smooth & Battery-Efficient Controller
const { ipcRenderer } = require('electron');

// DOM Elements
const islandContainer = document.getElementById('island-container');
const collapsedView = document.getElementById('collapsed-view');
const expandedView = document.getElementById('expanded-view');

// Mini View DOM
const miniCanvas = document.getElementById('mini-eyes-canvas');

// Header DOM
const largeCanvas = document.getElementById('large-eyes-canvas');
const roboAvatarWrapper = document.querySelector('.robo-avatar-wrapper');
const roboMoodTag = document.getElementById('robo-mood-tag');
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

// Tools DOM
const toolSnip = document.getElementById('tool-snip');
const toolTaskmgr = document.getElementById('tool-taskmgr');
const toolSettings = document.getElementById('tool-settings');
const toolLock = document.getElementById('tool-lock');

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

// Cursor Tracking Mode (Throttled for zero CPU lag)
let canTrackMouse = true;
let mouseMoveScheduled = false;
let cachedRect = null;

chkFollowMouse.addEventListener('change', (e) => {
    canTrackMouse = e.target.checked;
    largeEyes.trackMouse = canTrackMouse;
});

window.addEventListener('mousemove', (e) => {
    if (!canTrackMouse || !isExpanded) return;
    if (mouseMoveScheduled) return;

    mouseMoveScheduled = true;
    requestAnimationFrame(() => {
        if (!cachedRect) {
            cachedRect = islandContainer.getBoundingClientRect();
        }
        const relX = ((e.clientX - cachedRect.left) / cachedRect.width) * 2 - 1;
        const relY = ((e.clientY - cachedRect.top) / cachedRect.height) * 2 - 1;
        largeEyes.lookAt(relX, relY);
        mouseMoveScheduled = false;
    });
});

// ==========================================
// 2. EXPAND / COLLAPSE ORCHESTRATION
// ==========================================
collapsedView.addEventListener('click', () => {
    expandIsland();
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
    cachedRect = null;
    islandContainer.classList.remove('collapsed');
    islandContainer.classList.add('expanded');
    largeEyes.resume(); // Start large eyes loop
    if (isPlaying) startAudioWave();
    ipcRenderer.send('expand-island');
}

function collapseIsland() {
    isExpanded = false;
    cachedRect = null;
    islandContainer.classList.remove('expanded');
    islandContainer.classList.add('collapsed');
    largeEyes.pause(); // Pause large eyes loop to save CPU & battery!
    stopAudioWave();   // Pause wave loop
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
        largeEyes.resume();
        if (isPlaying) startAudioWave();
    } else {
        islandContainer.classList.remove('expanded');
        islandContainer.classList.add('collapsed');
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

// Tools
toolSnip.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'snip' }));
toolTaskmgr.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'taskmgr' }));
toolSettings.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'settings' }));
toolLock.addEventListener('click', () => ipcRenderer.send('system-action', { action: 'lock' }));
