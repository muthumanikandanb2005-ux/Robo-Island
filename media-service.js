const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const EventEmitter = require('events');

class MediaService extends EventEmitter {
    constructor() {
        super();
        this.psProcess = null;
        this.isReady = false;
        this.currentMedia = {
            success: false,
            title: 'No media playing',
            artist: 'Idle',
            albumTitle: '',
            source: '',
            status: 'Stopped',
            position: 0,
            duration: 0
        };
        this.initDaemon();
    }

    initDaemon() {
        let scriptPath = path.join(__dirname, 'media_daemon.ps1');
        
        // Handle Electron asar packaging
        if (scriptPath.includes('app.asar')) {
            try {
                const userData = app ? app.getPath('userData') : (process.env.APPDATA || __dirname);
                if (!fs.existsSync(userData)) {
                    fs.mkdirSync(userData, { recursive: true });
                }
                const destPath = path.join(userData, 'media_daemon.ps1');
                const content = fs.readFileSync(scriptPath, 'utf8');
                fs.writeFileSync(destPath, content, 'utf8');
                scriptPath = destPath;
            } catch (err) {
                scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked');
            }
        }

        this.psProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]);

        let buffer = '';

        this.psProcess.stdout.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed === 'READY') {
                    this.isReady = true;
                    this.emit('ready');
                    this.requestStatus();
                } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const data = JSON.parse(trimmed);
                        this.currentMedia = data;
                        this.emit('update', data);
                    } catch (e) {}
                }
            }
        });

        this.psProcess.stderr.on('data', (err) => {
            console.error('[MediaDaemon Err]', err.toString());
        });

        this.psProcess.on('exit', () => {
            this.isReady = false;
            if (!this.destroyed) {
                setTimeout(() => this.initDaemon(), 2500);
            }
        });

        // Periodic poll every 1.5 seconds for media updates
        setInterval(() => {
            if (this.isReady) {
                this.sendCommand('status');
            }
        }, 1500);
    }

    sendCommand(cmd) {
        if (this.psProcess && this.psProcess.stdin && !this.psProcess.stdin.destroyed) {
            try {
                this.psProcess.stdin.write(cmd.trim() + '\n');
            } catch (err) {
                console.error('Error writing to daemon stdin:', err);
            }
        }
    }

    playPause() {
        this.sendCommand('playpause');
    }

    next() {
        this.sendCommand('next');
    }

    previous() {
        this.sendCommand('prev');
    }

    volumeUp() {
        this.sendCommand('volup');
    }

    volumeDown() {
        this.sendCommand('voldown');
    }

    toggleMute() {
        this.sendCommand('mute');
    }

    seek(seconds) {
        if (typeof seconds === 'number') {
            this.sendCommand(`seek:${seconds}`);
        }
    }

    requestStatus() {
        this.sendCommand('status');
    }

    destroy() {
        this.destroyed = true;
        if (this.psProcess) {
            this.sendCommand('exit');
            this.psProcess.kill();
        }
    }
}

module.exports = new MediaService();
