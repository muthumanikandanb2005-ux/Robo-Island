// Robo Eyes Animation Engine
// Procedural vector animated robotic eyes with organic saccades, blinks, expressions and cursor tracking

class RoboEyes {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = Object.assign({
            primaryColor: '#00f0ff',
            glowColor: 'rgba(0, 240, 255, 0.45)',
            accentColor: '#ffffff',
            mini: false
        }, options);

        // Internal State
        this.mood = 'neutral';
        this.targetLookX = 0;
        this.targetLookY = 0;
        this.currentLookX = 0;
        this.currentLookY = 0;

        // Blinking
        this.blinkProgress = 0;
        this.isBlinking = false;
        this.lastBlinkTime = Date.now();
        this.nextBlinkInterval = 2500 + Math.random() * 3000;

        // Organic saccades
        this.lastSaccadeTime = Date.now();
        this.nextSaccadeInterval = 1200 + Math.random() * 2500;

        // Music pulse
        this.isMusicPlaying = false;
        this.pulsePhase = 0;

        // High load alert
        this.isHighLoad = false;

        // Tracking mouse
        this.trackMouse = true;
        this.mouseX = 0;
        this.mouseY = 0;

        // Ultra-compact mini eyes
        this.eyeWidth = this.options.mini ? 14 : 36;
        this.eyeHeight = this.options.mini ? 16 : 44;
        this.eyeRadius = this.options.mini ? 5 : 12;
        this.eyeSpacing = this.options.mini ? 8 : 18;

        this.animFrameId = null;
        this.start();
    }

    setMood(mood) {
        this.mood = mood;
    }

    setColor(colorHex) {
        this.options.primaryColor = colorHex;
        this.options.glowColor = colorHex + '77';
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

    update() {
        const now = Date.now();

        // 1. Organic Saccades
        if (!this.trackMouse || (this.mouseX === 0 && this.mouseY === 0)) {
            if (now - this.lastSaccadeTime > this.nextSaccadeInterval) {
                this.lastSaccadeTime = now;
                this.nextSaccadeInterval = 1200 + Math.random() * 2500;
                
                const rand = Math.random();
                if (rand < 0.45) {
                    this.targetLookX = 0;
                    this.targetLookY = 0;
                } else if (rand < 0.7) {
                    this.targetLookX = (Math.random() - 0.5) * 1.3;
                    this.targetLookY = (Math.random() - 0.5) * 0.5;
                } else {
                    this.targetLookX = (Math.random() > 0.5 ? 0.6 : -0.6);
                    this.targetLookY = -0.3;
                }
            }
        }

        // 2. Blink loop
        if (!this.isBlinking) {
            if (now - this.lastBlinkTime > this.nextBlinkInterval) {
                this.isBlinking = true;
                this.blinkProgress = 0;
                this.lastBlinkTime = now;
                this.nextBlinkInterval = 2500 + Math.random() * 3500;
            }
        } else {
            this.blinkProgress += 0.18;
            if (this.blinkProgress >= 1) {
                this.isBlinking = false;
                this.blinkProgress = 0;
            }
        }

        // 3. Smooth interpolation
        this.currentLookX += (this.targetLookX - this.currentLookX) * 0.2;
        this.currentLookY += (this.targetLookY - this.currentLookY) * 0.2;

        // 4. Music pulse
        if (this.isMusicPlaying) {
            this.pulsePhase += 0.12;
        } else {
            this.pulsePhase += 0.03;
        }
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        const maxLookOffset = this.options.mini ? 3 : 8;
        const lookOffsetX = this.currentLookX * maxLookOffset;
        const lookOffsetY = this.currentLookY * (maxLookOffset * 0.6);

        const pulse = this.isMusicPlaying 
            ? Math.sin(this.pulsePhase) * (this.options.mini ? 0.8 : 2)
            : Math.sin(this.pulsePhase) * (this.options.mini ? 0.2 : 0.6);

        const leftEyeCenterX = centerX - (this.eyeWidth / 2) - (this.eyeSpacing / 2) + lookOffsetX;
        const rightEyeCenterX = centerX + (this.eyeWidth / 2) + (this.eyeSpacing / 2) + lookOffsetX;
        const eyesCenterY = centerY + lookOffsetY;

        this.drawSingleEye(leftEyeCenterX, eyesCenterY, true, pulse);
        this.drawSingleEye(rightEyeCenterX, eyesCenterY, false, pulse);
    }

    drawSingleEye(x, y, isLeft, pulse) {
        const ctx = this.ctx;
        let w = this.eyeWidth + pulse;
        let h = this.eyeHeight + pulse;
        let r = this.eyeRadius;

        let blinkScale = 1;
        if (this.isBlinking) {
            blinkScale = 1 - Math.sin(this.blinkProgress * Math.PI);
        }

        if (this.mood === 'wink' && isLeft) {
            blinkScale = 0.08;
        }

        if (this.mood === 'sleepy') {
            blinkScale *= 0.45;
        }

        const effectiveHeight = Math.max(2.5, h * blinkScale);

        ctx.save();
        ctx.translate(x, y);

        ctx.shadowColor = this.options.glowColor;
        ctx.shadowBlur = this.options.mini ? 5 : 12;

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
            ctx.fillStyle = '#ff2a6d';
            ctx.shadowColor = 'rgba(255, 42, 109, 0.6)';
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
            ctx.strokeStyle = '#ff3366';
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

            // Pupil highlight
            if (effectiveHeight > 7) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                const glintSize = this.options.mini ? 2 : 4.5;
                const glintOffsetX = (isLeft ? -w * 0.18 : -w * 0.15) + (this.currentLookX * 1.5);
                const glintOffsetY = -effectiveHeight * 0.22 + (this.currentLookY * 1.5);
                ctx.arc(glintOffsetX, glintOffsetY, glintSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    start() {
        const loop = () => {
            this.update();
            this.draw();
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    stop() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = RoboEyes;
}
