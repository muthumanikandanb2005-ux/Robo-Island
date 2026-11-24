// Robo Eyes Animation Engine - Ultra-Smooth & Battery-Efficient
class RoboEyes {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = Object.assign({
            primaryColor: '#00f0ff',
            accentColor: '#ffffff',
            mini: false
        }, options);

        // Internal State
        this.mood = 'neutral';
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.currentLookX = 0;
        this.currentLookY = 0;
        this.lastLookAtTime = 0;
        this.trackMouse = true;

        // Blinking
        this.blinkProgress = 0;
        this.isBlinking = false;
        this.lastBlinkTime = Date.now();
        this.nextBlinkInterval = 2500 + Math.random() * 3000;

        // Organic saccades
        this.lastSaccadeTime = Date.now();
        this.nextSaccadeInterval = 1400 + Math.random() * 2500;

        // Music pulse
        this.isMusicPlaying = false;
        this.pulsePhase = 0;
        this.isHighLoad = false;

        // Geometry (Proportionate for 80x26 mini and 110x40 large canvas)
        this.eyeWidth = this.options.mini ? 14 : 26;
        this.eyeHeight = this.options.mini ? 16 : 26;
        this.eyeRadius = this.options.mini ? 5 : 8;
        this.eyeSpacing = this.options.mini ? 8 : 14;

        this.animFrameId = null;
        this.isRunning = false;
        this.start();
    }

    setMood(mood) {
        this.mood = mood;
    }

    setColor(colorHex) {
        this.options.primaryColor = colorHex;
    }

    setMusicPlaying(isPlaying) {
        this.isMusicPlaying = isPlaying;
    }

    setHighLoad(isHigh) {
        this.isHighLoad = isHigh;
        if (isHigh && this.mood !== 'dizzy') {
            this.setMood('dizzy');
        } else if (!isHigh && this.mood === 'dizzy') {
            this.setMood('neutral');
        }
    }

    lookAt(x, y) {
        this.targetLookX = Math.max(-1, Math.min(1, x));
        this.targetLookY = Math.max(-1, Math.min(1, y));
        this.lastLookAtTime = Date.now();
    }

    triggerBlink() {
        if (!this.isBlinking) {
            this.isBlinking = true;
            this.blinkProgress = 0;
        }
    }

    triggerWink() {
        this.mood = 'wink';
        setTimeout(() => {
            if (this.mood === 'wink') this.mood = 'neutral';
        }, 1200);
    }

    update(dt = 0.016) {
        const now = Date.now();

        // 1. Organic Saccades ONLY if not actively tracking mouse (idle for > 2.0s)
        const isTrackingActive = this.trackMouse && (now - this.lastLookAtTime < 2000);

        if (!isTrackingActive) {
            if (now - this.lastSaccadeTime > this.nextSaccadeInterval) {
                this.lastSaccadeTime = now;
                this.nextSaccadeInterval = 900 + Math.random() * 1800;
                
                const rand = Math.random();
                if (rand < 0.22) {
                    this.targetLookX = 0;
                    this.targetLookY = 0;
                } else if (rand < 0.55) {
                    this.targetLookX = (Math.random() - 0.5) * 1.8;
                    this.targetLookY = (Math.random() - 0.5) * 0.9;
                } else if (rand < 0.8) {
                    this.targetLookX = (Math.random() > 0.5 ? 0.9 : -0.9);
                    this.targetLookY = -0.35; // Curious upward peek
                } else {
                    this.targetLookX = (Math.random() - 0.5) * 1.4;
                    this.targetLookY = 0.6; // Downward glance
                }
            }
        }

        // 2. Framerate-independent blink loop (~180ms blink)
        if (!this.isBlinking) {
            if (now - this.lastBlinkTime > this.nextBlinkInterval) {
                this.isBlinking = true;
                this.blinkProgress = 0;
                this.lastBlinkTime = now;
                this.nextBlinkInterval = 2200 + Math.random() * 3200;
            }
        } else {
            this.blinkProgress += dt * 6.2;
            if (this.blinkProgress >= 1) {
                this.isBlinking = false;
                this.blinkProgress = 0;
            }
        }

        // 3. Ultra-smooth exponential spring interpolation (framerate-independent, snappy)
        const springFactor = 1 - Math.exp(-18 * dt);
        this.currentLookX += (this.targetLookX - this.currentLookX) * springFactor;
        this.currentLookY += (this.targetLookY - this.currentLookY) * springFactor;

        // 4. Music pulse
        if (this.isMusicPlaying) {
            this.pulsePhase += dt * 6.5;
        }
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        // Amplified eye movement ranges for noticeable, expressive tracking
        const maxLookOffsetX = this.options.mini ? 13 : 20;
        const maxLookOffsetY = this.options.mini ? 6 : 10;
        const lookOffsetX = this.currentLookX * maxLookOffsetX;
        const lookOffsetY = this.currentLookY * maxLookOffsetY;

        const pulse = this.isMusicPlaying 
            ? Math.sin(this.pulsePhase) * (this.options.mini ? 0.8 : 2)
            : 0;

        const leftEyeCenterX = centerX - (this.eyeWidth / 2) - (this.eyeSpacing / 2) + lookOffsetX;
        const rightEyeCenterX = centerX + (this.eyeWidth / 2) + (this.eyeSpacing / 2) + lookOffsetX;
        const eyesCenterY = centerY + lookOffsetY;

        this.drawSingleEye(leftEyeCenterX, eyesCenterY, true, pulse);
        this.drawSingleEye(rightEyeCenterX, eyesCenterY, false, pulse);
    }

    drawSingleEye(x, y, isLeft, pulse) {
        const ctx = this.ctx;
        const w = this.eyeWidth + pulse;
        const h = this.eyeHeight + pulse;
        const r = this.eyeRadius;

        let blinkScale = 1;
        if (this.isBlinking) {
            blinkScale = 1 - Math.sin(this.blinkProgress * Math.PI);
        }

        if (this.mood === 'wink' && isLeft) {
            blinkScale = 0.08;
        } else if (this.mood === 'sleepy') {
            blinkScale *= 0.45;
        }

        const effectiveHeight = Math.max(2.5, h * blinkScale);

        ctx.save();
        ctx.translate(x, y);

        // Expressive gaze tilt & micro-perspective
        const glanceTilt = this.currentLookX * (this.options.mini ? 0.08 : 0.12);
        ctx.rotate(glanceTilt);

        if (this.mood === 'happy') {
            ctx.beginPath();
            ctx.strokeStyle = this.options.primaryColor;
            ctx.lineWidth = this.options.mini ? 3 : 6;
            ctx.lineCap = 'round';
            const arcRadius = w / 1.6;
            ctx.arc(0, 3, arcRadius, Math.PI * 1.15, Math.PI * 1.85, false);
            ctx.stroke();

            ctx.fillStyle = this.options.accentColor;
            ctx.beginPath();
            ctx.arc(0, -arcRadius + 6, this.options.mini ? 1 : 2.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.mood === 'love') {
            ctx.fillStyle = '#ff007f';
            ctx.beginPath();
            const topCurveHeight = effectiveHeight * 0.3;
            ctx.moveTo(0, topCurveHeight);
            ctx.bezierCurveTo(0, 0, -w / 2, 0, -w / 2, topCurveHeight);
            ctx.bezierCurveTo(-w / 2, (effectiveHeight + topCurveHeight) / 2, 0, (effectiveHeight + topCurveHeight) / 1.2, 0, effectiveHeight);
            ctx.bezierCurveTo(0, (effectiveHeight + topCurveHeight) / 1.2, w / 2, (effectiveHeight + topCurveHeight) / 2, w / 2, topCurveHeight);
            ctx.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveHeight);
            ctx.closePath();
            ctx.fill();

        } else if (this.mood === 'dizzy') {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = this.options.mini ? 2 : 3.5;
            ctx.lineCap = 'round';
            const spin = (Date.now() / 140) * (isLeft ? 1 : -1);
            ctx.rotate(spin);
            ctx.beginPath();
            ctx.moveTo(-w / 2.5, -h / 2.5);
            ctx.lineTo(w / 2.5, h / 2.5);
            ctx.moveTo(w / 2.5, -h / 2.5);
            ctx.lineTo(-w / 2.5, h / 2.5);
            ctx.stroke();

        } else {
            // Standard rounded capsule eyes
            ctx.fillStyle = this.options.primaryColor;
            ctx.beginPath();
            const rx = -w / 2;
            const ry = -effectiveHeight / 2;
            const actualRadius = Math.min(r, effectiveHeight / 2);

            ctx.roundRect(rx, ry, w, effectiveHeight, actualRadius);
            ctx.fill();

            // Crisp pupil reflection glint with amplified 3D parallax tracking
            if (effectiveHeight > 6) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
                ctx.beginPath();
                const glintSize = this.options.mini ? 2.5 : 4.0;
                const glintMultX = this.options.mini ? 4.2 : 7.0;
                const glintMultY = this.options.mini ? 3.0 : 5.5;
                const glintOffsetX = (isLeft ? -w * 0.16 : -w * 0.12) + (this.currentLookX * glintMultX);
                const glintOffsetY = -effectiveHeight * 0.18 + (this.currentLookY * glintMultY);
                ctx.arc(glintOffsetX, glintOffsetY, glintSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        let lastTimestamp = performance.now();
        const loop = (timestamp) => {
            if (!this.isRunning) return;
            const now = timestamp || performance.now();
            const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
            lastTimestamp = now;
            this.update(dt);
            this.draw();
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    pause() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    resume() {
        this.start();
    }

    stop() {
        this.pause();
    }
}

if (typeof module !== 'undefined') {
    module.exports = RoboEyes;
}
