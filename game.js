(() => {
  // ---------- Messages ----------
  // Trimmed / split your long one into two shorter beats.
  const messages = [
    "Question coming up (bear with me — remember I coded this / borrowed inspiration from Google).",
    "And yeah, you’re probably thinking: this dumb-ass coded a stream of consciousness. Is this extra work or a buffer for assets to load? We’ll never know…",
    "Anyway!!!",
    "Would you be free this coming Saturday to go for wine and/or dinner?",
    "And you can totally say no. There are no expectations, but!!!!!",
    "(Anything but complete the MA degree amirite?)",
    "Even if you say no, here is a fun way to say it. (For you: fun. For me: my laptop is levitating.)",
    "That you’re super cool — and I wouldn’t enjoy following someone else around on random department stuff half as much if it wasn’t you.",
    "Ok so this is an addition: yeah my laptop crashed. Meteor to dinosaur crashed."
  ];

  // When each message appears (distance units).
  // If messages happen too fast/slow, tweak these numbers.
  const thresholds = [140, 280, 420, 620, 760, 900, 1100, 1350, 1650];

  // Display duration per message (ms). You can adjust a specific one.
  const durations = [5200, 6500, 3500, 8000, 5200, 4200, 6200, 7000, 7000];

  // ---------- Canvas setup ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const overlay = document.getElementById("overlay");
  const hint = document.getElementById("hint");

  // ---------- Game constants ----------
  const GROUND_Y = canvas.height - 58;
  const GRAVITY = 1800;     // px/s^2
  const JUMP_V = 650;       // px/s
  const START_SPEED = 330;  // px/s
  const SPEED_GAIN = 6;     // px/s per second (difficulty ramp)

  // Dino hitbox
  const dino = {
    x: 90,
    y: GROUND_Y,
    w: 34,
    h: 46,
    vy: 0,
    onGround: true,
  };

  // Obstacles
  const obstacles = [];
  let nextSpawnIn = 0;

  // Game state
  let running = false;
  let crashed = false;
  let speed = START_SPEED;
  let distance = 0; // "score"
  let lastTs = null;

  // Message state
  let nextMsgIndex = 0;
  let hideTimer = null;

  function showMessage(text, ms) {
    overlay.textContent = text;
    overlay.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => overlay.classList.remove("show"), ms);
  }

  function updateMessages() {
    if (nextMsgIndex >= thresholds.length) return;
    if (distance >= thresholds[nextMsgIndex]) {
      showMessage(messages[nextMsgIndex], durations[nextMsgIndex] ?? 5200);
      nextMsgIndex++;
    }
  }

  function resetGame() {
    obstacles.length = 0;
    nextSpawnIn = 0;
    speed = START_SPEED;
    distance = 0;
    nextMsgIndex = 0;
    dino.y = GROUND_Y;
    dino.vy = 0;
    dino.onGround = true;
    crashed = false;
    scoreEl.textContent = "0";
    overlay.classList.remove("show");
    hint.textContent = "Tap / click to start & jump. Space works on laptop. Tap again after crash to restart.";
  }

  function startGame() {
    if (running) return;
    running = true;
    crashed = false;
    hint.textContent = "Go go go 🦖";
  }

  function crash() {
    crashed = true;
    running = false;
    hint.textContent = "💥 Crash! Tap / click to restart.";
    // Show the final “crash” line if she didn’t reach it
    if (nextMsgIndex < messages.length) {
      showMessage(messages[messages.length - 1], 8000);
      nextMsgIndex = messages.length;
    }
  }

  function jump() {
    if (!running && !crashed) startGame();

    if (crashed) {
      resetGame();
      startGame();
      return;
    }

    if (dino.onGround && running) {
      dino.vy = -JUMP_V;
      dino.onGround = false;
    }
  }

  // Controls: space + tap/click (iPhone)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      jump();
    }
  });

  const pointerHandler = (e) => {
    e.preventDefault();
    jump();
  };
  window.addEventListener("pointerdown", pointerHandler, { passive: false });
  window.addEventListener("touchstart", pointerHandler, { passive: false });

  // ---------- Obstacles ----------
  function spawnObstacle() {
    // cactus sizes
    const variant = Math.random();
    const h = variant < 0.6 ? 34 : variant < 0.9 ? 46 : 58;
    const w = variant < 0.6 ? 18 : variant < 0.9 ? 22 : 26;

    obstacles.push({
      x: canvas.width + 20,
      y: GROUND_Y,
      w,
      h,
    });

    // Spawn gap scales with speed a bit
    const minGap = 0.65;
    const maxGap = 1.2;
    nextSpawnIn = (minGap + Math.random() * (maxGap - minGap)) * (canvas.width / speed);
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y - a.h < b.y &&
      a.y > b.y - b.h
    );
  }

  // ---------- Render ----------
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // sky
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ground line
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(canvas.width, GROUND_Y + 1);
    ctx.stroke();

    // dino (simple pixel-ish block)
    ctx.fillStyle = crashed ? "#c0392b" : "#111";
    ctx.fillRect(dino.x, dino.y - dino.h, dino.w, dino.h);

    // eye (cute)
    ctx.fillStyle = "#fff";
    ctx.fillRect(dino.x + dino.w - 10, dino.y - dino.h + 10, 4, 4);

    // obstacles
    ctx.fillStyle = "#111";
    for (const o of obstacles) {
      ctx.fillRect(o.x, o.y - o.h, o.w, o.h);
    }

    // little “meteor” decoration when crashed
    if (crashed) {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.arc(canvas.width - 70, 60, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.arc(canvas.width - 45, 45, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Update loop ----------
  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000); // cap dt
    lastTs = ts;

    if (running && !crashed) {
      // speed ramp
      speed += SPEED_GAIN * dt;

      // distance increases with speed
      distance += speed * dt * 0.06; // scale down to “score-ish”
      scoreEl.textContent = String(Math.floor(distance));

      updateMessages();

      // spawn obstacles
      nextSpawnIn -= dt;
      if (nextSpawnIn <= 0) spawnObstacle();

      // move obstacles
      for (const o of obstacles) o.x -= speed * dt;

      // remove off-screen
      while (obstacles.length && obstacles[0].x + obstacles[0].w < -10) {
        obstacles.shift();
      }

      // physics: dino jump
      if (!dino.onGround) {
        dino.vy += GRAVITY * dt;
        dino.y += dino.vy * dt;
        if (dino.y >= GROUND_Y) {
          dino.y = GROUND_Y;
          dino.vy = 0;
          dino.onGround = true;
        }
      }

      // collisions
      const dinoBox = { x: dino.x, y: dino.y, w: dino.w, h: dino.h };
      for (const o of obstacles) {
        if (rectsOverlap(dinoBox, o)) {
          crash();
          break;
        }
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  // Start loop (idle until user jumps)
  resetGame();
  draw();
  requestAnimationFrame(tick);
})();
