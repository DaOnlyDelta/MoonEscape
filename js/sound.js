(function() {
	const SOUND_PATHS = {
		close: './sounds/close.wav',
		cancel: './sounds/cancel.wav',
		error: './sounds/error.wav',
		save: './sounds/save.wav',
		click: './sounds/click.wav',
		pause: './sounds/pause.wav',
		start: './sounds/start.wav',
		music: './sounds/music.wav'
	};

	const state = {
		masterVolume: 1,
		musicVolume: 0.5,
		sfxVolume: 0.5,
		musicKey: 'music',
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

	function pauseMusic() {
		const music = getMusicAudio();
		if (!music) return;
		music.pause();
	}

	function setMusicVolume(value) {
		state.musicVolume = clampVolume(value);
		applyMusicVolume();
	}

	function setSFXVolume(value) {
		state.sfxVolume = clampVolume(value);
	}

	function setMasterVolume(value) {
		state.masterVolume = clampVolume(value);
		applyMusicVolume();
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

	function replaceSound(soundName, path) {
		const oldAudio = state.preloaded.get(soundName);
		const wasPlayingMusic = soundName === state.musicKey && oldAudio && !oldAudio.paused;

		if (oldAudio) {
			oldAudio.pause();
			oldAudio.currentTime = 0;
		}

		const replacement = createAudio(path, soundName === state.musicKey);
		state.preloaded.set(soundName, replacement);

		if (soundName === state.musicKey) {
			applyMusicVolume();
			if (wasPlayingMusic) {
				playMusic(true);
			}
		}
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
		preloadAll,
		play,
		playMusic,
		pauseMusic,
		setMusicVolume,
		setSFXVolume,
		setMasterVolume,
		setMusicTrack,
		replaceSound,
		getMusicVolume: () => state.musicVolume,
		getSFXVolume: () => state.sfxVolume,
		listSounds: () => Array.from(state.preloaded.keys())
	};

	init();
})();
