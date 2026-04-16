(function() {
    const canvas = document.getElementById('lasers');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const playerCanvas = document.getElementById('player');
    canvas.height = playerCanvas.height;
    canvas.width = playerCanvas.width;

    const scale = 0.8;
    const frameDelay = 100;
    const laserBaseSpeed = 2.25;
    const laserAcceleration = 2;
    const laserMaxSpeed = 1000;
    const laserChargeDuration = 500;
    const laserOutWidth = 11;
    const laserOutHeight = 10;
    const laserWidth = 211;
    const laserHeight = 92;

    const lasers = new Set();
    window.lasersSet = lasers;

    let laserFrameIndex = 0;
    let laserMuzzleTimer = 0;
    let laserChargePending = false;
    let canFire = true;
    let loadedImgs = 0;

    class Laser {
        constructor({ x, y, direction = 1, source = 'player' }) {
            this.x = x;
            this.y = y;
            this.direction = direction;
            this.source = source;
            this.frameIndex = 0;
            this.frameTimer = 0;
            this.speed = laserBaseSpeed;
        }

        update(deltaTime) {
            this.frameTimer += deltaTime;
            const laserFrameDelay = frameDelay * 0.5;
            while (this.frameTimer >= laserFrameDelay) {
                this.frameTimer -= laserFrameDelay;
                this.frameIndex = 1 - this.frameIndex;
            }

            const timeScale = deltaTime / 16.67;
            this.speed += laserAcceleration * timeScale;
            this.x += this.speed * this.direction * timeScale;
        }

        isExpired() {
            const laserDrawWidth = laserWidth * scale;
            return this.speed > laserMaxSpeed || this.x > canvas.width + laserDrawWidth || this.x + laserDrawWidth < 0;
        }

        draw(context) {
            const laserDrawWidth = laserWidth * scale;
            const laserDrawHeight = laserHeight * scale;

            if (this.direction >= 0) {
                context.drawImage(
                    laser,
                    laserWidth * this.frameIndex,
                    0,
                    laserWidth,
                    laserHeight,
                    this.x,
                    this.y,
                    laserDrawWidth,
                    laserDrawHeight
                );
            } else {
                context.save();
                context.translate(this.x + laserDrawWidth, this.y);
                context.scale(-1, 1);
                context.drawImage(
                    laser,
                    laserWidth * this.frameIndex,
                    0,
                    laserWidth,
                    laserHeight,
                    0,
                    0,
                    laserDrawWidth,
                    laserDrawHeight
                );
                context.restore();
            }

        }
    }

    const laserOut = new Image();
    laserOut.src = './assets/ship/laserout1-sheet.png';
    laserOut.onload = () => {
        loaded();
    };

    const laser = new Image();
    laser.src = './assets/ship/shooting-laser-sheet.png';
    laser.onload = () => {
        loaded();
    };

    function loaded() {
        loadedImgs++;
        if (loadedImgs !== 2) return;

        let lastTime = performance.now();

        function getPlayerLaserState() {
            if (typeof window.getPlayerLaserState === 'function') {
                return window.getPlayerLaserState();
            }

            return {
                spawn: { x: 0, y: 0 },
                muzzle: { x: 0, y: 0 },
            };
        }

        function getPlayerInputs() {
            return window.playerInputs instanceof Set ? window.playerInputs : new Set();
        }

        function update(deltaTime) {
            if (laserMuzzleTimer > 0) {
                laserMuzzleTimer = Math.max(0, laserMuzzleTimer - deltaTime);
                if (laserMuzzleTimer === 0 && laserChargePending) {
                    laserChargePending = false;
                    spawnPlayerLaser();
                }
            }

            const playerState = typeof window.getPlayerShipState === 'function' ? window.getPlayerShipState() : null;

            for (const laserProjectile of lasers) {
                laserProjectile.update(deltaTime);
                if (laserProjectile.isExpired()) {
                    lasers.delete(laserProjectile);
                    continue;
                }

                // Check collison between enemy laser and player
                if (laserProjectile.source === 'enemy' && playerState) {
                    const laserWidth = 211 * scale; 
                    const laserHeight = 92 * scale;
                    
                    const laserLeft = laserProjectile.x;
                    const laserRight = laserProjectile.x + (laserWidth * 0.2); // Front 20%
                    const laserTop = laserProjectile.y + (laserHeight * 0.25);
                    const laserBottom = laserProjectile.y + (laserHeight * 0.75);

                    const playerLeft = playerState.x;
                    const playerRight = playerState.x + playerState.width;
                    const playerTop = playerState.y;
                    const playerBottom = playerState.y + playerState.height;

                    if (laserLeft < playerRight && laserRight > playerLeft &&
                        laserTop < playerBottom && laserBottom > playerTop) {
                        
                        if (window.damagePlayer) {
                            window.damagePlayer(1);
                        }
                        
                        // Delete laser on impact
                        lasers.delete(laserProjectile);
                    }
                }
            }

            if (getPlayerInputs().has('shoot') && canFire) {
                canFire = false;
                laserFrameIndex = 0;
                laserMuzzleTimer = laserChargeDuration;
                laserChargePending = true;

                setTimeout(() => {
                    canFire = true;
                }, laserChargeDuration + 250);
            }
        }

        function drawFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawLaserOut();
            drawLasers();
        }

        function drawLaserOut() {
            if (laserMuzzleTimer > 0) {
                laserFrameIndex = Math.floor(laserMuzzleTimer / (frameDelay * 0.5)) % 2;
                const laserState = getPlayerLaserState();
                ctx.drawImage(
                    laserOut,
                    laserOutWidth * laserFrameIndex,
                    0,
                    laserOutWidth,
                    laserOutHeight,
                    laserState.muzzle.x,
                    laserState.muzzle.y,
                    laserOutWidth * 2 * scale,
                    laserOutHeight * 2 * scale
                );
            }
        }

        function drawLasers() {
            for (const laserProjectile of lasers) {
                laserProjectile.draw(ctx);
            }
        }

        function animate(now) {
            const deltaTime = now - lastTime;
            lastTime = now;

            if (!window.isGamePaused) {
                update(deltaTime);
            }
            drawFrame();
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

    function spawnPlayerLaser() {
        const laserState = typeof window.getPlayerLaserState === 'function'
            ? window.getPlayerLaserState()
            : { spawn: { x: 0, y: 0 } };

        lasers.add(new Laser({
            x: laserState.spawn.x,
            y: laserState.spawn.y,
            direction: 1,
            source: 'player',
        }));
        
        // Track shots fired for stats
        window.gameStats = window.gameStats || {};
        window.gameStats.shotsFired = (window.gameStats.shotsFired || 0) + 1;
    }

    function spawnEnemyLaser(x, y, direction = -1) {
        lasers.add(new Laser({
            x,
            y,
            direction,
            source: 'enemy',
        }));
    }

    window.spawnPlayerLaser = spawnPlayerLaser;
    window.spawnEnemyLaser = spawnEnemyLaser;
})();
