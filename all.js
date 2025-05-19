const canvas = document.getElementById("game");
const gl = canvas.getContext("webgl");

if (!gl) {
  alert("WebGL not supported!");
}

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

let player = { x: width / 2, y: height - 50, size: 30 };
let rocks = [];
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore") || "0");
let isGameOver = false;
let time = 0;
let keys = {
  left: false,
  right: false,
};
let level = "1";
let levelThreshold = 20;
let rockSpawnRate = 0.05;

document.getElementById("level").innerText = level;
document.getElementById("highScore").innerText = highScore;

// ===== 共用 Shader Program =====
const vertShaderSrc = `
  attribute vec2 position;
  varying vec2 vPos;
  void main() {
    vPos = position;
    gl_Position = vec4(position, 0, 1);
  }
`;

const fragShaderSrc = `
  precision mediump float;
  uniform vec4 color;
  uniform bool useGradient;
  varying vec2 vPos;
  void main() {
    if (useGradient) {
      float factor = (vPos.y + 1.0) / 2.0;
      gl_FragColor = mix(color, vec4(1.0, 1.0, 1.0, color.a), factor);
    } else {
      gl_FragColor = color;
    }
  }
`;

function createShader(type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

const vertShader = createShader(gl.VERTEX_SHADER, vertShaderSrc);
const fragShader = createShader(gl.FRAGMENT_SHADER, fragShaderSrc);

const program = gl.createProgram();
gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);
gl.useProgram(program);

// attribute/uniform locations
const posLoc = gl.getAttribLocation(program, "position");
const colorLoc = gl.getUniformLocation(program, "color");
const gradLoc = gl.getUniformLocation(program, "useGradient");

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// ===== 遊戲邏輯 =====

function spawnRock() {
  rocks.push({
    x: Math.random() * width,
    y: -20,
    size: 20 + Math.random() * 30,
    speed: 2 + Math.random() * 3 + level * 0.2,
    scored: false,
  });
}

function update() {
  const speed = 5;
  if (keys.left) player.x -= speed;
  if (keys.right) player.x += speed;

  // 限制不要超出畫面
  player.x = Math.max(
    player.size / 2,
    Math.min(width - player.size / 2, player.x)
  );

  if (isGameOver) return;
  time += 0.01;

  for (let rock of rocks) {
    rock.y += rock.speed;

    if (!rock.scored && rock.y > player.y + player.size / 2) {
      rock.scored = true;
      score++;
      document.getElementById("score").innerText = score;

      // 升級邏輯
      if (score % levelThreshold === 0) {
        level++;
        localStorage.setItem("level", level);
        document.getElementById("level").innerText = level;

        // 變更難度（增加掉落速度或生成機率）
        // rockSpawnRate = Math.min(0.2, rockSpawnRate + 0.01);
        rockSpawnRate += 0.01;

      }
    }

    if (
      Math.abs(player.x - rock.x) < (player.size + rock.size) / 2 &&
      Math.abs(player.y - rock.y) < (player.size + rock.size) / 2
    ) {
      gameOver();
      return;
    }
  }

  rocks = rocks.filter((r) => r.y < height);
  if (Math.random() < rockSpawnRate) spawnRock();

  draw();
  requestAnimationFrame(update);
  console.log("rockSpawnRate:", rockSpawnRate);
}

function drawRect(x, y, size, color, gradient = false) {
  const half = size / 2;
  const verts = new Float32Array([
    ((x - half) / width) * 2 - 1,
    1 - ((y - half) / height) * 2,
    ((x + half) / width) * 2 - 1,
    1 - ((y - half) / height) * 2,
    ((x - half) / width) * 2 - 1,
    1 - ((y + half) / height) * 2,
    ((x + half) / width) * 2 - 1,
    1 - ((y + half) / height) * 2,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  gl.uniform4fv(colorLoc, color);
  gl.uniform1i(gradLoc, gradient ? 1 : 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function draw() {
  const r = Math.sin(time) * 0.1 + 0.1;
  const g = Math.sin(time * 1.5) * 0.1 + 0.1;
  const b = 0.15;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(r, g, b, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 玩家 - 有透明度與漸層
  drawRect(player.x, player.y, player.size + 15, [0, 1, 0, 0.3], true); // glow
  drawRect(player.x, player.y, player.size, [0, 1, 0, 1], true);

  // 石頭
  for (let rock of rocks) {
    drawRect(rock.x, rock.y, rock.size, [1, 0, 0, 1], true);
  }
}

function gameOver() {
  isGameOver = true;
  document.getElementById("gameOver").style.display = "block";
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    document.getElementById("highScore").innerText = highScore;
  }
}

function restartGame() {
  score = 0;
  level = 1;
  rocks = [];
  isGameOver = false;
  rockSpawnRate = 0.05;
  document.getElementById("score").innerText = "0";
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("level").innerText = "1";
  update();
}

window.addEventListener("mousemove", (e) => {
  player.x = e.clientX;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

let touchX = null;
window.addEventListener("touchstart", (e) => {
  touchX = e.touches[0].clientX;
});

window.addEventListener("touchmove", (e) => {
  const currentX = e.touches[0].clientX;
  const dx = currentX - touchX;

  player.x += dx;
  player.x = Math.max(player.size / 2, Math.min(width - player.size / 2, player.x));

  touchX = currentX;
});

update();
