/**
 * ============================================================================
 * File: game.js
 * Scope: Main Game Logic & Global Utilities
 * ============================================================================
 * Handles global utilities and game state variables tracking (e.g. paused vs
 * running). This file sets up global animations (like the veil screen 
 * transition) and primary global event listeners (like the Escape key for
 * pausing/opening menus).
 */

(function() {
    /**
     * @constant {HTMLElement} veil
     * The black overlay element covering the screen, used for cinematic fade-ins 
     * and masking transitions between menus and gameplay.
     */
    const veil = document.getElementById('veil');

    /**
     * ------------------------------------------------------------------------
     * @function runCenterOutUnveil
     * @description Runs an animated circular unmasking transition (like an iris 
     * wipe) that reveals the game canvas from a specified center point.
     * 
     * @param {Object} options - Configuration for the animation
     * @param {number} [options.duration=900] - Total time in ms for the unveil
     * @param {number} [options.centerX=window.innerWidth/2] - X coordinate origin
     * @param {number} [options.centerY=window.innerHeight/2] - Y coordinate origin
     * ------------------------------------------------------------------------
     */
    function runCenterOutUnveil(options = {}) {
        // Enforce valid duration limits (minimum 100ms)
        const duration = Number.isFinite(Number(options.duration)) ? Math.max(100, Number(options.duration)) : 900;
        
        // Default to exact center of the current window viewport if no origin is provided
        const centerX = Number.isFinite(Number(options.centerX)) ? Number(options.centerX) : window.innerWidth / 2;
        const centerY = Number.isFinite(Number(options.centerY)) ? Number(options.centerY) : window.innerHeight / 2;
        
        // Calculate the absolute distance to the furthest corner of the screen
        // ensuring the circle expands completely past the screen edges
        const maxRadius = Math.hypot(
            Math.max(centerX, window.innerWidth - centerX),
            Math.max(centerY, window.innerHeight - centerY)
        );

        // Reset and prepare the veil layer for the radial-gradient animation
        veil.classList.remove('fade');
        veil.classList.add('transition');
        veil.style.transition = 'none';
        veil.style.pointerEvents = 'all';
        veil.style.opacity = '1';
        veil.style.backgroundColor = 'transparent';

        const start = performance.now();

        /**
         * @function easeInOutCubic
         * @description A standard easing function to make the transition start 
         * slow, speed up in the middle, and slow down at the end.
         * @param {number} t - Time fraction (0 to 1)
         * @returns {number} Eased fraction (0 to 1)
         */
        function easeInOutCubic(t) {
            return t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        /**
         * @function frame
         * @description The internal animation loop that recalculates the radial
         * gradient per frame.
         * @param {number} now - The current performance.now() timestamp
         */
        function frame(now) {
            const elapsed = now - start;
            const t = Math.min(1, elapsed / duration);
            const eased = easeInOutCubic(t);
            const radius = eased * maxRadius;
            
            // Draw a transparent circle stretching outward, surrounded by #000 (black)
            veil.style.backgroundImage = `radial-gradient(circle at ${centerX}px ${centerY}px, transparent ${radius}px, #000 ${radius + 2}px)`;

            if (t < 1) {
                // Animation is not finished, request another frame
                requestAnimationFrame(frame);
                return;
            }

            // Target reached! Hide the veil layer to permit gameplay interaction
            veil.style.opacity = '0';
            veil.style.pointerEvents = 'none';
            veil.classList.remove('transition');
            veil.classList.remove('fade');

            // Schedule CSS cleanup on the very next frame to stop flicker bugs
            requestAnimationFrame(() => {
                veil.style.backgroundColor = '';
                veil.style.transition = '';
            });
        }

        // kick off the animation loop
        requestAnimationFrame(frame);
    }

    // Attach function globally so external modules (menu.js) can trigger it
    window.unveilFromCenter = runCenterOutUnveil;

    /**
     * ------------------------------------------------------------------------
     * Global Keydown Listener
     * @description Listens heavily for the 'Escape' key entirely to orchestrate
     * pausing the game or interacting with the Settings menu.
     * ------------------------------------------------------------------------
     */
    window.addEventListener('keydown', (evt) => {
        // Ignore interactions if the main canvas hasn't even been loaded
        if (!window.gameStarted) return;
        
        if (evt.key === 'Escape') {
            const settings = document.getElementById('settings');
            
            // Check if the Settings menu is actively shown
            if (settings && settings.classList.contains('open')) {
                if (typeof window.closeSettings === 'function') window.closeSettings();
            } else {
                if (typeof window.openSettings === 'function') window.openSettings();
            }
        }
    });

})();
