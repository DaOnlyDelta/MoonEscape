(function() {
	const canvas = document.getElementById('player');
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;

	window.gameStarted = window.gameStarted ?? false;
	window.playerVisible = window.playerVisible ?? false;

	const frameCount = 8;
	const moveSpeedVh = 28;
	const bottomMarginRatio = 0.08;
	const pressedKeys = new Set();

	function loadSprite(src) {
		const image = new Image();
		image.src = src;
		return image;
	}

	const sprites = {
		idle: loadSprite('./assets/character/IDLE/idle_right.png'),
		runUp: loadSprite('./assets/character/RUN/run_up.png'),
		runDown: loadSprite('./assets/character/RUN/run_down.png'),
		attack: loadSprite('./assets/character/ATK1/attack1_right.png'),
	};

	const player = {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		state: 'idle',
		frame: 0,
		frameTime: 0,
		initialized: false,
	};

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function getMovementState() {
		const movingUp = pressedKeys.has('w') || pressedKeys.has('arrowup');
		const movingDown = pressedKeys.has('s') || pressedKeys.has('arrowdown');

		if (movingUp) return 'runUp';
		if (movingDown) return 'runDown';
		return 'idle';
	}

	function getMovementVector() {
		const up = (pressedKeys.has('w') || pressedKeys.has('arrowup')) ? 1 : 0;
		const down = (pressedKeys.has('s') || pressedKeys.has('arrowdown')) ? 1 : 0;

		return {
			x: 0,
			y: down - up,
		};
	}

	function drawSpriteFrame(sprite, frameIndex, x, y, drawWidth, drawHeight) {
		const sourceWidth = sprite.naturalWidth / frameCount;
		const sourceHeight = sprite.naturalHeight;
		const sourceX = frameIndex * sourceWidth;

		ctx.drawImage(
			sprite,
			sourceX,
			0,
			sourceWidth,
			sourceHeight,
			x,
			y,
			drawWidth,
			drawHeight
		);
	}

	function resetPlayerPosition() {
		const idleSprite = sprites.idle;
		if (!idleSprite.complete || !idleSprite.naturalWidth || !idleSprite.naturalHeight) {
			player.initialized = false;
			return;
		}

		const frameWidth = idleSprite.naturalWidth / frameCount;
		const frameHeight = idleSprite.naturalHeight;
		const targetHeight = canvas.height * 0.28;
		const scale = targetHeight / frameHeight;
		const drawWidth = frameWidth * scale;
		const drawHeight = frameHeight * scale;

		player.x = 0;
		player.y = canvas.height - drawHeight - canvas.height * bottomMarginRatio;
		player.width = drawWidth;
		player.height = drawHeight;
		player.state = 'idle';
		player.frame = 0;
		player.frameTime = 0;
		player.initialized = true;
	}

	function ensurePlayerMetrics(sprite) {
		const frameWidth = sprite.naturalWidth / frameCount;
		const frameHeight = sprite.naturalHeight;
		const targetHeight = canvas.height * 0.28;
		const scale = targetHeight / frameHeight;
		const drawWidth = frameWidth * scale;
		const drawHeight = frameHeight * scale;

		player.width = drawWidth;
		player.height = drawHeight;

		return {
			frameWidth,
			frameHeight,
			drawWidth,
			drawHeight,
			scale,
		};
	}

	function render(now) {
		if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
			resizeCanvas();
			if (window.gameStarted) {
				resetPlayerPosition();
			}
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (!window.gameStarted || !window.playerVisible) {
			player.initialized = false;
			requestAnimationFrame(render);
			return;
		}

		if (!player.initialized) {
			resetPlayerPosition();
		}

		const state = getMovementState();
		const sprite = sprites[state];
		if (!sprite.complete || !sprite.naturalWidth || !sprite.naturalHeight) {
			requestAnimationFrame(render);
			return;
		}

		const deltaSeconds = render.lastTime ? (now - render.lastTime) / 1000 : 0;
		render.lastTime = now;
		const moveSpeed = canvas.height * (moveSpeedVh / 100);

		const movement = getMovementVector();
		player.y += movement.y * moveSpeed * deltaSeconds;

		const metrics = ensurePlayerMetrics(sprite);
		player.x = 0;
		player.y = clamp(player.y, canvas.height / 2 - player.height / 2, Math.max(0, canvas.height - player.height));

		if (state !== player.state) {
			player.state = state;
			player.frame = 0;
			player.frameTime = 0;
		}

		const frameDelay = state === 'idle' ? 120 : 90;
		player.frameTime += now - (render.lastFrameTime ?? now);
		render.lastFrameTime = now;

		if (player.frameTime >= frameDelay) {
			player.frame = (player.frame + 1) % frameCount;
			player.frameTime = 0;
		}

		drawSpriteFrame(sprite, player.frame, player.x, player.y, metrics.drawWidth, metrics.drawHeight);

		requestAnimationFrame(render);
	}

	function onKeyDown(evt) {
		pressedKeys.add(evt.key.toLowerCase());
	}

	function onKeyUp(evt) {
		pressedKeys.delete(evt.key.toLowerCase());
	}

	function onBlur() {
		pressedKeys.clear();
	}

	window.PlayerSprites = sprites;

	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('blur', onBlur);
	window.addEventListener('resize', resizeCanvas);

	resizeCanvas();
	sprites.idle.onload = () => requestAnimationFrame(render);

	if (sprites.idle.complete) {
		requestAnimationFrame(render);
	}
})();
