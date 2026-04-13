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

    // Enemies
    
})();
