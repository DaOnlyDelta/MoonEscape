/**
 * File: sound.js
 * Scope: Main Game Logic
 * Handles global utilities and game state.
 */
(function() {
    const SOUND_PATHS = {
        start: './sounds/start.wav',
        menu: './sounds/menu.wav',
        battle: './sounds/battle.wav',
        death: './sounds/death.wav'
    };

    const state = {
        masterVolume: 1, // Kept purely for mathematical consistency with volume scaling
        musicVolume: 0.5,
        sfxVolume: 0.5,
        musicKey: 'menu',
        preloaded: new Map(),
        initialized: false
    };

    function clampVolume(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, n));
    }

    function createAudio(path, loop) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.loop = Boolean(loop);
        audio.load();
        return audio;
    }

    function preloadAll() {
        Object.entries(SOUND_PATHS).forEach(([key, path]) => {
            if (state.preloaded.has(key)) return;
            state.preloaded.set(key, createAudio(path, key === state.musicKey));
        });
        applyMusicVolume();
    }

    function getMusicAudio() {
        return state.preloaded.get(state.musicKey) || null;
    }

    function applyMusicVolume() {
        const music = getMusicAudio();
        if (!music) return;
        music.volume = clampVolume(state.masterVolume * state.musicVolume);
    }

    function play(soundName) {
        const base = state.preloaded.get(soundName);
        if (!base) {
            console.warn(`[Sound] Unknown sound: ${soundName}`);
            return Promise.resolve();
        }

        if (soundName === state.musicKey) {
            return playMusic();
        }

        const clip = base.cloneNode(true);
        clip.volume = clampVolume(state.masterVolume * state.sfxVolume);
        clip.currentTime = 0;

        const playPromise = clip.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
        return playPromise || Promise.resolve();
    }

    function playMusic(forceRestart = false) {
        const music = getMusicAudio();
        if (!music) return Promise.resolve();

        applyMusicVolume();
        if (forceRestart) {
            music.currentTime = 0;
        }

        const playPromise = music.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            return playPromise.catch(() => {});
        }
        return Promise.resolve();
    }

    function setMusicVolume(value) {
        state.musicVolume = clampVolume(value);
        applyMusicVolume();
    }

    function setSFXVolume(value) {
        state.sfxVolume = clampVolume(value);
    }

    function setMusicTrack(trackKeyOrPath, autoPlay = true) {
        let nextKey = null;

        if (state.preloaded.has(trackKeyOrPath)) {
            nextKey = trackKeyOrPath;
        } else {
            nextKey = `music:${trackKeyOrPath}`;
            state.preloaded.set(nextKey, createAudio(trackKeyOrPath, true));
        }

        const currentMusic = getMusicAudio();
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        }

        state.musicKey = nextKey;
        const newMusic = getMusicAudio();
        if (newMusic) {
            newMusic.loop = true;
            applyMusicVolume();
        }

        if (autoPlay) {
            playMusic(true);
        }
    }

    function fadeMusicTrack(trackKeyOrPath, fadeOutMs = 3000, fadeInMs = 3000) {
        const currentMusic = getMusicAudio();
        const targetVolume = clampVolume(state.masterVolume * state.musicVolume);

        if (!currentMusic) {
            setMusicTrack(trackKeyOrPath, true);
            return;
        }

        const fps = 60;
        const stepsOut = fadeOutMs / (1000 / fps);
        let currentStepOut = 0;

        const fadeOutInt = setInterval(() => {
            currentStepOut++;
            const ratio = Math.max(0, 1 - (currentStepOut / stepsOut));
            currentMusic.volume = targetVolume * ratio;

            if (currentStepOut >= stepsOut) {
                clearInterval(fadeOutInt);
                currentMusic.volume = 0;
                setMusicTrack(trackKeyOrPath, true);

                const nextMusic = getMusicAudio();
                if (nextMusic) {
                    nextMusic.volume = 0;
                    const stepsIn = fadeInMs / (1000 / fps);
                    let currentStepIn = 0;

                    const fadeInInt = setInterval(() => {
                        currentStepIn++;
                        const inRatio = Math.min(1, currentStepIn / stepsIn);
                        nextMusic.volume = targetVolume * inRatio;

                        if (currentStepIn >= stepsIn) {
                            clearInterval(fadeInInt);
                            applyMusicVolume();
                        }
                    }, 1000 / fps);
                }
            }
        }, 1000 / fps);
    }

    function setupAutoplayRecovery() {
        const unlock = () => {
            playMusic();
            document.removeEventListener('pointerdown', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
        };

        document.addEventListener('pointerdown', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;

        preloadAll();
        playMusic();
        setupAutoplayRecovery();
    }

    window.Sound = {
        init,
        play,
        playMusic,
        setMusicVolume,
        setSFXVolume,
        setMusicTrack,
        fadeMusicTrack,
        getMusicVolume: () => state.musicVolume,
        getSFXVolume: () => state.sfxVolume
    };

    init();
})();
