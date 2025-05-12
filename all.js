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

document.getElementById("high-score").innerText = highScore;

function spawnRock() {
  rocks.push({
    x: Math.random() * width,
    y: -20,
    size: 20 + Math.random() * 30,
    speed: 2 + Math.random() * 3,
    scored: false,
  });
}

function update() {
  if (isGameOver) return;

  for (let rock of rocks) {
    rock.y += rock.speed;

    // 加分：石頭越過玩家且尚未計分
    if (!rock.scored && rock.y > player.y + player.size / 2) {
      rock.scored = true;
      score++;
      document.getElementById("score").innerText = score;
    }

    if (
      Math.abs(player.x - rock.x) < (player.size + rock.size) / 2 &&
      Math.abs(player.y - rock.y) < (player.size + rock.size) / 2
    ) {
      gameOver();
      return;
    }
  }

  rocks = rocks.filter(r => r.y < height);
  if (Math.random() < 0.05) spawnRock();

  draw();
  requestAnimationFrame(update);
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  drawRect(player.x, player.y, player.size, [0, 1, 0, 1]);
  for (let rock of rocks) {
    drawRect(rock.x, rock.y, rock.size, [1, 0, 0, 1]);
  }
}

function drawRect(x, y, size, color) {
  const half = size / 2;
  const verts = new Float32Array([
    (x - half) / width * 2 - 1, 1 - (y - half) / height * 2,
    (x + half) / width * 2 - 1, 1 - (y - half) / height * 2,
    (x - half) / width * 2 - 1, 1 - (y + half) / height * 2,
    (x + half) / width * 2 - 1, 1 - (y + half) / height * 2,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0, 1);
    }
  `);
  gl.compileShader(vertShader);

  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, `
    precision mediump float;
    uniform vec4 color;
    void main() {
      gl_FragColor = color;
    }
  `);
  gl.compileShader(fragShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  const loc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const colorLoc = gl.getUniformLocation(program, "color");
  gl.uniform4fv(colorLoc, color);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function gameOver() {
  isGameOver = true;
  document.getElementById("game-over").style.display = "block";
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    document.getElementById("high-score").innerText = highScore;
  }
}

function restartGame() {
  score = 0;
  rocks = [];
  isGameOver = false;
  document.getElementById("score").innerText = "0";
  document.getElementById("game-over").style.display = "none";
  update();
}

window.addEventListener("mousemove", (e) => {
  player.x = e.clientX;
});

update();