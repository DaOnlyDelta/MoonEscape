(function() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settings = document.getElementById('settings');

    if (!settingsBtn || !settings) return;

    window.openSettings = function() {
        settings.classList.add('open');
    };

    settingsBtn.addEventListener('click', () => {
        window.openSettings();
    });

    const closeBtn = document.getElementById('closeSettings');
    closeBtn.addEventListener('click', () => {
        settings.classList.remove('open');
    });

    const musicSlider = document.getElementById('musicSlider');
    const sfxSlider = document.getElementById('sfxSlider');

    function clampVolume(value) {
        return Math.max(0, Math.min(1, value));
    }

    function getTrackVolume(track, knob, clientX) {
        const rect = track.getBoundingClientRect();
        const knobWidth = knob.offsetWidth;
        const travel = rect.width - knobWidth;

        if (travel <= 0) return 0;

        return clampVolume((clientX - rect.left - knobWidth / 2) / travel);
    }

    function setKnobPosition(track, knob, volume) {
        const travel = track.clientWidth - knob.offsetWidth;
        const offset = clampVolume(volume) * Math.max(0, travel);

        knob.style.left = `${offset}px`;
        knob.style.right = 'auto';
    }

    function bindVolumeSlider(track, knob, getVolume, setVolume) {
        if (!track || !knob || !window.Sound) return;

        const syncKnob = () => setKnobPosition(track, knob, getVolume());

        const updateFromPointer = (event) => {
            setVolume(getTrackVolume(track, knob, event.clientX));
            syncKnob();
        };

        const onPointerMove = (event) => {
            if (event.buttons === 0) return;
            updateFromPointer(event);
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        };

        track.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            updateFromPointer(event);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp, { once: true });
            window.addEventListener('pointercancel', onPointerUp, { once: true });
        });

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
