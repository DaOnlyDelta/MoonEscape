/**
 * ============================================================================
 * File: enemies.js
 * Scope: Enemy Architecture, Progression, and AI Logic
 * ============================================================================
 * Orchestrates the entire enemy lifecycle including spawning, pattern tracking,
 * animations, collision with player lasers, loot dropping, and game-over/win 
 * state presentation. Uses `window.getGameProgress()` to trigger the Boss Phase.
 */

(function() {
    /**
     * ========================================================================
     * Canvas & Physics Configuration 
     * ========================================================================
     */
    const canvas = document.getElementById('enemy');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Preserve jagged pixel art edges

    const worldAspectRatio = 250 / 150;
    const frameDelay = 100;
    
    // -- Enemy: Kamikaze (Homing Missile)
    const kamikazeFrameWidth = 226;
    const kamikazeFrameHeight = 103;
    const kamikazeScale = 0.8;
    const kamikazeDrawWidth = kamikazeFrameWidth * kamikazeScale;
    const kamikazeDrawHeight = kamikazeFrameHeight * kamikazeScale;
    
    // -- Enemy: Shooter (Static Turret)
    const shooterFrameWidth = 353;
    const shooterFrameHeight = 168;
    const shooterScale = 0.8;
    const shooterDrawWidth = shooterFrameWidth * shooterScale;
    const shooterDrawHeight = shooterFrameHeight * shooterScale;

    // -- Boss: Zigzag (Sine Wave Fighter)
    const zigzagFrameWidth = 362;
    const zigzagFrameHeight = 214;
    const zigzagScale = 0.8;
    const zigzagDrawWidth = zigzagFrameWidth * zigzagScale;
    const zigzagDrawHeight = zigzagFrameHeight * zigzagScale;

    // -- Boss: Tower (Final Stationary Target)
    const towerScale = 0.8;
    const towerDrawWidth = 155 * towerScale;
    const towerDrawHeight = 240 * towerScale;

    // -- Effects: Explosion
    const explosionFrameWidth = 400;
    const explosionFrameHeight = 300;
    const explosionScale = 1.0; 
    const explosionDrawWidth = explosionFrameWidth * explosionScale;
    const explosionDrawHeight = explosionFrameHeight * explosionScale;
    const explosionFrameDelay = 75;
    
    const spawnOffset = 24; // Push spawns slightly off-screen right

    /**
     * @constant {Array} enemies - Stores active hostile entities
     * @constant {Array} explosions - Stores active particle animations
     * @constant {Array} powerups - Stores floating HP pickups
     */
    const enemies = [];
    const explosions = [];
    const powerups = [];
    
    let screenWidth = window.innerWidth;
    let loadedImgs = 0;

    // Expose for external access if required
    window.enemyCanvas = canvas;
    window.enemyCtx = ctx;

    /**
     * @function syncCanvasSize
     * @description Maintains parity with the player's 2x stretched canvas 
     */
    function syncCanvasSize() {
        screenWidth = window.innerWidth;
        canvas.height = window.innerHeight * 2;
        canvas.width = canvas.height * worldAspectRatio;
    }
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    /**
     * @function getPlayerCenter
     * @description Helper extrapolating exact center of the player's bounding box
     * used heavily by Kamikaze homing math.
     */
    function getPlayerCenter() {
        if (typeof window.getPlayerShipState === 'function') {
            const ship = window.getPlayerShipState();
            return { x: ship.centerX, y: ship.centerY };
        }
        return { x: canvas.width * 0.25, y: canvas.height * 0.25 };
    }

    /**
     * ========================================================================
     * Factory Functions (Spawners)
     * ========================================================================
     */

    function createKamikaze() {
        const spawnX = screenWidth + kamikazeDrawWidth + spawnOffset;
        const spawnY = Math.random() * (canvas.height / 2 - kamikazeDrawHeight);
        const kamikazeSpeed = screenWidth * 0.0035;

        enemies.push({
            type: 'kamikaze',
            x: spawnX,
            y: spawnY,
            vx: -kamikazeSpeed,
            vy: 0,
            rotation: 0,
            frameIndex: 0,
            frameTimer: 0,
            width: kamikazeDrawWidth,
            height: kamikazeDrawHeight
        });
    }

    function createShooter() {
        const spawnX = screenWidth + shooterDrawWidth + spawnOffset;
        const spawnY = Math.random() * (canvas.height / 2 - shooterDrawHeight);
        const shooterSpeed = screenWidth * 0.0020;
        
        // Pick a randomized parking spot on the right quarter of the screen
        const stopPointX = screenWidth * (0.75 + Math.random() * 0.15); 

        enemies.push({
            type: 'shooter',
            x: spawnX,
            y: spawnY,
            stopX: stopPointX,
            vx: -shooterSpeed,
            vy: 0,
            rotation: 0, // Sprite naturally faces left already
            frameIndex: 0,
            frameTimer: 0,
            shootTimer: 2500, // 2.5s delay before the first shot sequence begins
            shootInterval: 3000,
            isWindingUp: false,
            windupTimer: 0,
            windupDuration: 1000,
            width: shooterDrawWidth,
            height: shooterDrawHeight
        });
    }

    function createZigzag(startY, phase, frequency, initialShootTimer) {
        const spawnX = screenWidth + zigzagDrawWidth + spawnOffset;
        enemies.push({
            type: 'zigzag',
            x: spawnX,
            y: startY,
            vx: -screenWidth * 0.0015,
            vy: 0,
            rotation: 0,
            frameIndex: 0,
            frameTimer: 0,
            width: zigzagDrawWidth,
            height: zigzagDrawHeight,
            hp: 5,      // Boss HP
            maxHp: 5,
            timeActive: 0,
            shootTimer: initialShootTimer || 0,
            shootInterval: 1000,
            isWindingUp: false,
            windupTimer: 0,
            windupDuration: 500,
            phase: phase === undefined ? 0 : phase,
            frequency: frequency || 0.001, // Up and down speed
            baseY: startY
        });
    }

    function createTower(startY) {
        const spawnX = screenWidth + towerDrawWidth * 2 + spawnOffset;
        enemies.push({
            type: 'tower',
            x: spawnX,
            y: startY,
            vx: -screenWidth * 0.001,
            vy: 0,
            rotation: 0,
            frameIndex: 0,
            frameTimer: 0,
            width: towerDrawWidth,
            height: towerDrawHeight,
            hp: 4,      // Final target HP
            maxHp: 4
        });
    }

    function createExplosion(centerX, centerY) {
        explosions.push({
            x: centerX - explosionDrawWidth / 2,
            y: centerY - explosionDrawHeight / 2,
            frameIndex: 0,
            frameTimer: 0,
        });
    }
    // Export globally so player.js can trigger it on user death
    window.createExplosion = createExplosion;

    /**
     * ========================================================================
     * Processing Master Loop
     * ========================================================================
     */

    /**
     * @function updateEnemies
     * @description Calculates AI trajectories, updates bounding boxes, and checks 
     * intersections against `window.lasersSet`. Also processes loot dropping.
     * @param {number} deltaTime 
     */
    function updateEnemies(deltaTime) {
        const timeScale = deltaTime / 16.67;
        
        // Take a snapshot of laser locations
        const activeLasers = Array.from(window.lasersSet || []);

        // Reverse iterate to safely splice out dead enemies mid-loop without skipping elements
        for (let index = enemies.length - 1; index >= 0; index--) {
            const enemy = enemies[index];
            
            // Advance sprite animation frame
            enemy.frameTimer += deltaTime;
            while (enemy.frameTimer >= frameDelay) {
                enemy.frameTimer -= frameDelay;
                enemy.frameIndex = (enemy.frameIndex + 1) % 4; // Assuming 4 frames per sheet globally
            }

            enemy.x += enemy.vx * timeScale;
            enemy.y += enemy.vy * timeScale;

            const playerCenter = getPlayerCenter();
            const centerX = enemy.x + enemy.width / 2;
            const centerY = enemy.y + enemy.height / 2;

            // --- AI ROUTINES ---
            
            if (enemy.type === 'kamikaze') {
                // Vector math: Steer towards the player's center constantly
                const deltaX = playerCenter.x - centerX;
                const deltaY = playerCenter.y - centerY;
                const speed = screenWidth * 0.0035;
                const distance = Math.hypot(deltaX, deltaY) || 1;

                enemy.vx = (deltaX / distance) * speed;
                enemy.vy = (deltaY / distance) * speed;
                enemy.rotation = Math.atan2(enemy.vy, enemy.vx) - Math.PI;
            } 
            else if (enemy.type === 'shooter') {
                // Park at random X stop Point
                if (enemy.x <= enemy.stopX) {
                    enemy.x = enemy.stopX;
                    enemy.vx = 0; 
                    
                    if (enemy.isWindingUp) {
                        enemy.windupTimer += deltaTime;
                        if (enemy.windupTimer >= enemy.windupDuration) {
                            enemy.isWindingUp = false;
                            enemy.windupTimer = 0;
                            // Blast!
                            const gunX = enemy.x - 50; 
                            const gunY = enemy.y + enemy.height / 2 - 40; 
                            // External hook defined in lasers.js
                            if (window.spawnEnemyLaser) window.spawnEnemyLaser(gunX, gunY, -1);
                        }
                    } else {
                        enemy.shootTimer += deltaTime;
                        if (enemy.shootTimer >= enemy.shootInterval) {
                            enemy.shootTimer = 0;
                            enemy.isWindingUp = true;
                            enemy.windupTimer = 0;
                        }
                    }
                }
            } 
            else if (enemy.type === 'zigzag') {
                enemy.timeActive += deltaTime;
                
                // Advance until 70% across the screen, then execute sinewave behavior
                if (enemy.x < screenWidth * 0.7) {
                    enemy.vx = 0;
                }

                // Map Y to sine curve amplitude bound within canvas
                const visibleHeight = canvas.height / 2;
                const amplitude = (visibleHeight - enemy.height) / 2;
                const midY = (visibleHeight - enemy.height) / 2;
                
                enemy.y = midY + Math.sin(enemy.timeActive * enemy.frequency + enemy.phase) * amplitude;
                enemy.vy = 0; // Override standard physics matrix
                
                // Shoot while bouncing up and down
                if (enemy.vx === 0) {
                    if (enemy.isWindingUp) {
                        enemy.windupTimer += deltaTime;
                        if (enemy.windupTimer >= enemy.windupDuration) {
                            enemy.isWindingUp = false;
                            enemy.windupTimer = 0;
                            const gunX = enemy.x; 
                            const gunY = enemy.y + enemy.height / 2; 
                            if (window.spawnEnemyLaser) window.spawnEnemyLaser(gunX, gunY, -1);
                        }
                    } else {
                        enemy.shootTimer += deltaTime;
                        if (enemy.shootTimer >= enemy.shootInterval) {
                            enemy.shootTimer = 0;
                            enemy.isWindingUp = true;
                            enemy.windupTimer = 0;
                        }
                    }
                }
            } 
            else if (enemy.type === 'tower') {
                // Sits stationary on the very far right edge
                if (enemy.x <= screenWidth - enemy.width * 1.1) {
                    enemy.x = screenWidth - enemy.width * 1.1;
                    enemy.vx = 0;
                }
            }

            // --- LASER COLLISION POLLER ---
            let hit = false;
            for (const laser of activeLasers) {
                if (laser.source !== 'player') continue; // Stop enemies from shooting themselves

                // Scaled Laser Geometry
                const laserWidth = 211 * 0.8; 
                const laserHeight = 92 * 0.8;
                const laserLeft = laser.direction >= 0 ? laser.x + (laserWidth * 0.8) : laser.x;
                const laserRight = laser.direction >= 0 ? laser.x + laserWidth : laser.x + (laserWidth * 0.2);
                const laserTop = laser.y + (laserHeight * 0.25);
                const laserBottom = laser.y + (laserHeight * 0.75);

                const enemyLeft = enemy.x; 
                const enemyRight = enemy.x + enemy.width; 
                const enemyTop = enemy.y;
                const enemyBottom = enemy.y + enemy.height;
                
                // AABB Intersection Evaluation
                if (laserLeft < enemyRight && laserRight > enemyLeft &&
                    laserTop < enemyBottom && laserBottom > enemyTop) {
                    
                    // Immediate memory cleanup to prevent double-hits globally
                    if (window.lasersSet) window.lasersSet.delete(laser);
                    
                    // Boss HP Handling
                    if (enemy.hp !== undefined) {
                        enemy.hp -= 1;
                        if (enemy.hp > 0) {
                            // Hit registered, but not dead
                            window.gameStats = window.gameStats || {};
                            window.gameStats.shotsHit = (window.gameStats.shotsHit || 0) + 1;
                            break;
                        } else if (enemy.type === 'tower') {
                            // Tower has been reduced to 0 HP
                            window.towerDestroyed = true;
                        }
                    }

                    hit = true;
                    // Standard entity kill statistics
                    window.gameStats = window.gameStats || {};
                    window.gameStats.shotsHit = (window.gameStats.shotsHit || 0) + 1;

                    createExplosion(laserRight, centerY);
                    
                    // Loot Table Algorithm -> High drops if progress >= 100%, ZERO drops during Tower
                    const currentProgress = typeof window.getGameProgress === 'function' ? window.getGameProgress() : 0;
                    const dropRate = window.towerSpawned ? 0 : (currentProgress >= 1 ? 0.3 : 0.15);
                    
                    if (Math.random() < dropRate) {
                        powerups.push({
                            x: enemy.x + (enemy.width / 2) - 25,
                            y: enemy.y + (enemy.height / 2) - 25,
                            width: 50,
                            height: 50,
                            vx: 0,
                            vy: 0
                        });
                    }

                    // Erase entity
                    enemies.splice(index, 1);
                    break;
                }
            }

            if (hit) continue; // Skip physical body collision checks if we blew it up already

            // --- PLAYER BODY COLLISION POLLER ---
            const playerState = window.getPlayerShipState ? window.getPlayerShipState() : null;
            if (playerState) {
                const playerLeft = playerState.x;
                const playerRight = playerState.x + playerState.width;
                const playerTop = playerState.y;
                const playerBottom = playerState.y + playerState.height;

                const enemyLeft = enemy.x; 
                const enemyRight = enemy.x + enemy.width; 
                
                // Allow user a 10% vertical forgiveness wedge when dodging
                const enemyTop = enemy.y + (enemy.height * 0.1);
                const enemyBottom = enemy.y + (enemy.height * 0.9); 

                // Execute Ramming Hit
                if (enemyLeft < playerRight && enemyRight > playerLeft &&
                    enemyTop < playerBottom && enemyBottom > playerTop) {
                    createExplosion(enemyLeft, centerY);
                    if (window.damagePlayer) window.damagePlayer(1);
                    enemies.splice(index, 1); // Delete kamikaze/shooter after ramming
                    continue;
                }
            }

            // Cleanup routine for entities that safely made it past the player bounds completely off-screen
            const offscreenLeft = enemy.x < -enemy.width * 1.5;
            const offscreenRight = enemy.x > canvas.width + enemy.width * 1.5;
            const offscreenTop = enemy.y < -enemy.height * 1.5;
            const offscreenBottom = enemy.y > canvas.height + enemy.height * 1.5;

            if (offscreenLeft || offscreenRight || offscreenTop || offscreenBottom) {
                enemies.splice(index, 1);
            }
        }

        /**
         * Loot Matrix Iteration
         */
        for (let index = powerups.length - 1; index >= 0; index--) {
            const powerup = powerups[index];
            
            // Gently drift leftwards
            powerup.vx = -screenWidth * 0.002;
            powerup.vy = 0;
            powerup.x += powerup.vx * timeScale;
            powerup.y += powerup.vy * timeScale;

            const playerState = window.getPlayerShipState ? window.getPlayerShipState() : null;
            if (playerState) {
                const playerLeft = playerState.x;
                const playerRight = playerState.x + playerState.width;
                const playerTop = playerState.y;
                const playerBottom = playerState.y + playerState.height;

                const pwLeft = powerup.x;
                const pwRight = powerup.x + powerup.width;
                const pwTop = powerup.y;
                const pwBottom = powerup.y + powerup.height;

                // Picked up by player
                if (pwLeft < playerRight && pwRight > playerLeft &&
                    pwTop < playerBottom && pwBottom > playerTop) {
                    if (window.healPlayer) window.healPlayer(1);
                    powerups.splice(index, 1);
                    continue;
                }
            }

            // Clean abandoned powerups passing left side
            if (powerup.x < -powerup.width * 1.5 || powerup.x > canvas.width + powerup.width * 1.5 ||
                powerup.y < -powerup.height * 1.5 || powerup.y > canvas.height + powerup.height * 1.5) {
                powerups.splice(index, 1);
            }
        }
    }

    /**
     * @function drawEnemies
     * @description Wipe canvas and layer entities in order of depth. Applies CSS-like
     * flashing effects during attack windups via JS `globalAlpha`.
     */
    function drawEnemies() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const enemy of enemies) {
            ctx.save();
            const centerX = enemy.x + enemy.width / 2;
            const centerY = enemy.y + enemy.height / 2;
            
            // Offset drawing coordinates and rotate Canvas space around center pivot
            ctx.translate(centerX, centerY);
            ctx.rotate(enemy.rotation);
            
            if (enemy.type === 'kamikaze') {
                ctx.drawImage(
                    kamikazeSheet,
                    kamikazeFrameWidth * enemy.frameIndex, 0,
                    kamikazeFrameWidth, kamikazeFrameHeight,
                    -enemy.width / 2, -enemy.height / 2,
                    enemy.width, enemy.height
                );
            } 
            else if (enemy.type === 'shooter') {
                if (enemy.isWindingUp && Math.floor(enemy.windupTimer / 100) % 2 === 0) {
                    ctx.globalAlpha = 0.5; // Strobe effect
                }
                ctx.drawImage(
                    shooterSheet,
                    shooterFrameWidth * enemy.frameIndex, 0,
                    shooterFrameWidth, shooterFrameHeight,
                    -enemy.width / 2, -enemy.height / 2,
                    enemy.width, enemy.height
                );
                ctx.globalAlpha = 1.0;
            } 
            else if (enemy.type === 'zigzag') {
                if (enemy.isWindingUp && Math.floor(enemy.windupTimer / 100) % 2 === 0) {
                    ctx.globalAlpha = 0.5; // Strobe effect
                }
                ctx.drawImage(
                    zigzagSheet,
                    zigzagFrameWidth * enemy.frameIndex, 0,
                    zigzagFrameWidth, zigzagFrameHeight,
                    -enemy.width / 2, -enemy.height / 2,
                    enemy.width, enemy.height
                );
                ctx.globalAlpha = 1.0;
            } 
            else if (enemy.type === 'tower') {
                ctx.drawImage(
                    towerImg,
                    0, 0, 155, 240,
                    -enemy.width / 2, -enemy.height / 2,
                    enemy.width, enemy.height
                );
            }
            ctx.restore();
        }

        // Draw Loot
        for (const powerup of powerups) {
            ctx.drawImage(hpImage, powerup.x, powerup.y, powerup.width, powerup.height);
        }
        
        /**
         * -- Dynamic Boss HP Bars UI Logic
         * Loops through any entity containing a configured `boss.hp` value 
         * and renders large custom HP bars dynamically on screen.
         */
        const bosses = enemies.filter(e => e.hp !== undefined);
        const scale = 1.5;
        const barW = 272 * scale;
        const barH = 21 * scale;
        const topMargin = 20;

        let zigzagIdx = 0;
        const zigzags = bosses.filter(b => b.type === 'zigzag');

        for (let i = 0; i < bosses.length; i++) {
            const boss = bosses[i];
            const hpRatio = Math.max(0, boss.hp / boss.maxHp);
            let startX, yPos;
            
            if (boss.type === 'zigzag') {
                const spacing = 20;
                // Stack zigzag HP bars descending from the right edge
                startX = window.innerWidth - 20 - ((barW + spacing) * (zigzags.length - zigzagIdx));
                yPos = topMargin;
                zigzagIdx++;
            } else {
                // Tower HP Bar is center screen
                startX = (window.innerWidth / 2) - (barW / 2);
                yPos = topMargin;
            }
            
            ctx.drawImage(bossHpBorder, startX, yPos, barW, barH);
            if (hpRatio > 0) {
                const fillW = 266;
                const fillH = 17;
                ctx.drawImage(bossHpFill, 0, 0, fillW * hpRatio, fillH, startX + 3 * scale, yPos + 2 * scale, (fillW * scale) * hpRatio, fillH * scale);
            }
        }
        
        // Render Death Puffs
        for (const exp of explosions) {
            if (exp.frameIndex >= 7) continue;
            ctx.drawImage(
                explosionSheet,
                explosionFrameWidth * exp.frameIndex, 0,
                explosionFrameWidth, explosionFrameHeight,
                exp.x, exp.y,
                explosionDrawWidth, explosionDrawHeight
            );
        }
    }

    /**
     * ========================================================================
     * Execution Flow & Chronology
     * ========================================================================
     */

    let kamikazeSpawnTimer = 0;
    let shooterSpawnTimer = 0;

    /**
     * @function startLoop
     * @description Core heartbeat executing game logic sequentially.
     * Evaluates `window.getGameProgress()` exported from `player.js` to 
     * push the game state from Phase 1 (Standard) to Phase 2 (ZigZags) to M3 (Tower).
     */
    function startLoop() {
        let lastTime = performance.now();

        function animate(now) {
            const deltaTime = now - lastTime;
            lastTime = now;
            
            // Calculate explosion animation timings constantly regardless of pause
            for (let index = explosions.length - 1; index >= 0; index--) {
                const exp = explosions[index];
                exp.frameTimer += deltaTime;
                while (exp.frameTimer >= explosionFrameDelay) {
                    exp.frameTimer -= explosionFrameDelay;
                    exp.frameIndex++;
                    if (exp.frameIndex >= 7) {
                        explosions.splice(index, 1);
                        break;
                    }
                }
            }
            
            if (window.gameStarted && !window.isGamePaused) {
                // Scenario Check: Spawn Boss Tower only after ZigZags are destroyed
                const zigzagCount = enemies.filter(e => e.type === 'zigzag').length;
                if (window.bossSpawned && !window.towerSpawned && zigzagCount === 0) {
                    window.towerSpawned = true;
                    // Inject the Tower into the active array
                    const visibleHeight = canvas.height / 2;
                    createTower(visibleHeight * 0.5 - towerDrawHeight / 2);
                }

                // Scenario Check: Handle kamikaze spawning behavior relative to Tower
                if (!window.towerDestroyed) {
                    kamikazeSpawnTimer += deltaTime;
                    // Increase intensity of homing threats dramatically once tower is active
                    const kamiInterval = window.towerSpawned ? 1000 : 3000;
                    if (kamikazeSpawnTimer >= kamiInterval) {
                        kamikazeSpawnTimer = 0;
                        createKamikaze();
                    }
                } else {
                    // VICTORY SEQUENCE:
                    // Tower is dead. Wait until remaining screen kamikazes are gone.
                    const activeKamikaze = enemies.filter(e => e.type === 'kamikaze').length;
                    
                    if (activeKamikaze === 0 && !window.gameCompletedPlayed) {
                        window.gameCompletedPlayed = true;
                        
                        // Victory UI DOM Generation
                        const completedText = document.createElement('h1');
                        completedText.id = 'gameCompletedTitle';
                        completedText.style.position = 'absolute';
                        completedText.style.top = '50%';
                        completedText.style.left = '50%';
                        completedText.style.transform = 'translate(-50%, -50%)';
                        completedText.style.fontSize = '8vh';
                        completedText.style.letterSpacing = '1vh';
                        completedText.style.whiteSpace = 'nowrap';
                        completedText.style.overflow = 'visible';
                        completedText.style.display = 'flex';
                        completedText.style.alignItems = 'center';
                        completedText.style.gap = '0.25em';
                        completedText.style.zIndex = '50';
                        completedText.innerHTML = '<span id="gameTextLeft" class="titleText">Game</span><span id="gameTextRight" class="titleText">Completed</span>';
                        document.getElementById('game').appendChild(completedText);
                        
                        // Parse external global variables assigned in projectiles/player logic
                        const stats = window.gameStats || {};
                        const timeTaken = stats.startTime ? ((performance.now() - stats.startTime) / 1000).toFixed(1) : 0;
                        const dmg = stats.damageTaken || 0;
                        const fired = stats.shotsFired || 0;
                        const hit = stats.shotsHit || 0;
                        
                        const statsText = document.createElement('div');
                        statsText.id = 'gameCompletedStats';
                        statsText.style.position = 'absolute';
                        statsText.style.top = '60%';
                        statsText.style.left = '50%';
                        statsText.style.transform = 'translate(-50%, 0)';
                        statsText.style.fontSize = '3vh';
                        statsText.style.letterSpacing = '0.2vh';
                        statsText.style.textAlign = 'center';
                        statsText.style.zIndex = '50';
                        statsText.style.lineHeight = '1.5';
                        statsText.style.color = '#e3e3e3';
                        statsText.innerHTML = `
                            Damage taken: ${dmg}<br>
                            Shots fired/hit: ${hit}/${fired}<br>
                            Time: ${timeTaken}s
                        `;
                        document.getElementById('game').appendChild(statsText);
                        
                        // Restart functionality via window reload
                        document.body.style.cursor = 'default';
                        const retryBtn = document.createElement('button');
                        retryBtn.innerText = 'Play Again';
                        retryBtn.style.position = 'absolute';
                        retryBtn.style.top = '75%';
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
                }

                // Scenario Check: Generic Turret spawning mechanics 
                shooterSpawnTimer += deltaTime;
                
                const progress = typeof window.getGameProgress === 'function' ? window.getGameProgress() : 0;
                const spawnThreshold = progress >= 0.5 ? 2750 : 3500;

                if (shooterSpawnTimer >= spawnThreshold) {
                    shooterSpawnTimer = 0;
                    if (progress < 1) {
                        createShooter();
                    } else if (progress >= 1 && !window.bossSpawned) {
                        // The user survived 35 seconds, spawn the 2 ZigZags
                        window.bossSpawned = true;
                        
                        const visibleHeight = canvas.height / 2;
                        // Spawn first slightly high
                        createZigzag(visibleHeight * 0.25, 0, 0.001, 0);       
                        // Spawn second slightly low, phased sine interval so they weave through each other
                        createZigzag(visibleHeight * 0.75, Math.PI / 2.5, 0.0015, 500); 
                    }
                }

                // Mutate positions based on active timers
                updateEnemies(deltaTime);
            }
            
            drawEnemies();     
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

    /**
     * @function startTestSpawns
     * @description Drops one of each basic enemy immediately when the user hits 'Continue'.
     */
    function startTestSpawns() {
        createKamikaze();
        createShooter();
    }

    /**
     * @function waitForGameStart
     * @description Initial gating loop that holds the entire enemy physics engine 
     * indefinitely until the main menu passes the `window.gameStarted` flag.
     */
    function waitForGameStart() {
        if (window.gameStarted) {
            startTestSpawns();
            startLoop();
            return;
        }

        const startWatcher = setInterval(() => {
            if (!window.gameStarted) return;
            clearInterval(startWatcher);
            startTestSpawns();
            startLoop();
        }, 50);
    }

    /**
     * ========================================================================
     * Asset Loader Gates
     * ========================================================================
     */
    function checkImgs() {
        loadedImgs++;
        if (loadedImgs >= 8) {
            waitForGameStart();
        }
    }

    const kamikazeSheet = new Image();
    kamikazeSheet.src = './assets/Bonus (enemies)/kamikaze-sheet.png';
    kamikazeSheet.onload = checkImgs;

    const explosionSheet = new Image();
    explosionSheet.src = './assets/Bonus (enemies)/explosion-sheet.png';
    explosionSheet.onload = checkImgs;
    
    const shooterSheet = new Image();
    shooterSheet.src = './assets/Bonus (enemies)/enemy_circle-sheet.png';
    shooterSheet.onload = checkImgs;

    const hpImage = new Image();
    hpImage.src = './assets/Bonus (enemies)/hp.png';
    hpImage.onload = checkImgs;

    const zigzagSheet = new Image();
    zigzagSheet.src = './assets/Bonus (enemies)/enemy_zig_zag-sheet.png';
    zigzagSheet.onload = checkImgs;

    const towerImg = new Image();
    towerImg.src = './assets/Bonus (enemies)/enemytower.png';
    towerImg.onload = checkImgs;

    const bossHpBorder = new Image();
    bossHpBorder.src = './assets/ProgressBar_06/BarV6_Bar.png';
    bossHpBorder.onload = checkImgs;

    const bossHpFill = new Image();
    bossHpFill.src = './assets/ProgressBar_06/BarV6_ProgressBar.png';
    bossHpFill.onload = checkImgs;
})();
