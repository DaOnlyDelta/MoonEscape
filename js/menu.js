/**
 * ============================================================================
 * File: menu.js
 * Scope: Main Menu / Landing Page Orchestration
 * ============================================================================
 * Handles the animated Moon logo in the center of the start screen. Manages
 * all landing page user interactions, hover effects, and triggering the 
 * complex multi-stage "Launch Game" transition sequence coordinating HTML,
 * CSS, Sound, and Canvas layers sequentially.
 */

(function() {
    /**
     * ========================================================================
     * Canvas Preparation: Animated Moon Logo
     * ========================================================================
     */
    const canvas = document.getElementById('moonCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;

    const frameCount = 60;
    const framePaths = [];
    
    // Generate paths for the 60 frames of the spinning moon pixel art
    for (let i = 1; i <= frameCount; i++) {
        framePaths.push(`./assets/moon/${i}.png`);
    }

    const frames = [];
    let loaded = 0;

    /**
     * @description Pre-load all 60 animation frames into memory. Once 
     * complete, jumpstart the loop.
     */
    framePaths.forEach((src, idx) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            loaded++;
            frames[idx] = img;
            
            // Only begin the sequence once every file is locally buffered
            if (loaded === frameCount) {
                const scale = 3; // Upscale modifier for pixel art integrity
                canvas.width = img.naturalWidth * scale;
                canvas.height = img.naturalHeight * scale;
                
                // Disable browser interpolation to keep the sprite jagged/sharp
                ctx.imageSmoothingEnabled = false;
                startAnimation(scale);
            }
        };
    });

    /**
     * @function startAnimation
     * @description Begins the recursive drawing loop for the center Moon logo.
     * @param {number} scale - Spatial multiplier based on natural image bounds
     */
    function startAnimation(scale) {
        let current = 0;
        const frameDelay = 80;

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Explicitly draw the image up-scaled rather than using CSS width
            ctx.drawImage(
                frames[current], 
                0, 0, 
                frames[current].naturalWidth, frames[current].naturalHeight, 
                0, 0, 
                frames[current].naturalWidth * scale, frames[current].naturalHeight * scale
            );
            
            // Safely loop back to index 0 after 59
            current = (current + 1) % frameCount;
            setTimeout(draw, frameDelay);
        }
        draw();
    }

    /**
     * ========================================================================
     * UI Hover State Management
     * ========================================================================
     */
    let trans = false; // "trans" tracks if the Launch transition is running
    
    // Core Layout Nodes
    const moonPlay = document.getElementById('moonPlay');
    const moonTextLeft = document.getElementById('moonTextLeft');
    const moonTextRight = document.getElementById('moonTextRight');
    const veil = document.getElementById('veil');
    
    // Scale the Moon button slightly dynamically when the user points at it
    canvas.addEventListener('mouseenter', () => {
        if (trans) return;
        canvas.classList.add('hovered');
        moonPlay.classList.add('hovered');
    });

    canvas.addEventListener('mouseout', () => {
        canvas.classList.remove('hovered');
        moonPlay.classList.remove('hovered');
    });

    // Expand the Settings button visually when hovered
    const settingsBtn = document.getElementById('settingsBtn');
    const setIcon = document.getElementById('setIcon');
    
    settingsBtn.addEventListener('mouseenter', () => {
        if (trans) return;
        settingsBtn.classList.add('hovered');
        setIcon.classList.add('hovered');
    });

    settingsBtn.addEventListener('mouseout', () => {
        settingsBtn.classList.remove('hovered');
        setIcon.classList.remove('hovered');
    });

    /**
     * ========================================================================
     * Core Game Initiation Logic
     * ========================================================================
     */
    const instructions = document.getElementById('instructions');
    const closeInstructionsInfoBtn = document.getElementById('closeInstructions');
    
    // Master "Play Game" click listener bound onto the animated moon target
    canvas.addEventListener('click', () => {
        const settings = document.getElementById('settings');
        // Do not launch the game if the settings pop-up is active!
        if (!trans && settings && !settings.classList.contains('open')) {
            transition();
        }
    });
    
    /**
     * @description Fires precisely when the player actively clicks 'Continue' 
     * out of the Instructions overlay sequence at the start of a match.
     */
    closeInstructionsInfoBtn.addEventListener('click', () => {
        instructions.classList.remove('open');
        
        // Resume all background layers that we froze during the veil unmasking
        const bgLayer = document.getElementById('bg');
        if (bgLayer) {
            const animatedElements = bgLayer.querySelectorAll('*');
            animatedElements.forEach(el => el.style.animationPlayState = 'running');
        }
        
        // Clear the explicit global blocker preventing player movement
        window.isGamePaused = false;
        
        // Reset and cache global progress. This defines 'startTime' exactly 
        // starting at this moment, bypassing the 2s transition penalty.
        window.gameStats = {
            startTime: performance.now(),
            damageTaken: 0,
            shotsFired: 0,
            shotsHit: 0
        };
    });

    /**
     * @function transition
     * @description Master sequential execution timeline that orchestrates the 
     * visual cross-fade from Menu UI to Game UI.
     * Starts by scaling down the menu elements, fading the background to black,
     * crossfading the audio objects, and then firing the iris wipe.
     */
    function transition() {
        trans = true;
        window.gameStarted = true;
        window.isTransitioning = true;
        
        // Enforce frozen game simulation initially so backend math doesn't run
        window.isGamePaused = true;
        
        // 3-second lockout blocking pause/settings functions to let cinema finish
        setTimeout(() => window.isTransitioning = false, 3000);
        
        // Initiate audio triggers immediately on click
        if (typeof window.Sound !== 'undefined') {
            window.Sound.play('start');
            window.Sound.fadeMusicTrack('battle', 2000, 1000);
        }
        
        // Push CSS fading states (opacity -> 0)
        settingsBtn.classList.add('fadeout');
        moonPlay.classList.add('fadeout');
        moonTextLeft?.classList.add('fadeout');
        moonTextRight?.classList.add('fadeout');
        
        // Pre-shrink the clickable moon container
        canvas.classList.add('pre-transition');

        // Stage 1: Wait 800ms for UI to clear, then trigger veil darkness
        setTimeout(() => {
            canvas.classList.add('transition');
            veil.classList.add('transition');

            // Stage 2: Wait 2 secs for Black screen, swap layout IDs silently.
            setTimeout(() => {
                window.playerVisible = true;
                document.getElementById('background').classList.add('off'); // Swap blue space mapped BG out
                document.getElementById('game').classList.add('on');      // Enable parallax container

                // Re-enforce paused state aggressively
                window.isGamePaused = true;
                
                // Display tutorial layer over the darkness
                const instructions = document.getElementById('instructions');
                if (instructions) instructions.classList.add('open');
                
                // Freeze parallax layers visually while reading instructions
                const bgLayer = document.getElementById('bg');
                if (bgLayer) {
                    const animatedElements = bgLayer.querySelectorAll('*');
                    animatedElements.forEach(el => el.style.animationPlayState = 'paused');
                }

                // Stage 3: Trigger the iris wipe function exported from game.js
                if (typeof window.unveilFromCenter === 'function') {
                    window.unveilFromCenter({ duration: 1000 });
                }
            }, 2000); // end of Stage 2 darkness hold
        }, 800); // end of Stage 1 UI shrink
    }
})();
