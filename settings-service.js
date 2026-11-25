const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_SETTINGS = {
    mood: 'neutral',
    eyeColor: '#00f0ff',
    rainbowMode: false,
    followMouse: true,
    autohideVideo: false,
    autohideBrowsing: false,
    hoverPeek: true,
    soundEffects: true,
    isPinned: false,
    startOnBoot: true,
    visualizerMode: 'wave',
    volume: 100,
    pomodoroMinutes: 25,
    alwaysOnTop: true
};

class SettingsService {
    constructor() {
        this.settingsPath = this.getStoragePath();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, this.load());
    }

    getStoragePath() {
        try {
            const baseDir = app ? app.getPath('userData') : (process.env.APPDATA || __dirname);
            if (!fs.existsSync(baseDir)) {
                fs.mkdirSync(baseDir, { recursive: true });
            }
            return path.join(baseDir, 'settings.json');
        } catch (e) {
            return path.join(__dirname, 'settings.json');
        }
    }

    load() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const raw = fs.readFileSync(this.settingsPath, 'utf8');
                return JSON.parse(raw);
            }
        } catch (err) {
            console.error('[SettingsService] Failed to load settings:', err.message);
        }
        return {};
    }

    save() {
        try {
            const dir = path.dirname(this.settingsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
        } catch (err) {
            console.error('[SettingsService] Failed to save settings:', err.message);
        }
    }

    get(key, fallback = null) {
        if (key in this.settings) {
            return this.settings[key];
        }
        return (fallback !== null) ? fallback : DEFAULT_SETTINGS[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
        return this.settings;
    }

    getAll() {
        return Object.assign({}, DEFAULT_SETTINGS, this.settings);
    }

    updateMultiple(obj) {
        if (obj && typeof obj === 'object') {
            Object.assign(this.settings, obj);
            this.save();
        }
        return this.settings;
    }
}

module.exports = new SettingsService();
