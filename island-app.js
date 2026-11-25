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
const timelineTooltip = document.getElementById('timeline-tooltip');
const timelineThumb = document.getElementById('timeline-thumb');
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
let isScrubbing = false;
let seekCooldown = 0;
let lastMediaTitle = '';
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

    if (localDuration > 0) {
        timeTotal.textContent = formatTime(localDuration);
        const percent = Math.min(100, Math.max(0, (localPlayPosition / localDuration) * 100));
        timelineProgress.classList.remove('streaming-pulse');
        timelineProgress.style.width = `${percent}%`;
    } else if (isPlaying) {
        timeTotal.textContent = '--:--';
        timelineProgress.classList.add('streaming-pulse');
    } else {
        timeTotal.textContent = '0:00';
        timelineProgress.classList.remove('streaming-pulse');
        timelineProgress.style.width = '0%';
    }
}

// 250ms high-precision smooth ticker: advances progressive bar locally with high fluidity
let lastTickerTick = performance.now();
setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTickerTick) / 1000;
    lastTickerTick = now;

    if (isPlaying && !isScrubbing) {
        if (localDuration > 0) {
            localPlayPosition = Math.min(localDuration, localPlayPosition + dt);
        } else {
            // Live stream / YouTube / browser audio with unknown duration
            localPlayPosition += dt;
        }
        updateProgressDisplay();
    }
}, 250);

// Helper to calculate seek ratio from mouse event
function getTimelineRatio(e) {
    const rect = timelineClickableArea.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    return Math.max(0, Math.min(1, clickX / rect.width));
}

// Hover preview tooltip & live time preview
timelineClickableArea.addEventListener('mousemove', (e) => {
    if (timelineTooltip) {
        const ratio = getTimelineRatio(e);
        const rect = timelineClickableArea.getBoundingClientRect();
        const tooltipX = Math.max(16, Math.min(rect.width - 16, e.clientX - rect.left));
        timelineTooltip.style.left = `${tooltipX}px`;

        if (localDuration > 0) {
            const previewSeconds = Math.round(ratio * localDuration);
            timelineTooltip.textContent = formatTime(previewSeconds);
        } else {
            timelineTooltip.textContent = formatTime(localPlayPosition);
        }
    }
});

// Interactive Click & Drag Scrubbing
timelineClickableArea.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isScrubbing = true;
    timelineClickableArea.classList.add('scrubbing');
    timelineProgress.classList.add('no-transition');

    const ratio = getTimelineRatio(e);
    if (localDuration > 0) {
        localPlayPosition = ratio * localDuration;
    }
    updateProgressDisplay();
});

window.addEventListener('mousemove', (e) => {
    if (!isScrubbing) return;
    const ratio = getTimelineRatio(e);
    if (localDuration > 0) {
        localPlayPosition = ratio * localDuration;
    }
    updateProgressDisplay();

    if (timelineTooltip) {
        const rect = timelineClickableArea.getBoundingClientRect();
        const tooltipX = Math.max(16, Math.min(rect.width - 16, e.clientX - rect.left));
        timelineTooltip.style.left = `${tooltipX}px`;
        const previewSeconds = (localDuration > 0) ? Math.round(ratio * localDuration) : Math.round(localPlayPosition);
        timelineTooltip.textContent = formatTime(previewSeconds);
    }
});

window.addEventListener('mouseup', (e) => {
    if (!isScrubbing) return;
    isScrubbing = false;
    timelineClickableArea.classList.remove('scrubbing');
    timelineProgress.classList.remove('no-transition');

    const targetSeconds = Math.round(localPlayPosition);
    seekCooldown = Date.now() + 2000; // 2-second grace period against stale incoming polling snapshots
    ipcRenderer.send('media-action', { action: 'seek', param: targetSeconds });
    updateProgressDisplay();
});

// Click fallback
timelineClickableArea.addEventListener('click', (e) => {
    const ratio = getTimelineRatio(e);
    if (localDuration > 0) {
        const targetSeconds = Math.round(ratio * localDuration);
        localPlayPosition = targetSeconds;
        seekCooldown = Date.now() + 2000;
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

        const currentTitle = (data.title || '').trim();
        if (currentTitle && currentTitle !== lastMediaTitle) {
            // New track detected: cleanly reset timeline
            lastMediaTitle = currentTitle;
            localPlayPosition = (typeof data.position === 'number' && data.position >= 0) ? data.position : 0;
            localDuration = (typeof data.duration === 'number' && data.duration > 0) ? data.duration : 0;
            seekCooldown = 0;
        } else {
            // Same track: update duration if available
            if (typeof data.duration === 'number' && data.duration > 0) {
                localDuration = data.duration;
            }
            // Update position only if outside seekCooldown and not actively scrubbing
            const now = Date.now();
            if (!isScrubbing && now > seekCooldown) {
                if (typeof data.position === 'number' && data.position >= 0) {
                    const diff = Math.abs(localPlayPosition - data.position);
                    // Sync only if difference is significant (> 1.5s) to avoid jitter with local smooth ticker
                    if (diff > 1.5 || localDuration <= 0) {
                        localPlayPosition = data.position;
                    }
                }
            }
        }
        updateProgressDisplay();
    } else {
        lastMediaTitle = '';
        localPlayPosition = 0;
        localDuration = 0;
        trackTitle.textContent = 'Ready for Media';
        trackArtist.textContent = 'Play on YouTube, Spotify, or your favorite music player';
        mediaSourceBadge.textContent = 'Ready';
        timelineProgress.classList.remove('streaming-pulse');
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


// ==========================================
// 6. PROCEDURAL FUTURISTIC AUDIO CHIMES (WEB AUDIO API)
// ==========================================
let audioCtx = null;
let soundEffectsEnabled = true;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playFuturisticChime(type = 'wink') {
    if (!soundEffectsEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'wink') {
            // Cute sci-fi chirp (580Hz -> 880Hz)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(580, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } else if (type === 'timer') {
            // Celebratory victory chord (520Hz, 660Hz, 880Hz)
            [520, 660, 880].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.1, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.45);
            });
        } else if (type === 'save') {
            // Subtle pleasant confirmation ping (720Hz)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(720, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        }
    } catch (e) {}
}

// ==========================================
// 7. PERSISTENT SETTINGS ENGINE ("SAVE SETTINGS OPTIONS")
// ==========================================
const chkRainbowMode = document.getElementById('chk-rainbow-mode');
const chkHoverPeek = document.getElementById('chk-hover-peek');
const chkSoundFx = document.getElementById('chk-sound-fx');
const chkAlwaysTop = document.getElementById('chk-always-top');

function savePersistentSetting(key, value) {
    try {
        localStorage.setItem(`robo_${key}`, JSON.stringify(value));
    } catch(e) {}
    ipcRenderer.send('save-setting', { key, value });
    playFuturisticChime('save');
    showToast(`✓ Preference Saved: ${key}`);
}

function loadSavedSettings() {
    ipcRenderer.send('get-settings');
}

ipcRenderer.on('settings-loaded', (event, settings) => {
    if (!settings) return;

    // 1. Mood
    if (settings.mood) {
        largeEyes.setMood(settings.mood);
        miniEyes.setMood(settings.mood);
        if (roboMoodTag) roboMoodTag.textContent = `Mood: ${settings.mood.toUpperCase()}`;
        moodBtns.forEach(b => b.classList.toggle('active', b.dataset.mood === settings.mood));
    }

    // 2. Eye Color
    if (settings.eyeColor) {
        largeEyes.setColor(settings.eyeColor);
        miniEyes.setColor(settings.eyeColor);
        colorSwatches.forEach(s => s.classList.toggle('active', s.dataset.color === settings.eyeColor));
    }

    // 3. Rainbow Mode
    if (chkRainbowMode) {
        chkRainbowMode.checked = Boolean(settings.rainbowMode);
        largeEyes.setRainbow(settings.rainbowMode);
        miniEyes.setRainbow(settings.rainbowMode);
    }

    // 4. Follow Mouse
    if (chkFollowMouse) {
        const follow = settings.followMouse !== false;
        chkFollowMouse.checked = follow;
        canTrackMouse = follow;
        largeEyes.trackMouse = follow;
        miniEyes.trackMouse = follow;
    }

    // 5. Auto-Hide Video
    if (chkAutoHideVideo) {
        chkAutoHideVideo.checked = Boolean(settings.autohideVideo);
    }

    // 6. Auto-Hide Browsing
    if (chkAutoHideIdle) {
        chkAutoHideIdle.checked = Boolean(settings.autohideBrowsing);
    }

    // 7. Hover Peek
    if (chkHoverPeek) {
        chkHoverPeek.checked = settings.hoverPeek !== false;
    }

    // 8. Sound Effects
    if (chkSoundFx) {
        soundEffectsEnabled = settings.soundEffects !== false;
        chkSoundFx.checked = soundEffectsEnabled;
    }

    // 9. Always On Top
    if (chkAlwaysTop) {
        chkAlwaysTop.checked = settings.alwaysOnTop !== false;
    }

    // 10. Volume
    if (typeof settings.volume === 'number' && volSlider) {
        volSlider.value = settings.volume;
        if (volPctText) volPctText.textContent = `${settings.volume}%`;
    }

    // 11. Visualizer Mode
    if (settings.visualizerMode) {
        activeVisualizerMode = settings.visualizerMode;
        vizBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.viz === activeVisualizerMode));
    }
});

// Settings Event Listeners
if (chkRainbowMode) {
    chkRainbowMode.addEventListener('change', (e) => {
        const isRainbow = e.target.checked;
        largeEyes.setRainbow(isRainbow);
        miniEyes.setRainbow(isRainbow);
        savePersistentSetting('rainbowMode', isRainbow);
    });
}

if (chkHoverPeek) {
    chkHoverPeek.addEventListener('change', (e) => {
        ipcRenderer.send('set-hover-peek', e.target.checked);
        savePersistentSetting('hoverPeek', e.target.checked);
    });
}

if (chkSoundFx) {
    chkSoundFx.addEventListener('change', (e) => {
        soundEffectsEnabled = e.target.checked;
        savePersistentSetting('soundEffects', soundEffectsEnabled);
    });
}

if (chkAlwaysTop) {
    chkAlwaysTop.addEventListener('change', (e) => {
        ipcRenderer.send('save-setting', { key: 'alwaysOnTop', value: e.target.checked });
        savePersistentSetting('alwaysOnTop', e.target.checked);
    });
}

// Hook into existing mood/color pickers for auto-save
moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        savePersistentSetting('mood', mood);
        playFuturisticChime('wink');
    });
});

colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        if (chkRainbowMode) chkRainbowMode.checked = false;
        largeEyes.setRainbow(false);
        miniEyes.setRainbow(false);
        savePersistentSetting('eyeColor', color);
        savePersistentSetting('rainbowMode', false);
    });
});

// Update wink trigger to play chime
const origAvatarClick = roboAvatarWrapper ? roboAvatarWrapper.onclick : null;
if (roboAvatarWrapper) {
    roboAvatarWrapper.addEventListener('click', () => {
        playFuturisticChime('wink');
    });
}

// ==========================================
// 8. AUDIO VISUALIZER MODES & MASTER VOLUME SLIDER
// ==========================================
const vizBtns = document.querySelectorAll('.viz-btn');
const volSlider = document.getElementById('vol-slider');
const volPctText = document.getElementById('vol-pct-text');
let activeVisualizerMode = 'wave';

vizBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        vizBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeVisualizerMode = btn.dataset.viz;
        savePersistentSetting('visualizerMode', activeVisualizerMode);
    });
});

if (volSlider) {
    volSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (volPctText) volPctText.textContent = `${val}%`;
    });
    volSlider.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        savePersistentSetting('volume', val);
        showToast(`Volume: ${val}%`);
    });
}

// ==========================================
// 9. PRODUCTIVITY FOCUS & POMODORO TIMER
// ==========================================
const pomoTimeDisplay = document.getElementById('pomo-time-display');
const pomoProgressBar = document.getElementById('pomo-progress-bar');
const pomoStatusTag = document.getElementById('pomo-status-tag');
const btnPomoToggle = document.getElementById('btn-pomo-toggle');
const btnPomoReset = document.getElementById('btn-pomo-reset');
const pomoPresetBtns = document.querySelectorAll('.pomo-preset-btn');

let pomoTotalSeconds = 25 * 60;
let pomoRemainingSeconds = 25 * 60;
let pomoTimerId = null;
let isPomoRunning = false;

function renderPomoDisplay() {
    const m = Math.floor(pomoRemainingSeconds / 60);
    const s = pomoRemainingSeconds % 60;
    if (pomoTimeDisplay) pomoTimeDisplay.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    if (pomoProgressBar) {
        // Progressive bar fills from 0% up to 100% as time is focused
        const elapsed = pomoTotalSeconds - pomoRemainingSeconds;
        const pct = pomoTotalSeconds > 0 ? Math.min(100, Math.max(0, (elapsed / pomoTotalSeconds) * 100)) : 0;
        pomoProgressBar.style.width = `${pct}%`;
    }
}

pomoPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        pomoPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mins = parseInt(btn.dataset.mins, 10) || 25;
        pomoTotalSeconds = mins * 60;
        pomoRemainingSeconds = pomoTotalSeconds;
        if (isPomoRunning) {
            clearInterval(pomoTimerId);
            isPomoRunning = false;
            btnPomoToggle.textContent = '▶ Start';
        }
        if (pomoStatusTag) {
            pomoStatusTag.textContent = `${mins}m Set`;
            pomoStatusTag.className = 'pomo-badge tag-cyan';
        }
        renderPomoDisplay();
    });
});

if (btnPomoToggle) {
    btnPomoToggle.addEventListener('click', () => {
        if (!isPomoRunning) {
            isPomoRunning = true;
            btnPomoToggle.textContent = '⏸ Pause';
            btnPomoToggle.className = 'pomo-btn secondary';
            if (pomoStatusTag) {
                pomoStatusTag.textContent = 'Focusing';
                pomoStatusTag.className = 'pomo-badge tag-green';
            }
            largeEyes.setMood('focus');
            miniEyes.setMood('focus');

            pomoTimerId = setInterval(() => {
                if (pomoRemainingSeconds > 0) {
                    pomoRemainingSeconds--;
                    renderPomoDisplay();
                } else {
                    clearInterval(pomoTimerId);
                    isPomoRunning = false;
                    btnPomoToggle.textContent = '▶ Start';
                    btnPomoToggle.className = 'pomo-btn primary';
                    if (pomoStatusTag) {
                        pomoStatusTag.textContent = 'Completed! 🎉';
                        pomoStatusTag.className = 'pomo-badge tag-pink';
                    }
                    largeEyes.setMood('excited');
                    miniEyes.setMood('excited');
                    playFuturisticChime('timer');
                    showToast('🎉 Focus Session Completed! Great job!', 3500);
                }
            }, 1000);
        } else {
            clearInterval(pomoTimerId);
            isPomoRunning = false;
            btnPomoToggle.textContent = '▶ Resume';
            btnPomoToggle.className = 'pomo-btn primary';
            if (pomoStatusTag) {
                pomoStatusTag.textContent = 'Paused';
                pomoStatusTag.className = 'pomo-badge tag-amber';
            }
        }
    });
}

if (btnPomoReset) {
    btnPomoReset.addEventListener('click', () => {
        if (pomoTimerId) clearInterval(pomoTimerId);
        isPomoRunning = false;
        pomoRemainingSeconds = pomoTotalSeconds;
        if (btnPomoToggle) {
            btnPomoToggle.textContent = '▶ Start';
            btnPomoToggle.className = 'pomo-btn primary';
        }
        if (pomoStatusTag) {
            pomoStatusTag.textContent = 'Ready';
            pomoStatusTag.className = 'pomo-badge tag-cyan';
        }
        renderPomoDisplay();
    });
}

// Initial Settings Load on Launch
loadSavedSettings();
