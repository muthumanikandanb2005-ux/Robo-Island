const si = require('systeminformation');
const { exec } = require('child_process');
const EventEmitter = require('events');

class SystemService extends EventEmitter {
    constructor() {
        super();
        this.currentStats = {
            mem: { totalGB: 0, usedGB: 0, freeGB: 0, percent: 0 },
            disks: [],
            cpu: { percent: 0 },
            processes: { total: 0, list: [] }
        };
        this.pollInterval = null;
        this.startPolling();
    }

    async fetchStats() {
        try {
            const [mem, fs, cpu, procs] = await Promise.all([
                si.mem(),
                si.fsSize(),
                si.currentLoad(),
                si.processes()
            ]);

            // Clean & format RAM
            const totalGB = (mem.total / 1024 / 1024 / 1024).toFixed(1);
            const usedGB = (mem.used / 1024 / 1024 / 1024).toFixed(1);
            const freeGB = (mem.free / 1024 / 1024 / 1024).toFixed(1);
            const memPercent = Math.round((mem.used / mem.total) * 100);

            // Clean & format Disks
            const disks = fs.map(d => ({
                fs: d.fs,
                mount: d.mount,
                type: d.type,
                totalGB: (d.size / 1024 / 1024 / 1024).toFixed(1),
                usedGB: (d.used / 1024 / 1024 / 1024).toFixed(1),
                freeGB: ((d.size - d.used) / 1024 / 1024 / 1024).toFixed(1),
                percent: Math.round(d.use)
            }));

            // Top background / foreground processes (sorted by RAM & CPU)
            const topList = (procs.list || [])
                .filter(p => p.name && !p.name.toLowerCase().startsWith('svchost') && !p.name.toLowerCase().startsWith('system idle'))
                .sort((a, b) => (b.mem + (b.cpu * 0.5)) - (a.mem + (a.cpu * 0.5)))
                .slice(0, 6)
                .map(p => ({
                    pid: p.pid,
                    name: p.name.replace(/\.exe$/i, ''),
                    memMB: Math.round(p.memRss / 1024),
                    memPercent: p.mem.toFixed(1),
                    cpuPercent: p.cpu.toFixed(1)
                }));

            this.currentStats = {
                mem: { totalGB, usedGB, freeGB, percent: memPercent },
                disks,
                cpu: { percent: Math.round(cpu.currentLoad) },
                processes: {
                    total: procs.all || 0,
                    running: procs.running || 0,
                    list: topList
                }
            };

            this.emit('stats', this.currentStats);
            return this.currentStats;
        } catch (err) {
            console.error('Error fetching system stats:', err);
            return this.currentStats;
        }
    }

    startPolling(intervalMs = 1500) {
        this.fetchStats();
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => this.fetchStats(), intervalMs);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    killProcess(pid) {
        return new Promise((resolve) => {
            exec(`taskkill /PID ${pid} /F`, (err, stdout, stderr) => {
                resolve({ success: !err, output: stdout || stderr });
                this.fetchStats(); // refresh immediately
            });
        });
    }

    openTaskManager() {
        exec('taskmgr.exe');
    }

    openSnippingTool() {
        exec('explorer ms-screenclip:');
    }

    openSettings() {
        exec('start ms-settings:');
    }

    lockWorkstation() {
        exec('rundll32.exe user32.dll,LockWorkStation');
    }
}

module.exports = new SystemService();
