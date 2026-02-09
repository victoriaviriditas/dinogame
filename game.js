(() => {

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const hint = document.getElementById("hint");

const GROUND_Y = canvas.height - 58;

const GRAVITY = 1750;
const JUMP_V = 660;
const START_SPEED = 300;
const SPEED_GAIN = 5;

const GAP_MIN = 0.8;
const GAP_MAX = 1.4;

const phrases = [
"Question coming up (bear with me — remember I coded this / borrowed inspiration from Google).",
"And yeah, you’re probably thinking: this dumb-ass coded a stream of consciousness. Is this extra work or a buffer for assets to load? We’ll never know…",
"Anyway!!!",
"Would you be free this coming Saturday to go for wine and/or dinner?",
"And you can totally say no. There are no expectations, but!!!!!",
"(Anything but complete the MA degree amirite?)",
"Even if you say no: for you = fun. For me = my laptop is levitating.",
"That you’re super cool — and I wouldn’t enjoy following someone else around half as much if it wasn’t you.",
"Ok so this is an addition: yeah my laptop crashed. Meteor to dinosaur crashed."
];

const thresholds = [120,240,360,520,660,800,980,1180,1400];

const endBeat1At = 1550;
const endBeat2At = 1650;
const wallAt = 1820;

const endBeat1 = "You can die now.";
const endBeat2 = "Really — I know you're a hardcore sweat... Actually... yeah, let's make this harder...";

let phraseIndex = 0;
let marquee = "";
let marqueeX = canvas.width + 40;
const SEPARATOR = "        ✦        ";

function appendMarquee(t){
  marquee += (marquee ? SEPARATOR : "") + t;
}

const SCALE = 3;

// pixel dinosaur (emoji-like silhouette)
const DINO = [
"000111111000",
"001111111100",
"011111111110",
"011111111110",
"011111111110",
"011111222110",
"011111111100",
"001111111000",
"000111111000",
"000110011000",
"000110011000",
];

const SPRITE_W = DINO[0].length * SCALE;
const SPRITE_H = DINO.length * SCALE;

const dino = {
  x: 90,
  y: GROUND_Y,
  vy: 0,
  onGround: true,
};

const obstacles = [];
let nextSpawnIn = 0;

let running = false;
let crashed = false;
let blackout = false;
let blackoutMsg = "";

let speed = START_SPEED;
let distance = 0;
let lastTs = null;

function resetGame(){
  obstacles.length = 0;
  nextSpawnIn = 0;
  speed = START_SPEED;
  distance = 0;
  phraseIndex = 0;
  marquee = "";
  marqueeX = canvas.width + 40;
  crashed = false;
  blackout = false;
  running = false;
  scoreEl.textContent = "0";
  hint.textContent = "Tap / click to start.";
}

function startGame(){
  if(!running && !blackout){
    running = true;
    hint.textContent = "🦖";
  }
}

function crash(msg){
  running = false;
  crashed = true;
  if(msg){
    blackout = true;
    blackoutMsg = msg;
  }
}

function jump(){
  if(blackout || crashed){
    resetGame();
    startGame();
    return;
  }
  if(!running) startGame();
  if(dino.onGround){
    dino.vy = -JUMP_V;
    dino.onGround = false;
  }
}

window.addEventListener("keydown", e=>{
  if(e.code==="Space") jump();
});
window.addEventListener("pointerdown", e=>{
  e.preventDefault();
  jump();
},{passive:false});

function spawnObstacle(){
  obstacles.push({
    kind:"cactus",
    x: canvas.width + 20,
    y: GROUND_Y,
    w: 18,
    h: 34
  });
  nextSpawnIn = (GAP_MIN + Math.random()*(GAP_MAX-GAP_MIN))*(canvas.width/speed);
}

function spawnWall(){
  obstacles.push({
    kind:"wall",
    x: canvas.width + 40,
    y: GROUND_Y,
    w: 100,
    h: 200
  });
}

function overlap(a,b){
  return a.x < b.x+b.w &&
         a.x+a.w > b.x &&
         a.y-a.h < b.y &&
         a.y > b.y-b.h;
}

function drawDino(){
  for(let r=0;r<DINO.length;r++){
    for(let c=0;c<DINO[r].length;c++){
      if(DINO[r][c]==="0") continue;
      ctx.fillStyle = DINO[r][c]==="2" ? "#fff" : "#111";
      ctx.fillRect(
        dino.x + c*SCALE,
        dino.y - SPRITE_H + r*SCALE,
        SCALE,
        SCALE
      );
    }
  }
}

function draw(){
  if(blackout){
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="white";
    ctx.font="16px 'Press Start 2P'";
    ctx.textAlign="center";
    ctx.fillText(blackoutMsg, canvas.width/2, canvas.height/2);
    return;
  }

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle="rgba(0,0,0,0.25)";
  ctx.font="18px 'Press Start 2P'";
  ctx.fillText(marquee, marqueeX, 26);

  ctx.strokeStyle="#aaa";
  ctx.beginPath();
  ctx.moveTo(0,GROUND_Y);
  ctx.lineTo(canvas.width,GROUND_Y);
  ctx.stroke();

  drawDino();

  ctx.fillStyle="#111";
  obstacles.forEach(o=>{
    ctx.fillRect(o.x, o.y-o.h, o.w, o.h);
  });
}

function tick(ts){
  if(!lastTs) lastTs = ts;
  const dt = Math.min(0.033,(ts-lastTs)/1000);
  lastTs = ts;

  if(running){
    speed += SPEED_GAIN*dt;
    distance += speed*dt*0.06;
    scoreEl.textContent = Math.floor(distance);

    while(phraseIndex < thresholds.length && distance >= thresholds[phraseIndex]){
      appendMarquee(phrases[phraseIndex]);
      phraseIndex++;
    }

    if(distance >= endBeat1At && !marquee.includes(endBeat1))
      appendMarquee(endBeat1);

    if(distance >= endBeat2At && !marquee.includes(endBeat2))
      appendMarquee(endBeat2);

    if(distance >= wallAt && !obstacles.some(o=>o.kind==="wall"))
      spawnWall();

    nextSpawnIn -= dt;
    if(nextSpawnIn <= 0) spawnObstacle();

    obstacles.forEach(o=>o.x -= speed*dt);
    marqueeX -= speed*dt*0.2;

    if(!dino.onGround){
      dino.vy += GRAVITY*dt;
      dino.y += dino.vy*dt;
      if(dino.y >= GROUND_Y){
        dino.y = GROUND_Y;
        dino.onGround = true;
      }
    }

    const box = {
      x:dino.x,
      y:dino.y,
      w:SPRITE_W,
      h:SPRITE_H
    };

    for(const o of obstacles){
      if(overlap(box,o)){
        if(o.kind==="wall"){
          crash("Oops. I think I fucked up the specifications there a little.");
        } else crash();
      }
    }
  }

  draw();
  requestAnimationFrame(tick);
}

resetGame();
requestAnimationFrame(tick);

})();
