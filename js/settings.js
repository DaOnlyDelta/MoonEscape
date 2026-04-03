(function() {
    const sound = window.Sound || null;
    const settingsBtn = document.getElementById('settingsBtn');
    const settings = document.getElementById('settings');
    const settingsWindow = document.getElementById('settingsWindow');
    const settingsBorderPoly = document.getElementById('settingsBorderPoly');

    function updateSettingsBorder() {
        if (!settingsWindow || !settingsBorderPoly) return;

        const style = getComputedStyle(settingsWindow);
        const slantRaw = style.getPropertyValue('--setSlant').trim();
        const slant = Number.parseFloat(slantRaw);
        const slantSafe = Number.isFinite(slant) ? Math.max(0, Math.min(50, slant)) : 12;
        const rightTop = 100 - slantSafe;

        settingsBorderPoly.setAttribute('points', `0,0 ${rightTop},0 100,100 ${slantSafe},100`);
    }

    updateSettingsBorder();
    window.addEventListener('resize', updateSettingsBorder);
    
    settingsBtn.addEventListener('click', () => {
        window.openSettings();
    });

    window.openSettings = function() {
        window.Sound?.play('click');
        settings.classList.add('open');
        veil.classList.add('fade');
    }

    veil.addEventListener('click', () => {
        if (veil.classList.contains('fade')) {
            window.closeSettings();
        }
    });

    window.closeSettings = function() {
        window.Sound?.play('close');
        settings.classList.remove('open');
        veil.classList.remove('fade');
    }

    const creditsBtn = document.getElementById('setBarCredits');
    const audioBtn = document.getElementById('setBarAudio');
    const credits = document.getElementById('setCredits');
    const audio = document.getElementById('setAudio');

    creditsBtn.addEventListener('click', () => {
        window.Sound?.play('click');
        credits.classList.add('active');
        audio.classList.remove('active');
    });

    audioBtn.addEventListener('click', () => {
        window.Sound?.play('click');
        audio.classList.add('active');
        credits.classList.remove('active');
    });

    let musicVolume = 0.5;
    let sfxVolume = 0.5;
    let savedMusicVolume = musicVolume;
    let savedSFXVolume = sfxVolume;
    const musicL = document.getElementById('setMusicAdjL');
    const musicR = document.getElementById('setMusicAdjR');
    const sfxL = document.getElementById('setSFXAdjL');
    const sfxR = document.getElementById('setSFXAdjR');
    const musicValue = document.getElementById('setMusicValue');
    const sfxValue = document.getElementById('setSFXValue');

    if (sound) {
        musicVolume = sound.getMusicVolume();
        sfxVolume = sound.getSFXVolume();
        savedMusicVolume = musicVolume;
        savedSFXVolume = sfxVolume;
        musicValue.textContent = `${Math.round(musicVolume * 100)}%`;
        sfxValue.textContent = `${Math.round(sfxVolume * 100)}%`;
        updateMusicVolume(musicVolume);
        updateSFXVolume(sfxVolume);
    }

    musicL.addEventListener('click', () => {
        musicVolume = Math.max(0, musicVolume - 0.1);
        musicValue.textContent = `${Math.round(musicVolume * 100)}%`;
        updateMusicVolume(musicVolume);
    });

    musicR.addEventListener('click', () => {
        musicVolume = Math.min(1, musicVolume + 0.1);
        musicValue.textContent = `${Math.round(musicVolume * 100)}%`;
        updateMusicVolume(musicVolume);
    });

    sfxL.addEventListener('click', () => {
        sfxVolume = Math.max(0, sfxVolume - 0.1);
        sfxValue.textContent = `${Math.round(sfxVolume * 100)}%`;
        updateSFXVolume(sfxVolume);
    });

    sfxR.addEventListener('click', () => {
        sfxVolume = Math.min(1, sfxVolume + 0.1);
        sfxValue.textContent = `${Math.round(sfxVolume * 100)}%`;
        updateSFXVolume(sfxVolume);
    });

    function updateMusicVolume(volume) {
        window.Sound?.setMusicVolume(volume);
    }

    function updateSFXVolume(volume) {
        window.Sound?.setSFXVolume(volume);
    }

    const cancelBtn = document.getElementById('setBarCancel');
    const saveBtn = document.getElementById('setBarSave');

    cancelBtn.addEventListener('click', () => {
        window.Sound?.play('cancel');
        settings.classList.remove('open');
        veil.classList.remove('fade');
        musicVolume = savedMusicVolume;
        sfxVolume = savedSFXVolume;
        musicValue.textContent = `${Math.round(musicVolume * 100)}%`;
        sfxValue.textContent = `${Math.round(sfxVolume * 100)}%`;
        updateMusicVolume(savedMusicVolume);
        updateSFXVolume(savedSFXVolume);
    });

    saveBtn.addEventListener('click', () => {
        window.Sound?.play('save');
        settings.classList.remove('open');
        veil.classList.remove('fade');
        savedMusicVolume = musicVolume;
        savedSFXVolume = sfxVolume;
    });
})();
