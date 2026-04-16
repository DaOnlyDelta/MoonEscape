/**
 * ============================================================================
 * File: settings.js
 * Scope: Main Game Logic & Modal Controllers
 * ============================================================================
 * Handles the logic orchestrating the Settings Menu. 
 * Allows users to adjust volume options via custom sliders and governs global
 * state properties (`window.isGamePaused`, CSS animations) when the modal is 
 * active versus closed.
 */

(function() {
    /**
     * @constant {HTMLElement|null} settingsBtn
     * Button located in the main menu to open settings.
     */
    const settingsBtn = document.getElementById('settingsBtn');

    /**
     * @constant {HTMLElement|null} settings
     * The actual modal container containing volume options and credits.
     */
    const settings = document.getElementById('settings');

    if (!settingsBtn || !settings) return;

    /**
     * ------------------------------------------------------------------------
     * @function window.openSettings
     * @description Globally exposed function to pause the active game layout
     * and overlay the settings modal. Halts CSS animations.
     * ------------------------------------------------------------------------
     */
    window.openSettings = function() {
        // Prevent opening if actively transitioning into the game
        if (window.isTransitioning) return;

        // Prevent opening if the instructional tutorial window is already active
        const inst = document.getElementById('instructions');
        if (inst && inst.classList.contains('open')) return;

        settings.classList.add('open');
        window.isGamePaused = true;
        
        // Show cursor while paused so players can click settings
        document.body.style.cursor = 'default';
        
        // Pause all CSS background animations (parallax scrolling layers)
        const bgLayer = document.getElementById('bg');
        if (bgLayer) {
            const animatedElements = bgLayer.querySelectorAll('*');
            animatedElements.forEach(el => el.style.animationPlayState = 'paused');
        }
    };

    /**
     * ------------------------------------------------------------------------
     * @function window.closeSettings
     * @description Globally exposed function to unpause the active game layout 
     * and hide the settings modal. Resumes animations and hides cursor if needed.
     * ------------------------------------------------------------------------
     */
    window.closeSettings = function() {
        settings.classList.remove('open');
        
        // Unpause game only if the player is still alive
        if (!window.isGameOver) window.isGamePaused = false;
        
        // Hide cursor again if we are actively playing
        if (window.gameStarted && !window.isGameOver) {
            document.body.style.cursor = 'none';
        } else if (window.isGameOver) {
            // Keep cursor if they died (for clicking 'retry')
            document.body.style.cursor = 'default';
        }

        // Resume all CSS background animations (parallax scrolling layers)
        const bgLayer = document.getElementById('bg');
        if (bgLayer) {
            const animatedElements = bgLayer.querySelectorAll('*');
            animatedElements.forEach(el => el.style.animationPlayState = 'running');
        }
    };

    // Attach basic click listeners to interactive toggles
    settingsBtn.addEventListener('click', () => {
        window.openSettings();
    });

    const closeBtn = document.getElementById('closeSettings');
    closeBtn.addEventListener('click', () => {
        window.closeSettings();
    });

    /**
     * ========================================================================
     * Audio Sliders Configuration
     * ========================================================================
     */
    const musicSlider = document.getElementById('musicSlider');
    const sfxSlider = document.getElementById('sfxSlider');

    /**
     * @function clampVolume
     * @description Ensures the volume ratio strictly stays between 0.0 and 1.0.
     * @param {number} value - The requested volume offset 
     * @returns {number} The clamped value
     */
    function clampVolume(value) {
        return Math.max(0, Math.min(1, value));
    }

    /**
     * @function getTrackVolume
     * @description Translates a mouse/touch X-coordinate into a literal 
     * playback volume ratio (0 to 1).
     * @param {HTMLElement} track - The slider container
     * @param {HTMLElement} knob - The visual knob circle
     * @param {number} clientX - Screen cursor X position 
     * @returns {number} The desired volume
     */
    function getTrackVolume(track, knob, clientX) {
        const rect = track.getBoundingClientRect();
        const knobWidth = knob.offsetWidth;
        const travel = rect.width - knobWidth;

        if (travel <= 0) return 0;

        return clampVolume((clientX - rect.left - knobWidth / 2) / travel);
    }

    /**
     * @function setKnobPosition
     * @description Physically moves the slider knob DOM component utilizing 
     * the current audio track volume level.
     * @param {HTMLElement} track - The slider container
     * @param {HTMLElement} knob - The visual knob circle
     * @param {number} volume - Volume limit between 0 & 1
     */
    function setKnobPosition(track, knob, volume) {
        const travel = track.clientWidth - knob.offsetWidth;
        const offset = clampVolume(volume) * Math.max(0, travel);

        knob.style.left = `${offset}px`;
        knob.style.right = 'auto'; // Disable flex layouts that override left
    }

    /**
     * @function bindVolumeSlider
     * @description Maps standard pointer DOM events (click, drag, touch) to the
     * audio soundscapes modifying `window.Sound` logic.
     * 
     * @param {HTMLElement} track - The slider outline (wrapper)
     * @param {HTMLElement} knob - The inside draggable dot
     * @param {Function} getVolume - Callback to evaluate current global volume
     * @param {Function} setVolume - Callback to broadcast new global volume
     */
    function bindVolumeSlider(track, knob, getVolume, setVolume) {
        if (!track || !knob || !window.Sound) return;

        const syncKnob = () => setKnobPosition(track, knob, getVolume());

        const updateFromPointer = (event) => {
            setVolume(getTrackVolume(track, knob, event.clientX));
            syncKnob();
        };

        const onPointerMove = (event) => {
            // Stop if player stops dragging without firing pointerup
            if (event.buttons === 0) return;
            updateFromPointer(event);
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        };

        // Attach initial click-to-activate logic
        track.addEventListener('pointerdown', (event) => {
            event.preventDefault(); // Stop standard text-highlighting selection
            updateFromPointer(event);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp, { once: true });
            window.addEventListener('pointercancel', onPointerUp, { once: true });
        });

        // Initialize knob layout safely based on defaults right away
        syncKnob();
    }

    bindVolumeSlider(
        musicSlider ? musicSlider.closest('.slider') : null,
        musicSlider,
        () => Sound.getMusicVolume(),
        (volume) => Sound.setMusicVolume(volume)
    );

    bindVolumeSlider(
        sfxSlider ? sfxSlider.closest('.slider') : null,
        sfxSlider,
        () => Sound.getSFXVolume(),
        (volume) => Sound.setSFXVolume(volume)
    );
})();
