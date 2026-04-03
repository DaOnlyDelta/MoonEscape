(function() {
    const veil = document.getElementById('veil');
    function runCenterOutUnveil(options = {}) {
        const duration = Number.isFinite(Number(options.duration)) ? Math.max(100, Number(options.duration)) : 900;
        const centerX = Number.isFinite(Number(options.centerX)) ? Number(options.centerX) : window.innerWidth / 2;
        const centerY = Number.isFinite(Number(options.centerY)) ? Number(options.centerY) : window.innerHeight / 2;
        const maxRadius = Math.hypot(
            Math.max(centerX, window.innerWidth - centerX),
            Math.max(centerY, window.innerHeight - centerY)
        );

        veil.classList.remove('fade');
        veil.classList.add('transition');
        veil.style.transition = 'none';
        veil.style.pointerEvents = 'all';
        veil.style.opacity = '1';
        veil.style.backgroundColor = 'transparent';

        const start = performance.now();

        function easeInOutCubic(t) {
            return t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function frame(now) {
            const elapsed = now - start;
            const t = Math.min(1, elapsed / duration);
            const eased = easeInOutCubic(t);
            const radius = eased * maxRadius;
            veil.style.backgroundImage = `radial-gradient(circle at ${centerX}px ${centerY}px, transparent ${radius}px, #000 ${radius + 2}px)`;

            if (t < 1) {
                requestAnimationFrame(frame);
                return;
            }

            // Hide veil first, then clean up styles on the next frame to avoid flicker.
            veil.style.opacity = '0';
            veil.style.pointerEvents = 'none';
            veil.classList.remove('transition');
            veil.classList.remove('fade');

            requestAnimationFrame(() => {
                veil.style.backgroundColor = '';
                veil.style.transition = '';
            });
        }

        requestAnimationFrame(frame);
    }

    window.unveilFromCenter = runCenterOutUnveil;

    window.addEventListener('keydown', (evt) => {
        if (!window.gameStarted) return;
        if (evt.key === 'Escape') {
            window.openSettings();
        }
    });

    const layoutCanvas = document.getElementById('moon2');
    const ltx = layoutCanvas.getContext('2d');
    ltx.imageSmoothingEnabled = false;

    const wWidth = window.innerWidth;
    const wHeight = window.innerHeight;
    layoutCanvas.width = wWidth;
    layoutCanvas.height = wHeight;

    let sx, sy;
    let dx = 0;
    let dy = wHeight / 2;

    const scale = 1.5;
    const upscaled = 2;
    let width = 32 * upscaled;
    let height = 32 * upscaled;
    sy = 0;
    sx = 32 * upscaled;

    const gridW = Math.ceil(wWidth / (width * scale)) + 1;
    console.log(gridW);

    const gridH = Math.ceil(wHeight / (height * scale) * 3);
    console.log(gridH);

    function getRandomTileSx() {
        const defaultTileSx = width;
        const tileCount = 7;

        // Keep the current/default tile much more likely than the others.
        return Math.random() < 0.8
            ? defaultTileSx
            : Math.floor(Math.random() * tileCount) * width;
    }

    const img = new Image();
    let offset = false;
    img.src = './assets/tileset1.png';
    img.onload = () => {
        for (let i = 0; i < gridH; i++) {
            // Calculate opacity for this row: 33%, then 100%
            const rowOpacity = Math.min(1, 0.33 + i * 0.33);
            ltx.globalAlpha = rowOpacity;
            
            for (let j = 0; j < gridW; j++) {
                sx = getRandomTileSx();
                ltx.drawImage(img, sx, sy, width, height, dx, dy, width * scale, height * scale);
                dx += width * scale;
            }
            dy += (height / 4) * scale;
            offset = !offset;
            dx = (offset) ? -width / (2 / scale) : 0;
        }
    };
})();
