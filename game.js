(() => {
  // ---------- Messages ----------
  const messages = [
    "Question coming up (bear with me - I coded this shit, approx 700 lines)",
    "And yeah, you’re probably thinking: this dumb-ass had to code this stream of consciousness. Is this technically extra work or buffer for assets to load? We’ll never know…",
    "Anyway!!!",
    "Would you be free this coming Saturday to go for wine and/or dinner?",
    "And you can totally say no. There are no expectations, but!!!!!",
    "(Anything but complete the MA degree amirite?)",
    "Even if you say no, here is a fun way (for you: for me my laptop is now probably levitating by the time I’ve got to this line of code - its 5 years old Tanja; consider this its euthanising) TO SAY!! Back on track now!!",
    "That you’re super cool, and I wouldn’t enjoy following someone else around on random department stuff half as much if it wasn’t you",
    "Ok so this is an addition: yeah my laptop crashed. Meteor to dinosaur crashed."
  ];

  // Score thresholds for the main messages
  const thresholds = [150, 300, 450, 650, 800, 950, 1150, 1400, 1700];

  // How long each message stays visible (ms).
  // Make the long one linger longer.
  const durations = [5200, 6500, 3500, 8000, 5200, 4200, 11000, 7000, 7000];

  // ---------- NEW endgame sequence ----------
  const END_1_SCORE = 1900;
  const END_2_SCORE = 2025;
  const WALL_SCORE  = 2200;

  const end1 = "You can die now.";
  const end2 = "Really - I know you're a hardcore sweat, or maybe you're hoping I added a challenge in this somewhere. Actually...yeah, let's make this harder...";

  let end1Shown = false;
  let end2Shown = false;
  let wallSpawned = false;

  // ---------- Canvas setup ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const overlay = document.getElementById("overlay");
  const hint = document.getElementById("hint");

  // ---------- Game constants (EARLY DEMO DIFFICULTY) ----------
  const GROUND_Y = canvas.height - 58;
  const GRAVITY = 1800;
  const JUMP_V = 650;
  const START_SPEED = 330;
  const SPEED_GAIN = 6;

  // Dino hitbox (the classic cube dino from the first demo)
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
  let blackout = false;
  let blackoutMsg = "";

  let speed = START_SPEED;
  let distance = 0; // score-ish
  let lastTs = null;

  // Message state
  let nextMsgIndex = 0;
  let hideTimer = null;

  function showMessage(text, ms = 5200) {
    overlay.textContent = text;
    overlay.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => overlay.classList.remove("show"), ms);
  }

  function updateMainMessages() {
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

    end1Shown = false;
    end2Shown = false;
    wallSpawned = false;

    dino.y = GROUND_Y;
    dino.vy = 0;
    dino.onGround = true;

    crashed = false;
    running = false;

    blackout = false;
    blackoutMsg = "";

    scoreEl.textContent = "0";
    overlay.classList.remove("show");
    hint.textContent = "Tap / click to start & jump. Space works on laptop. Tap again after crash to restart.";
  }

  function startGame() {
    if (running || blackout) return;
    running = true;
    crashed = false;
    hint.textContent = "Go go go 🦖";
  }

  function crashNormal() {
    crashed = true;
    running = false;
    hint.textContent = "💥 Crash! Tap / click to restart.";
  }

  function crashToBlack(msg) {
    crashed = true;
    running = false;
    blackout = true;
    blackoutMsg = msg;
    hint.textContent = "Tap / click to restart.";
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

    obstacles.push({
      kind: "cactus",
      x: canvas.width + 20,
      y: GROUND_Y,
      w,
      h,
    });

    // Early demo spacing (moderate)
    const minGap = 0.65;
    const maxGap = 1.2;
    nextSpawnIn = (minGap + Math.random() * (maxGap - minGap)) * (canvas.width / speed);
  }

  function spawnHugeWall() {
    // Intentionally unjumpable + huge
    obstacles.push({
      kind: "wall",
      x: canvas.width + 40,
      y: GROUND_Y,
      w: 110,
      h: 220
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

  // ---------- Render ----------
  function drawBlackout() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Basic wrap
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // sky
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ground
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(canvas.width, GROUND_Y + 1);
    ctx.stroke();

    // dino (cube, like the earliest demo)
    ctx.fillStyle = crashed ? "#c0392b" : "#111";
    ctx.fillRect(dino.x, dino.y - dino.h, dino.w, dino.h);

    // eye (cute)
    ctx.fillStyle = "#fff";
    ctx.fillRect(dino.x + dino.w - 10, dino.y - dino.h + 10, 4, 4);

    // obstacles
    for (const o of obstacles) {
      if (o.kind === "wall") {
        ctx.fillStyle = "rgba(0,0,0,0.95)";
        ctx.fillRect(o.x, o.y - o.h, o.w, o.h);

        // little stripes so it looks “special”
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let i = 0; i < 7; i++) {
          ctx.fillRect(o.x + 10, o.y - o.h + 12 + i * 26, o.w - 20, 6);
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

      // score
      distance += speed * dt * 0.06;
      scoreEl.textContent = String(Math.floor(distance));

      // main messages
      updateMainMessages();

      // endgame messages (close together)
      if (!end1Shown && distance >= END_1_SCORE) {
        showMessage(end1, 4500);
        end1Shown = true;
      }
      if (!end2Shown && distance >= END_2_SCORE) {
        showMessage(end2, 9000);
        end2Shown = true;

        // make it “a bit harder” after the line lands:
        // tighter spawns by bumping speed ramp a touch (subtle, not brutal)
        // (done by increasing SPEED_GAIN via speed itself—simple effect here)
        speed += 40;
      }

      // spawn huge unjumpable wall near the very end
      if (!wallSpawned && distance >= WALL_SCORE) {
        spawnHugeWall();
      }

      // spawn obstacles
      nextSpawnIn -= dt;
      if (nextSpawnIn <= 0) spawnObstacle();

      // move obstacles
      for (const o of obstacles) o.x -= speed * dt;

      // remove off-screen
      while (obstacles.length && obstacles[0].x + obstacles[0].w < -10) {
        obstacles.shift();
      }

      // physics: dino
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

  resetGame();
  draw();
  requestAnimationFrame(tick);
})();
