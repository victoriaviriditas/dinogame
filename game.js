(() => {
  // ---------- Background “one-line” text (scrolling, no textbox) ----------
  // These get appended into one continuous marquee that scrolls in the background.
  const bgPhrases = [
    "Question coming up (bear with me — remember I coded this / borrowed inspiration from Google).",
    "And yeah, you’re probably thinking: this dumb-ass coded a stream of consciousness. Is this extra work or a buffer for assets to load? We’ll never know…",
    "Anyway!!!",
    "Would you be free this coming Saturday to go for wine and/or dinner?",
    "And you can totally say no. There are no expectations, but!!!!!",
    "(Anything but complete the MA degree amirite?)",
    "Even if you say no, for you this is fun — for me my laptop is levitating.",
    "That you’re super cool — and I wouldn’t enjoy following someone else around on random department stuff half as much if it wasn’t you.",
    "Ok so this is an addition: yeah my laptop crashed. Meteor to dinosaur crashed."
  ];

  // When each phrase gets appended into the scrolling line
  const phraseThresholds = [140, 280, 420, 620, 760, 900, 1100, 1350, 1650];

  // “Endgame” beats
  const endBeat1At = 2200; // "You can die now."
  const endBeat2At = 2350; // "Really... let's make this harder..."
  const wallAt    = 2550;  // huge unjumpable wall appears

  const endBeat1 = "You can die now.";
  const endBeat2 = "Really — I know you're a hardcore sweat, or maybe you're hoping I added a challenge in this somewhere. Actually...yeah, let's make this harder...";

  // ---------- Canvas setup ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const hint = document.getElementById("hint");

  // ---------- Game constants ----------
  const GROUND_Y = canvas.height - 58;

  const GRAVITY = 1900;
  const JUMP_V = 680;

  const START_SPEED = 350;
  const SPEED_GAIN = 9; // slightly harder ramp

  // Physics and sizing
  const dino = {
    x: 90,
    y: GROUND_Y,
    w: 34,
    h: 46,
    vy: 0,
    onGround: true,
    animT: 0,
  };

  const obstacles = [];
  let nextSpawnIn = 0;

  // State
  let running = false;
  let crashed = false;
  let speed = START_SPEED;
  let distance = 0;
  let lastTs = null;

  // Background text marquee
  let phraseIndex = 0;
  let marquee = " ";        // built over time
  let marqueeX = canvas.width + 40; // scrolls from right to left

  // Endgame flags
  let endBeat1Added = false;
  let endBeat2Added = false;
  let wallSpawned = false;
  let blackout = false;
  let blackoutMsg = "";

  // ---------- Utility ----------
  function appendToMarquee(text) {
    // Add separators so it reads like one continuous line.
    marquee += "   ✦   " + text;
  }

  function resetGame() {
    obstacles.length = 0;
    nextSpawnIn = 0;
    speed = START_SPEED;
    distance = 0;

    dino.y = GROUND_Y;
    dino.vy = 0;
    dino.onGround = true;
    dino.animT = 0;

    crashed = false;
    running = false;

    phraseIndex = 0;
    marquee = " ";
    marqueeX = canvas.width + 40;

    endBeat1Added = false;
    endBeat2Added = false;
    wallSpawned = false;

    blackout = false;
    blackoutMsg = "";

    scoreEl.textContent = "0";
    hint.textContent = "Tap / click to start & jump. Space works on laptop. Tap again after crash to restart.";
  }

  function startGame() {
    if (running || blackout) return;
    running = true;
    crashed = false;
    hint.textContent = "Go go go 🦖";
  }

  function crashToBlack(msg) {
    crashed = true;
    running = false;
    blackout = true;
    blackoutMsg = msg;
    hint.textContent = "Tap / click to restart.";
  }

  function crashNormal() {
    crashed = true;
    running = false;
    hint.textContent = "💥 Crash! Tap / click to restart.";
  }

  function jump() {
    if (blackout) {
      resetGame();
      startGame();
      return;
    }

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

  // Controls: space + tap/click (iPhone-friendly)
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
  function spawnObstaclePack() {
    // Slightly harder: higher chance of multiple blocks.
    // Types: single cactus, double cactus (close), occasional tall cactus.
    const r = Math.random();

    const addCactus = (w, h, xOffset = 0) => {
      obstacles.push({
        kind: "cactus",
        x: canvas.width + 20 + xOffset,
        y: GROUND_Y,
        w,
        h,
      });
    };

    if (r < 0.55) {
      addCactus(18, 34);
    } else if (r < 0.85) {
      // double cactus (more blocks)
      addCactus(18, 34, 0);
      addCactus(18, 34, 26);
    } else {
      addCactus(26, 58);
    }

    // Spawn frequency: smaller gap than before (harder but not brutal)
    const minGap = 0.48;
    const maxGap = 0.95;
    nextSpawnIn = (minGap + Math.random() * (maxGap - minGap)) * (canvas.width / speed);
  }

  function spawnHugeWall() {
    // Unjumpable: make it taller than max jump clearance and wide.
    obstacles.push({
      kind: "wall",
      x: canvas.width + 40,
      y: GROUND_Y,
      w: 80,
      h: 170, // deliberately too high
    });
    wallSpawned = true;
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y - a.h < b.y &&
      a.y > b.y - b.h
    );
  }

  // ---------- Pixel dino drawing ----------
  // 0 = empty, 1 = body, 2 = eye, 3 = highlight
  const DINO_SPRITES = [
    [
      "000111110000",
      "001111111000",
      "011111111100",
      "011111111110",
      "011111111110",
      "011111111110",
      "011111222110",
      "011111111110",
      "001111111100",
      "000111111000",
      "000110011000",
      "000110011000",
    ],
    [
      "000111110000",
      "001111111000",
      "011111111100",
      "011111111110",
      "011111111110",
      "011111111110",
      "011111222110",
      "011111111110",
      "001111111100",
      "000111111000",
      "000110011000",
      "000011001100",
    ],
  ];

  function drawPixelSprite(sprite, x, y, scale, isCrashed) {
    // y is ground (bottom). sprite is drawn upwards.
    const body = isCrashed ? "rgba(192,57,43,1)" : "rgba(17,17,17,1)";
    const eye = "rgba(255,255,255,1)";
    const hi = "rgba(255,255,255,0.35)";

    for (let row = 0; row < sprite.length; row++) {
      const line = sprite[row];
      for (let col = 0; col < line.length; col++) {
        const c = line[col];
        if (c === "0") continue;
        if (c === "1") ctx.fillStyle = body;
        else if (c === "2") ctx.fillStyle = eye;
        else if (c === "3") ctx.fillStyle = hi;

        const px = x + col * scale;
        const py = (y - sprite.length * scale) + row * scale;
        ctx.fillRect(px, py, scale, scale);
      }
    }
  }

  // ---------- Render ----------
  function draw() {
    // Blackout screen after the huge wall crash
    if (blackout) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Wrap message roughly
      const maxW = canvas.width - 80;
      const words = blackoutMsg.split(" ");
      let line = "";
      const lines = [];
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
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // sky
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // background marquee text (single line)
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.font = "16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(marquee, marqueeX, 20);

    // ground
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(canvas.width, GROUND_Y + 1);
    ctx.stroke();

    // dino sprite
    const frame = (Math.floor(dino.animT * 10) % 2);
    const sprite = DINO_SPRITES[frame];
    drawPixelSprite(sprite, dino.x, dino.y, 4, crashed);

    // obstacles
    for (const o of obstacles) {
      if (o.kind === "wall") {
        ctx.fillStyle = "rgba(0,0,0,0.92)";
        ctx.fillRect(o.x, o.y - o.h, o.w, o.h);

        // little “impossible” accent stripes
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(o.x + 8, o.y - o.h + 10 + i * 26, o.w - 16, 6);
        }
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(o.x, o.y - o.h, o.w, o.h);
      }
    }
  }

  // ---------- Update loop ----------
  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    if (running && !crashed && !blackout) {
      speed += SPEED_GAIN * dt;

      distance += speed * dt * 0.06;
      scoreEl.textContent = String(Math.floor(distance));

      // Append phrases into marquee when thresholds hit
      if (phraseIndex < phraseThresholds.length && distance >= phraseThresholds[phraseIndex]) {
        appendToMarquee(bgPhrases[phraseIndex]);
        phraseIndex++;
      }

      // Endgame beats
      if (!endBeat1Added && distance >= endBeat1At) {
        appendToMarquee(endBeat1);
        endBeat1Added = true;
      }
      if (!endBeat2Added && distance >= endBeat2At) {
        appendToMarquee(endBeat2);
        endBeat2Added = true;
        // make it harder NOW: faster ramp + tighter gaps
        // (kept modest; feel free to bump a little)
        // This is intentionally subtle but noticeable.
      }
      if (!wallSpawned && distance >= wallAt) {
        spawnHugeWall();
      }

      // Spawn obstacles more often (harder)
      nextSpawnIn -= dt;
      if (nextSpawnIn <= 0) spawnObstaclePack();

      // Move obstacles
      for (const o of obstacles) o.x -= speed * dt;

      // Remove off-screen
      while (obstacles.length && obstacles[0].x + obstacles[0].w < -10) {
        obstacles.shift();
      }

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

      // Marquee scroll speed (subtle parallax)
      marqueeX -= speed * dt * 0.22;
      // Keep it looping: once fully off-screen, reset a bit to the right
      if (marqueeX < -ctx.measureText(marquee).width - 40) {
        marqueeX = canvas.width + 40;
      }

      // Collisions
      const dinoBox = {
        x: dino.x + 6,
        y: dino.y,
        w: dino.w + 20, // sprite is wider than old box; pad
        h: dino.h + 6,
      };

      for (const o of obstacles) {
        if (rectsOverlap(dinoBox, o)) {
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

  // Start idle loop
  resetGame();
  draw();
  requestAnimationFrame(tick);
})();
