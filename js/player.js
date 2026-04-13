(function() {
	const canvas = document.getElementById('player');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.height = window.innerHeight * 2; // * 2 to make the canvas reach futher than the right wall
    canvas.width = canvas.height * (250 / 150);

    const laserCanvas = document.getElementById('lasers');
    const lctx = laserCanvas.getContext('2d');
    lctx.imageSmoothingEnabled = false;
    laserCanvas.height = canvas.height;
    laserCanvas.width = canvas.width;

    const scale = 0.8;
    const shipWidth = 350;
    const shipHeight = 150;
    const blastHeight = 32;
    const blastWidth = 64;
    const laserOutWidth = 11;
    const laserOutHeight = 10;
    const laserWidth = 211;
    const laserHeight = 92;
    let dy = canvas.height / 4;
    let dyOffset = 0;
    const dx = 0;
    const frameOrder = [2, 2, 3, 3, 4, 4, 3, 3];
    const frameDelay = 100;
    const moveSpeed = 8;
    const laserBaseSpeed = 2.25;
    const laserAcceleration = 2;
    const laserMaxSpeed = 1000;
    const laserChargeDuration = 250;
    const laserFireCooldown = 500;
    let currentShipFrame = 0;
    let frameTimer = 0;
    let laserFrameIndex = 0;
    let laserMuzzleTimer = 0;
    let laserChargePending = false;
    let blastFrame = 0;
    let loadedImgs = 0;
    let canFire = true;
    const lasers = new Set();

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
            return this.speed > laserMaxSpeed || this.x > laserCanvas.width + laserDrawWidth || this.x + laserDrawWidth < 0;
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
                return;
            }

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

    window.Laser = Laser;
    window.playerLasers = lasers;
    window.gameLasers = lasers;
    window.spawnPlayerLaser = spawnPlayerLaser;
    window.spawnEnemyLaser = spawnEnemyLaser;

    const ship = new Image();
    ship.src = './assets/ship/sprite_player_spaceship_up_down.png';
    ship.onload = () => {
        loaded();
    };

    const blast = new Image();
    blast.src = './assets/ship/sprite_player_spaceship_exhaust_high.png';
    blast.onload = () => {
        loaded();
    };

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
        if (loadedImgs !== 4) return;

        let lastTime = performance.now();

        function update(deltaTime) {
            if (inputs.has('up')) {
                dy -= moveSpeed * deltaTime / 16.67;
            }

            if (inputs.has('down')) {
                dy += moveSpeed * deltaTime / 16.67;
            }

            const maxY = canvas.height / 2 - shipHeight * scale;
            dy = Math.max(0, Math.min(maxY, dy));

            if (inputs.has('up')) {
                dyOffset = -5;
            } else if (inputs.has('down')) {
                dyOffset = 5;
            } else {
                dyOffset = 0;
            }

            frameTimer += deltaTime;
            while (frameTimer >= frameDelay) {
                frameTimer -= frameDelay;
                currentShipFrame = (currentShipFrame + 1) % frameOrder.length;
                blastFrame = 1 - blastFrame;
            }

            if (laserMuzzleTimer > 0) {
                laserMuzzleTimer = Math.max(0, laserMuzzleTimer - deltaTime);
                if (laserMuzzleTimer === 0 && laserChargePending) {
                    laserChargePending = false;
                    spawnPlayerLaser();
                }
            }

            for (const laserProjectile of lasers) {
                laserProjectile.update(deltaTime);
                if (laserProjectile.isExpired()) {
                    lasers.delete(laserProjectile);
                }
            }

            if (inputs.has('shoot') && canFire) {
                canFire = false;
                laserFrameIndex = 0;
                laserMuzzleTimer = laserChargeDuration;
                laserChargePending = true;

                setTimeout(() => {
                    canFire = true;
                }, laserFireCooldown);
            }
        }

        function drawFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            lctx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
            
            drawBlast();
            drawShip();
            drawLaserOut();
            drawLasers();
        }

        function drawLaserOut() {
            if (laserMuzzleTimer > 0) {
                laserFrameIndex = Math.floor(laserMuzzleTimer / (frameDelay * 0.5)) % 2;
                lctx.drawImage(
                    laserOut,
                    laserOutWidth * laserFrameIndex,
                    0,
                    laserOutWidth,
                    laserOutHeight,
                    dx + shipWidth * scale / 1.6,
                    dy + (shipHeight * scale / 2.1) + dyOffset,
                    laserOutWidth * 2 * scale,
                    laserOutHeight * 2 * scale
                );
            }
        }

        function drawLasers() {
            for (const laserProjectile of lasers) {
                laserProjectile.draw(lctx);
            }
        }

        function drawShip() {
            let frameIndex = 0;
            if (inputs.has('up')) {
                frameIndex = 6;
                dyOffset = -6;
            } else if (inputs.has('down')) {
                frameIndex = 0;
                dyOffset = 6;
            } else {
                 frameIndex = frameOrder[currentShipFrame];
                 switch (frameIndex) {
                    case 2: dyOffset = 3; break;
                    case 4: dyOffset = -3; break;
                    default: dyOffset = 0;
                 }
            }

            ctx.drawImage(
                ship,
                frameIndex * shipWidth,
                0,
                shipWidth,
                shipHeight,
                dx + 16,
                dy,
                shipWidth * scale,
                shipHeight * scale
            );
        }

        function drawBlast() {
            ctx.drawImage(
                blast,
                blastWidth * blastFrame,
                0,
                blastWidth,
                blastHeight,
                dx,
                dy + shipHeight * scale / 2.48,
                blastWidth * scale,
                blastHeight * scale
            );
        }

        function animate(now) {
            const deltaTime = now - lastTime;
            lastTime = now;

            update(deltaTime);
            drawFrame();
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

    function spawnPlayerLaser() {
        lasers.add(new Laser({
            x: dx + shipWidth * scale / 1.8,
            y: dy + (shipHeight * scale / 4) + dyOffset,
            direction: 1,
            source: 'player',
        }));
    }

    function spawnEnemyLaser(x, y, direction = -1) {
        lasers.add(new Laser({
            x,
            y,
            direction,
            source: 'enemy',
        }));
    }

    // User inputs
    let inputs = new Set();

    window.addEventListener('keydown', (evt) => {
        switch (evt.code) {
            case 'Space': inputs.add('shoot'); break;
            case 'KeyW':
            case 'ArrowUp': inputs.add('up'); break;
            case 'KeyS':
            case 'ArrowDown': inputs.add('down'); break;
        }
    });

    window.addEventListener('keyup', (evt) => {
        switch (evt.code) {
            case 'Space': inputs.delete('shoot'); break;
            case 'KeyW':
            case 'ArrowUp': inputs.delete('up'); break;
            case 'KeyS':
            case 'ArrowDown': inputs.delete('down'); break;
        }
    });
})();
