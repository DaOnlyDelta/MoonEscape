(function() {
	const canvas = document.getElementById('moonCanvas');
	const ctx = canvas.getContext('2d');
	canvas.width = 256;
	canvas.height = 256;

	const frameCount = 60;
	const framePaths = [];
	for (let i = 1; i <= frameCount; i++) {
		framePaths.push(`../img/moon/${i}.png`);
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
})();
