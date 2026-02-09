(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const hint = document.getElementById("hint");

  // Ensure canvas uses pixel font once loaded (prevents iOS fallback jank)
  const fontReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  // ---------------- Game tuning (EASIER + more readable pacing) ----------------
  const GROUND_Y = canvas.height - 58;

  const GRAVITY = 1700;
  const JUMP_V = 660;

  const START_SPEED = 290;
  const SPEED_GAIN = 4.6;

  // MORE gaps between obstacles (easier)
  const GAP_MIN = 0.95;
  const GAP_MAX = 1.55;

  // Occasional doubles, but rare (not sweaty)
  const DOUBLE_PROB = 0.14;

  // ---------------- Text (in-world marquee) ----------------
  const phrases = [
    "Question coming up (bear with me — remember I coded this shit / stole some from Google).",
    "And yeah, you’re probably thinking: this dumb-ass had to code this stream of consciousness. Is this technically extra work or buffer for assets to load? We’ll never know…",
    "Anyway!!!",
    "Would you be free this coming Saturday to go for wine and/or dinner?",
    "And you can totally say no. There are no expectations, but!!!!!",
    "(Anything but complete the MA degree amirite?)",
    "Even if you say no: for you = fun. For me = my laptop is levitating.",
    "That you’re super cool, and I wouldn’t enjoy following someone else around on random department stuff half as much if it wasn’t you.",
    "Ok so this is an addition: yeah my laptop crashed. Meteor to dinosaur crashed."
  ];

  // Make sure the wall happens *after* all of the above + end beats.
  const endBeat1 = "You can die now.";
  const endBeat2 = "Really — I know you're a hardcore sweat, or maybe you're hoping I added a challenge in this somewhere. Actually...yeah, let's make this harder...";

  // When to append each phrase (score-ish distance)
  // Tuned so a normal run reaches the whole script.
  const thresholds = [120, 250, 380, 560, 720, 880, 1060, 1280, 1500];
  const endBeat1At = 1680;
  const endBeat2At = 1760;

  // Big separators/gaps between phrases
  const SEPARATOR = "                 ✦                 ";

  let phraseIndex = 0;
  let marquee = "";
  let marqueeX = canvas.width + 40;
  let endBeat1Added = false;
  let endBeat2Added = false;

  function appendMarquee(t) {
    marquee += (marquee ? SEPARATOR : "") + t;
  }

  // ---------------- Dino sprite (actual 🦖-readable silhouette) ----------------
  // 0 empty, 1 body, 2 eye, 3 teeth (small white pixels)
  // Two frames swap leg pixels for run animation.
  // Inspired by the T-Rex emoji proportions: big head + open mouth, tiny arms, thick legs, long tail. 
  const DINO_FRAMES = [
    [
      "0000000001111111110000000000",
      "0000000111111111111100000000",
      "0000001111111111111110000000",
      "0000011111111111111111000000",
      "0000111111111111111111100000",
      "0001111111111111111111110000",
      "0001111111111111111111110000",
      "0001111111111112222111110000",
      "0001111111111113333111110000",
      "0001111111111111111111100000",
      "0001111111111111111111000000",
      "0000111111111111111110000000",
      "0000011111111111111000000000",
      "0000001111111111110000000000",
      "0000000111111111100000000000",
      "0000000011111111000000000000",
      "0000000011111110000000000000",
      "0000000011111110000000000000",
      "0000000111111111000000000000",
      "0000001111111111100000000000",
      "0000011111111111110000000000",
      "0000111111111111111000000000",
      "0001111111110111111100000000",
      "0001111111100011111100000000",
      "0001111111100011111100000000",
      "0000111111000001111000000000",
      "0000011110000000110000000000",
      "0000001100000000110000000000",
      "0000001100000001100000000000",
      "0000000000000000000000000000",
    ],
    [
      "0000000001111111110000000000",
      "0000000111111111111100000000",
      "0000001111111111111110000000",
      "0000011111111111111111000000",
      "0000111111111111111111100000",
      "0001111111111111111111110000",
      "0001111111111111111111110000",
      "0001111111111112222111110000",
      "0001111111111113333111110000",
      "0001111111111111111111100000",
      "0001111111111111111111000000",
      "0000111111111111111110000000",
      "0000011111111111111000000000",
      "0000001111111111110000000000",
      "0000000111111111100000000000",
      "0000000011111111000000000000",
      "0000000011111110000000000000",
      "0000000011111110000000000000",
      "0000000111111111000000000000",
      "0000001111111111100000000000",
      "0000011111111111110000000000",
      "0000111111111111111000000000",
      "0001111111110111111100000000",
      "0001111111100011111100000000",
      "0001111111000001111100000000",
      "0000111111000001111000000000",
      "0000011110000000111100000000",
      "0000001100000000011000000000",
      "0000001100000001100000000000",
      "0000000000000000000000000000",
    ]
  ];

  const SCALE = 3; // bigger = more clearly a dino
  const SPRITE_W = DINO_FRAMES[0][0].length * SCALE;
  const SPRITE_H = DINO_FRAMES[0].length * SCALE;

  const dino = {
    x: 90,
    y: GROUND_Y,
    vy: 0,
    onGround: true,
    animT: 0,
  };

  function drawDino(frameIndex, isCrashed) {
    const frame = DINO_FRAMES[frameIndex];
    const body = isCrashed ? "rgba(192,57,43,1)" : "rgba(18,18,18,1)";
    const eye = "rgba(255,255,255,1)";
    const teeth = "rgba(255,255,255,0.95)";

    for (let r = 0; r < frame.length; r++) {
      const row = frame[r];
      for (let c = 0; c < row.length; c++) {
        const px = row[c];
        if (px === "0") continue;

        if (px === "1") ctx.fillStyle = body;
        else if (px === "2") ctx.fillStyle = eye;
        else ctx.fillStyle = teeth;

        ctx.fillRect(
          dino.x + c * SCALE,
          dino.y - SPRITE_H + r * SCALE,
          SCALE,
          SCALE
        );
      }
    }
  }

  // ---------------- Obstacles ----------------
  const obstacles = [];
  let nextSpawnIn = 0;

  function spawnObstaclePack() {
    const add = (w, h, xOffset = 0, kind = "cactus") => {
      obstacles.push({ kind, x: canvas.width + 20 + xOffset, y: GROUND_Y, w, h });
    };

    const r = Math.random();
    if (r < DOUBLE_PROB) {
      add(18, 34, 0);
      add(18, 34, 30);
    } else if (r < 0.85) {
      add(18, 34, 0);
    } else {
      add(26, 54, 0);
    }

    nextSpawnIn = (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * (canvas.width / speed);
  }

  function spawnWall() {
    obstacles.push({
      kind: "wall",
      x: canvas.width + 40,
      y: GROUND_Y,
      w: 110,
      h: 210, // deliberately unfair
    });
  }

  function overlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y - a.h < b.y &&
      a.y > b.y - b.h
    );
  }

  // ---------------- State ----------------
  let running = false;
  let crashed = false;
  let blackout = false;
  let blackoutMsg = "";

  let speed = START_SPEED;
  let distance = 0;
  let lastTs = null;

  function resetGame() {
    obstacles.length = 0;
    nextSpawnIn = 0;
    speed = START_SPEED;
    distance = 0;

    dino.y = GROUND_Y;
    dino.vy = 0;
    dino.onGround = true;
    dino.animT = 0;

    running = false;
    crashed = false;
    blackout = false;
    blackoutMsg = "";

    phraseIndex = 0;
    marquee = "";
    marqueeX = canvas.width + 40;
    endBeat1Added = false;
    endBeat2Added = false;

    scoreEl.textContent = "0";
    hint.textContent = "Tap / click to start & jump. Tap after crash to restart.";
  }

  function startGame() {
    if (!running && !blackout) {
      running = true;
      hint.textContent = "🦖";
    }
  }

  function crashToBlack(msg) {
    running = false;
    crashed = true;
    blackout = true;
    blackoutMsg = msg;
    hint.textContent = "Tap / click to restart.";
  }

  function crashNormal() {
    running = false;
    crashed = true;
    hint.textContent = "💥 Crash! Tap / click to restart.";
  }

  function jump() {
    if (blackout || crashed) {
      resetGame();
      startGame();
      return;
    }
    if (!running) startGame();
    if (dino.onGround) {
      dino.vy = -JUMP_V;
      dino.onGround = false;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      jump();
    }
  });

  window.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    jump();
  }, { passive: false });

  window.addEventListener("touchstart", (e) => {
    e.preventDefault();
    jump();
  }, { passive: false });

  // ---------------- Render ----------------
  function drawBlackout() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `16px "Press Start 2P", monospace`;

    // simple wrap
    const maxW = canvas.width - 80;
    const words = blackoutMsg.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const startY = canvas.height / 2 - (lines.length - 1) * 14;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], canvas.width / 2, startY + i * 28);
    }
  }

  function draw() {
    if (blackout) {
      drawBlackout();
      return;
    }

    // clear + background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // in-world text: centered between top and ground
    const textY = Math.floor((GROUND_Y * 0.5) - 12);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `20px "Press Start 2P", monospace`;
    if (marquee) ctx.fillText(marquee, marqueeX, textY);

    // ground line
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // dino
    const frameIndex = (Math.floor(dino.animT * 10) % 2);
    drawDino(frameIndex, crashed);

    // obstacles
    for (const o of obstacles) {
      if (o.kind === "wall") {
        ctx.fillStyle = "rgba(0,0,0,0.95)";
      } else {
        ctx.fillStyle = "rgba(18,18,18,1)";
      }
      ctx.fillRect(o.x, o.y - o.h, o.w, o.h);
    }
  }

  // ---------------- Loop ----------------
  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    if (running && !crashed && !blackout) {
      speed += SPEED_GAIN * dt;

      distance += speed * dt * 0.06;
      scoreEl.textContent = String(Math.floor(distance));

      // Append phrases once, in order
      while (phraseIndex < thresholds.length && distance >= thresholds[phraseIndex]) {
        appendMarquee(phrases[phraseIndex]);
        phraseIndex++;
      }

      // Append end beats once
      if (!endBeat1Added && distance >= endBeat1At) {
        appendMarquee(endBeat1);
        endBeat1Added = true;
      }
      if (!endBeat2Added && distance >= endBeat2At) {
        appendMarquee(endBeat2);
        endBeat2Added = true;
      }

      // Spawn obstacles
      nextSpawnIn -= dt;
      if (nextSpawnIn <= 0) spawnObstaclePack();

      // Move obstacles (world speed)
      for (const o of obstacles) o.x -= speed * dt;

      // Move marquee at *world speed* too (same as obstacles)
      marqueeX -= speed * dt;

      // Remove off-screen obstacles
      while (obstacles.length && obstacles[0].x + obstacles[0].w < -10) obstacles.shift();

      // Dino physics
      dino.animT += dt;
      if (!dino.onGround) {
        dino.vy += GRAVITY * dt;
        dino.y += dino.vy * dt;
        if (dino.y >= GROUND_Y) {
          dino.y = GROUND_Y;
          dino.vy = 0;
          dino.onGround = true;
        }
      }

      // Spawn the huge unjumpable wall ONLY after:
      // - all phrases appended
      // - end beats appended
      // - and a bit of extra runway so it lands as the final gag
      const allTextDone = (phraseIndex >= phrases.length) && endBeat1Added && endBeat2Added;
      const wallAlready = obstacles.some(o => o.kind === "wall");
      if (allTextDone && !wallAlready && distance >= (endBeat2At + 220)) {
        spawnWall();
      }

      // Collision (hitbox tuned to sprite)
      const dinoBox = {
        x: dino.x + 18,
        y: dino.y,
        w: SPRITE_W - 40,
        h: SPRITE_H - 10,
      };

      for (const o of obstacles) {
        if (overlap(dinoBox, o)) {
          if (o.kind === "wall") {
            crashToBlack("Oops. I think I fucked up the specifications there a little.");
          } else {
            crashNormal();
          }
          break;
        }
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  // Boot
  resetGame();
  fontReady.then(() => requestAnimationFrame(tick)).catch(() => requestAnimationFrame(tick));
})();
