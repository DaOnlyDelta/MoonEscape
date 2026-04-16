(function() {
	const canvas = document.getElementById('player');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.height = window.innerHeight * 2; // * 2 to make the canvas reach futher than the right wall
    canvas.width = canvas.height * (250 / 150);

    const scale = 0.8;
    const shipWidth = 350;
    const shipHeight = 150;
    const blastHeight = 32;
    const blastWidth = 64;
    let dy = canvas.height / 4;
    let dyOffset = 0;
    let dx = window.innerWidth * 0.05;
    const frameOrder = [2, 2, 3, 3, 4, 4, 3, 3];
    const frameDelay = 100;
    const moveSpeed = 8;
    let currentShipFrame = 0;
    
    window.addEventListener('resize', () => {
        dx = window.innerWidth * 0.05;
    });
    
    let playerMaxHp = 4;
    let playerHp = 4;
    let isDead = false;
    
    window.damagePlayer = function(amount) {
        if (isDead) return;
        
        playerHp -= amount;
        
        // Track damage taken for stats
        window.gameStats = window.gameStats || {};
        window.gameStats.damageTaken = (window.gameStats.damageTaken || 0) + amount;

        if (playerHp <= 0) {
            window.isGameOver = true;
            window.isGamePaused = true;
            playerHp = 0;
            isDead = true;
            
            window.Sound?.play('death');
            
            if (window.createExplosion) {
                window.createExplosion(dx + 16 + (shipWidth * scale / 2), dy + (shipHeight * scale / 2));
            }
            
            const failedText = document.createElement('h1');
            failedText.id = 'gameFailedTitle';
            failedText.style.position = 'absolute';
            failedText.style.top = '50%';
            failedText.style.left = '50%';
            failedText.style.transform = 'translate(-50%, -50%)';
            failedText.style.fontSize = '8vh';
            failedText.style.letterSpacing = '1vh';
            failedText.style.whiteSpace = 'nowrap';
            failedText.style.overflow = 'visible';
            failedText.style.display = 'flex';
            failedText.style.alignItems = 'center';
            failedText.style.gap = '0.25em';
            failedText.style.zIndex = '50';
            failedText.innerHTML = '<span id="failTextLeft" class="titleText">Game</span><span id="failTextRight" class="titleText">Failed</span>';
            document.getElementById('game').appendChild(failedText);
            
            document.body.style.cursor = 'default';
            const retryBtn = document.createElement('button');
            retryBtn.innerText = 'Retry';
            // Simple generic styling
            retryBtn.style.position = 'absolute';
            retryBtn.style.top = '65%';
            retryBtn.style.left = '50%';
            retryBtn.style.transform = 'translate(-50%, 0)';
            retryBtn.style.fontSize = '3vh';
            retryBtn.style.padding = '1vh 2vh';
            retryBtn.style.zIndex = '50';
            retryBtn.style.cursor = 'pointer';
            retryBtn.style.pointerEvents = 'auto';
            retryBtn.style.background = '#222';
            retryBtn.style.color = '#fff';
            retryBtn.style.border = '2px solid #555';
            retryBtn.style.borderRadius = '5px';
            retryBtn.onclick = () => window.location.reload();
            document.getElementById('game').appendChild(retryBtn);
        }
    };

    window.healPlayer = function(amount) {
        playerHp += amount;
        if (playerHp > playerMaxHp) playerHp = playerMaxHp;
    };

    let frameTimer = 0;
    let blastFrame = 0;
    let loadedImgs = 0;
    
    // 0 to 1 progress scalar. Fills over 35 seconds
    let gameProgress = 0;
    const progressDuration = 35000;

    window.getGameProgress = function() {
        return gameProgress;
    };

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

    const hpBorder = new Image();
    hpBorder.src = './assets/ProgressBar_01/BarV1_ProgressBarBorder.png';
    hpBorder.onload = () => {
        loaded();
    };

    const hpFill = new Image();
    hpFill.src = './assets/ProgressBar_01/BarV1_ProgressBar.png';
    hpFill.onload = () => {
        loaded();
    };

    const progBorder = new Image();
    progBorder.src = './assets/ProgressBar_08/BarV8_Bar.png';
    progBorder.onload = () => {
        loaded();
    };

    const progFill = new Image();
    progFill.src = './assets/ProgressBar_08/BarV8_ProgressBar.png';
    progFill.onload = () => {
        loaded();
    };

    function loaded() {
        loadedImgs++;
        if (loadedImgs !== 8) return;

        let lastTime = performance.now();

        function update(deltaTime) {
            gameProgress += deltaTime / progressDuration;
            if (gameProgress > 1) gameProgress = 1;

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
        }

        function drawFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (playerHp > 0) {
                drawBlast();
                drawShip();
            }
            drawHpBar();
            drawProgressBar();
        }

        function drawProgressBar() {
            if (gameProgress >= 1) return;

            const margin = 20;
            const scale = 1.5;
            
            const borderW = 274 * scale;
            const borderH = 25 * scale;

            // Draw empty border top middle. window.innerWidth corresponds to the true screen size
            const xPos = (window.innerWidth / 2) - (borderW / 2);
            ctx.drawImage(progBorder, xPos, margin, borderW, borderH);

            if (gameProgress > 0) {
                const fillW = 270;
                const fillH = 21;
                
                ctx.drawImage(
                    progFill,
                    0, 0, fillW * gameProgress, fillH, 
                    xPos + (2 * scale), margin + (2 * scale), (fillW * scale) * gameProgress, fillH * scale 
                );
            }
        }

        function drawHpBar() {
            const margin = 20;
            const scale = 1.5;
            
            const borderW = 274 * scale;
            const borderH = 25 * scale;

            // Draw empty border
            ctx.drawImage(hpBorder, margin, margin, borderW, borderH);

            // Draw filled portion based on HP
            if (playerHp > 0) {
                const fillRatio = playerHp / playerMaxHp;
                const fillW = 271;
                const fillH = 21;
                
                ctx.drawImage(
                    hpFill,
                    0, 0, fillW * fillRatio, fillH, 
                    margin + (1 * scale), margin + (2 * scale), (fillW * scale) * fillRatio, fillH * scale 
                );
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

            if (window.gameStarted && !window.isGamePaused) {
                update(deltaTime);
            }
            drawFrame();
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

    function getPlayerLaserState() {
        return {
            spawn: {
                x: dx + shipWidth * scale / 1.8,
                y: dy + (shipHeight * scale / 4) + dyOffset,
            },
            muzzle: {
                x: dx + shipWidth * scale / 1.6,
                y: dy + (shipHeight * scale / 2.1) + dyOffset,
            },
        };
    }

    window.getPlayerLaserState = getPlayerLaserState;

    function getPlayerShipState() {
        return {
            x: dx + 16,
            y: dy,
            width: shipWidth * scale,
            height: shipHeight * scale,
            centerX: dx + 16 + (shipWidth * scale / 2),
            centerY: dy + (shipHeight * scale / 2),
        };
    }

    window.getPlayerShipState = getPlayerShipState;

    // User inputs
    let inputs = new Set();
    window.playerInputs = inputs;

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
