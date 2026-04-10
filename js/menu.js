(function() {
	const canvas = document.getElementById('moonCanvas');
	const ctx = canvas.getContext('2d');
	canvas.width = 256;
	canvas.height = 256;

	const frameCount = 60;
	const framePaths = [];
	for (let i = 1; i <= frameCount; i++) {
		framePaths.push(`./assets/moon/${i}.png`);
	}

	// Preload images
	const frames = [];
	let loaded = 0;
	framePaths.forEach((src, idx) => {
		const img = new Image();
		img.src = src;
		img.onload = () => {
			loaded++;
			frames[idx] = img;
			// When all images are loaded, set canvas size to a larger value (e.g., 3x original)
			if (loaded === frameCount) {
				// Use the first image's size (assuming all frames are same size)
				const scale = 3; // Change this to make the moon bigger or smaller
				canvas.width = img.naturalWidth * scale;
				canvas.height = img.naturalHeight * scale;
				// Disable image smoothing for pixel art
				ctx.imageSmoothingEnabled = false;
				startAnimation(scale);
			}
		};
	});

	function startAnimation(scale) {
		let current = 0;
		const frameDelay = 80;
		function draw() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			// Draw scaled up, no smoothing
			ctx.drawImage(frames[current], 0, 0, frames[current].naturalWidth, frames[current].naturalHeight, 0, 0, frames[current].naturalWidth * scale, frames[current].naturalHeight * scale);
			current = (current + 1) % frameCount;
			setTimeout(draw, frameDelay);
		}
		draw();
	}

	let trans = false;
	const moonPlay = document.getElementById('moonPlay');
	const veil = document.getElementById('veil');
	const moonTextLeft = document.getElementById('moonTextLeft');
	const moonTextRight = document.getElementById('moonTextRight');
	canvas.addEventListener('mouseenter', () => {
		if (trans) return;
		canvas.classList.add('hovered');
		moonPlay.classList.add('hovered');
	});

	canvas.addEventListener('mouseout', () => {
		canvas.classList.remove('hovered');
		moonPlay.classList.remove('hovered');
	});

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

	canvas.addEventListener('click', () => transition());

	// Transition animation
	function transition() {
		trans = true;
		window.gameStarted = true;
		window.Sound?.play('start');
		canvas.classList.remove('hovered');
		moonPlay.classList.remove('hovered');

		settingsBtn.classList.add('fadeout');
		moonPlay.classList.add('fadeout');
		moonTextLeft?.classList.add('fadeout');
		moonTextRight?.classList.add('fadeout');
		canvas.classList.add('pre-transition');
		
		setTimeout(() => {
			canvas.classList.add('transition');
			veil.classList.add('transition');

			setTimeout(() => {
				window.playerVisible = true;
				document.getElementById('background').classList.add('off');
				document.getElementById('game').classList.add('on');
				window.unveilFromCenter({ duration: 1000 });
			}, 2000);
		}, 800);
	}

	if (true) {
		trans = true;
		window.gameStarted = true;
		window.Sound?.play('start');
		canvas.classList.remove('hovered');
		moonPlay.classList.remove('hovered');

		settingsBtn.classList.add('fadeout');
		moonPlay.classList.add('fadeout');
		moonTextLeft?.classList.add('fadeout');
		moonTextRight?.classList.add('fadeout');
		canvas.classList.add('pre-transition');
		
		setTimeout(() => {
			canvas.classList.add('transition');
			veil.classList.add('transition');

			setTimeout(() => {
				window.playerVisible = true;
				document.getElementById('background').classList.add('off');
				document.getElementById('game').classList.add('on');
				window.unveilFromCenter({ duration: 1000 });
			}, 0);
		}, 0);
	};
})();
