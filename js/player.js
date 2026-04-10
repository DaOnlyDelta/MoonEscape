(function() {
	const canvas = document.getElementById('player');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.height = window.innerHeight;
    canvas.width = canvas.height * (250 / 150);

    const laserCanvas = document.getElementById('lasers');
    const lctx = laserCanvas.getContext('2d');
    lctx.imageSmoothingEnabled = false;
    laserCanvas.height = window.innerHeight;
    laserCanvas.width = window.innerWidth;

    const scale = 0.8;
    const shipWidth = 350;
    const shipHeight = 150;
    const blastHeight = 32;
    const blastWidth = 64;
    const laserOutWidth = 11;
    const laserOutHeight = 10;
    const laserWidth = 211;
    const laserHeight = 92;
    let dy = canvas.height / 2;
    let dyOffset = 0;
    const dx = 0;
    const frameOrder = [2, 2, 3, 3, 4, 4, 3, 3];
    const frameDelay = 100;
    const moveSpeed = 8;
    let currentShipFrame = 0;
    let frameTimer = 0;
    let laserFrameIndex = 0;
    let laserFramesLeft = 0;
    let laserProjectile = null;
    let blastFrame = 0;
    let loadedImgs = 0;
    let canFire = true;

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

            const maxY = canvas.height - shipHeight * scale;
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

                if (laserFramesLeft > 0) {
                    laserFrameIndex = (laserFrameIndex + 1) % 2;
                    laserFramesLeft--;

                    if (laserFramesLeft === 0) {
                        laserProjectile = {
                            x: dx + shipWidth * scale / 1.8,
                            y: dy + (shipHeight * scale / 4) + dyOffset,
                            age: 0,
                            frameTimer: 0,
                            frameIndex: 0,
                        };
                    }
                }
            }

            if (laserProjectile) {
                laserProjectile.frameTimer += deltaTime;
                while (laserProjectile.frameTimer >= frameDelay * 0.5) {
                    laserProjectile.frameTimer -= frameDelay;
                    laserProjectile.frameIndex = 1 - laserProjectile.frameIndex;
                }

                laserProjectile.age += deltaTime / frameDelay;
                laserProjectile.x += 2 + Math.pow(laserProjectile.age, 2) * 0.6;

                if (laserProjectile.x > laserCanvas.width) {
                    laserProjectile = null;
                }
            }

            if (inputs.has('shoot') && canFire) {
                canFire = false;
                laserFramesLeft = 6;
                laserFrameIndex = 0;
                laserProjectile = null;

                setTimeout(() => {
                    canFire = true;
                }, 1500);
            }
        }

        function drawFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            lctx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
            
            drawBlast();
            drawShip();
            drawLaserOut();
        }

        function drawLaserOut() {
            if (laserFramesLeft > 0) {
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

            if (laserProjectile) {
                drawMovingLaser();
            }
        }

        function drawMovingLaser() {
            lctx.drawImage(
                laser,
                laserWidth * laserProjectile.frameIndex,
                0,
                laserWidth,
                laserHeight,
                laserProjectile.x,
                laserProjectile.y,
                laserWidth * scale,
                laserHeight * scale
            );
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
