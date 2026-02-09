(() => {
  // ---------- Background text (in-canvas, never covers play) ----------
  // We show the current message faintly in the “sky” area.
  let bgText = "Tap / click to start. (Space works too.)";

  function setBgText(t) {
    bgText = t;
  }

  function wrapTextLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";

    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // ---------- Messages (with your additions + split long ones) ----------
  const messages = [
    // new pre-question lines
    "I could not use a dinosaur.",
    "Because copyright haha. Willing suspension of disbelief.",
    "Maybe its a dinosaur after the meteor?",
    "No...maybe not.",

    // original stream (split where it was too long)
    "Question coming up (bear with me — remember I coded this shit / stole some from Google).",
    "And yeah, you’re probably thinking: this dumb-ass had to code this stream of consciousness.",
    "Is this technically extra work or buffer for assets to load? We’ll never know…",
    "Anyway!!!",
    "Would you be free this coming Saturday to go for wine and/or dinner?",
    "And you can totally say no. There are no expectations, but!!!!!",
    "(Anything but complete the MA degree amirite?)",
    "Even if you say no: for you this is fun.",
    "For me my laptop is levitating — it’s 5 years old, Tanja; consider this its euthanising.",
    "That you’re super cool, and I wouldn’t enjoy following someone else around on random department stuff half as much if it wasn’t you",
    "Ok so this is an addition: yeah my laptop crashed. Meteor to dinosaur crashed."
  ];

  // Score thresholds when each message appears.
  // Spaced out so she can actually read them.
  const thresholds = [
    80,   160,  240,  320,
    430,  560,  690,  820,
    980,  1120, 1260, 1420,
    1600, 1780, 2000
  ];

  let nextMsgIndex = 0;

  function updateMessagesForScore(score) {
    if (nextMsgIndex >= thresholds.length) return;
    if (score >= thresholds[nextMsgIndex]) {
      setBgText(messages[nextMsgIndex]);
      nextMsgIndex++;
    }
  }

  // ---------- Canvas setup ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const hint = document.getElementById("hint");

  // ---------- Game constants (earliest demo feel) ----------
  const GROUND_Y = canvas.height - 58;
  const GRAVITY = 1800;
  const JUMP_V = 650;
  const START_SPEED = 330;
  const SPEED_GAIN = 6;

  // Dino (the original block)
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
  let distance = 0;
  let lastTs = null;

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
    running = false;

    scoreEl.textContent = "0";
    hint.textContent = "Tap / click to start & jump. Space works on laptop. Tap again after crash to restart.";
    setBgText("Tap / click to start. (Space works too.)");
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
    // When she crashes, force the meteor line as a final punch if not reached
    setBgText(messages[messages.length - 1]);
    nextMsgIndex = thresholds.length; // stop further updates
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
    const variant = Math.random();
    const h = variant < 0.6 ? 34 : variant < 0.9 ? 46 : 58;
    const w = variant < 0.6 ? 18 : variant < 0.9 ? 22 : 26;

    obstacles.push({ x: canvas.width + 20, y: GROUND_Y, w, h });

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
  function drawBackgroundText() {
    // Put text in the “sky” so it never covers gameplay near ground.
    // Two-line wrap max.
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.font = "18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const maxW = canvas.width - 80;
    const lines = wrapTextLines(ctx, bgText, maxW).slice(0, 2);

    const y = 36; // safely above the action
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], canvas.width / 2, y + i * 24);
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // sky
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // faint in-game text
    drawBackgroundText();

    // ground
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(canvas.width, GROUND_Y + 1);
    ctx.stroke();

    // dino
    ctx.fillStyle = crashed ? "#c0392b" : "#111";
    ctx.fillRect(dino.x, dino.y - dino.h, dino.w, dino.h);

    // eye
    ctx.fillStyle = "#fff";
    ctx.fillRect(dino.x + dino.w - 10, dino.y - dino.h + 10, 4, 4);

    // obstacles
    ctx.fillStyle = "#111";
    for (const o of obstacles) {
      ctx.fillRect(o.x, o.y - o.h, o.w, o.h);
    }
  }

  // ---------- Update loop ----------
  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    if (running && !crashed) {
      speed += SPEED_GAIN * dt;

      distance += speed * dt * 0.06;
      scoreEl.textContent = String(Math.floor(distance));

      updateMessagesForScore(distance);

      nextSpawnIn -= dt;
      if (nextSpawnIn <= 0) spawnObstacle();

      for (const o of obstacles) o.x -= speed * dt;

      while (obstacles.length && obstacles[0].x + obstacles[0].w < -10) {
        obstacles.shift();
      }

      if (!dino.onGround) {
        dino.vy += GRAVITY * dt;
        dino.y += dino.vy * dt;
        if (dino.y >= GROUND_Y) {
          dino.y = GROUND_Y;
          dino.vy = 0;
          dino.onGround = true;
        }
      }

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

  resetGame();
  draw();
  requestAnimationFrame(tick);
})();
