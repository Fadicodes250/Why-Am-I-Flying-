const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score-text');
const charDisplay = document.getElementById('character-display');
const scoreContainer = document.getElementById('score-container');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');

// Game constants
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
// Handle resizing for mobile
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // call once

// Game State
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('why_am_i_flying_highscore') || 0;
let isGameRunning = false;
let isGameOver = false;
let selectedCharKey = 'nidha';

// Assets Configuration
const characters = {
    nidha: {
        imgSrc: 'nidha.png',
        soundSrc: 'nidha.m4a',
        imgObj: new Image(),
        soundObj: null
    },
    aami: {
        imgSrc: 'aami.png',
        soundSrc: 'aami.m4a',
        imgObj: new Image(),
        soundObj: null
    }
};

// Load Assets
for (let key in characters) {
    characters[key].imgObj.src = characters[key].imgSrc;
    characters[key].soundObj = new Audio(characters[key].soundSrc);
}

// Controls & Selection Logic
const charOptions = document.querySelectorAll('.char-option');

charOptions.forEach(option => {
    option.addEventListener('click', function (e) {
        e.stopPropagation();
        charOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedCharKey = this.getAttribute('data-char');
        updateCharDisplay();
    });
});

// Set default
document.querySelector(`[data-char="${selectedCharKey}"]`).classList.add('selected');

function updateCharDisplay() {
    charDisplay.src = characters[selectedCharKey].imgSrc;
}

function startGame() {
    if (isGameRunning) {
        bird.flap();
    } else {
        // Start from IDLE or Game Over state
        resetGame();
        isGameRunning = true;
        isGameOver = false;

        startScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        scoreContainer.style.display = 'flex';

        updateCharDisplay();
        charDisplay.style.display = 'block';

        bird.flap();
        loop();
    }
}

// Input Handlers
function handleInput(e) {
    // If game over, ignore standard input, wait for button click
    if (isGameOver) return;

    // Prevent default behavior to stop scrolling/zooming on mobile
    if (e.type === 'touchstart' || e.code === 'Space') {
        // e.preventDefault(); // careful blocking scroll everywhere, but inside canvas ok
    }

    if ((e.code === 'Space') || (e.type === 'touchstart')) {
        startGame();
    }
}

document.addEventListener('keydown', handleInput);
// Bind touch to canvas or container to avoid blocking UI clicks
document.getElementById('game-container').addEventListener('touchstart', handleInput, { passive: false });

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent triggering flap immediately
    resetGame();
    startScreen.classList.add('active'); // Go back to start screen or just restart? 
    // Usually restart goes straight to game, but let's go to start screen per request "like intro"
    // Actually, "Press SPACE to Restart" usually means quick restart. 
    // Let's reset to Start Screen so they can pick character again if they want.
    gameOverScreen.classList.remove('active');
    isGameOver = false;
});


// Game Objects
const bird = {
    x: 50,
    y: 150,
    w: 40,
    h: 40,
    radius: 15,
    speed: 0,
    gravity: 0.25,
    jump: 4.6,
    rotation: 0,

    draw: function () {
        const currentImg = characters[selectedCharKey].imgObj;

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        // Rotate based on speed
        // clamping rotation
        let rotation = this.speed * 0.1;
        if (rotation > 0.5) rotation = 0.5;
        if (rotation < -0.5) rotation = -0.5;
        ctx.rotate(rotation);

        if (currentImg.complete) {
            ctx.drawImage(currentImg, -this.w / 2, -this.h / 2, this.w, this.h);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = "#FFD700";
            ctx.fill();
        }
        ctx.restore();
    },

    update: function () {
        this.speed += this.gravity;
        this.y += this.speed;

        if (this.y + this.h > canvas.height) {
            this.y = canvas.height - this.h;
            gameOver();
        }

        if (this.y < 0) {
            this.y = 0;
            this.speed = 0;
        }
    },

    flap: function () {
        this.speed = -this.jump;
        const soundMaster = characters[selectedCharKey].soundObj;
        if (soundMaster) {
            const sound = soundMaster.cloneNode();
            sound.play().catch(e => { }); // ignore autowarn
        }
    },

    reset: function () {
        this.y = 150;
        this.speed = 0;
        this.rotation = 0;
    }
};

const pipes = {
    position: [],
    w: 53,
    gap: 150, // Increased gap
    dx: 2,

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topPipeHeight = p.y;
            let bottomPipeTop = p.y + this.gap;

            // Pipe Gradient
            let gradient = ctx.createLinearGradient(p.x, 0, p.x + this.w, 0);
            gradient.addColorStop(0, '#558c31');
            gradient.addColorStop(0.5, '#73bf2e');
            gradient.addColorStop(1, '#558c31');

            ctx.fillStyle = gradient;

            // Top pipe
            ctx.fillRect(p.x, 0, this.w, topPipeHeight);

            // Bottom pipe
            ctx.fillRect(p.x, bottomPipeTop, this.w, canvas.height - bottomPipeTop);

            // Caps (Rim)
            ctx.fillStyle = '#558c31';
            const capHeight = 20;
            const capOverhang = 2; // makes cap slightly wider

            // Top Cap
            ctx.fillRect(p.x - capOverhang, topPipeHeight - capHeight, this.w + (capOverhang * 2), capHeight);
            // Bottom Cap
            ctx.fillRect(p.x - capOverhang, bottomPipeTop, this.w + (capOverhang * 2), capHeight);

            // Borders
            ctx.strokeStyle = '#2d5c0e';
            ctx.lineWidth = 2;

            // Draw borders if needed (optional for style)
            ctx.strokeRect(p.x - capOverhang, topPipeHeight - capHeight, this.w + (capOverhang * 2), capHeight);
            ctx.strokeRect(p.x - capOverhang, bottomPipeTop, this.w + (capOverhang * 2), capHeight);
        }
    },

    update: function () {
        if (frames % 150 === 0) {
            const minPipeLen = 80; // keep more texture
            const maxPipeLen = canvas.height - this.gap - minPipeLen;
            const randomY = Math.floor(Math.random() * (maxPipeLen - minPipeLen + 1)) + minPipeLen;

            this.position.push({
                x: canvas.width,
                y: randomY
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            if (p.x + this.w <= 0) {
                this.position.shift();
                score++;
                scoreText.innerText = score;
                i--;
            }

            // Collision
            let birdBounds = {
                left: bird.x + 5, // hitbox adjustment
                right: bird.x + bird.w - 5,
                top: bird.y + 5,
                bottom: bird.y + bird.h - 5
            };

            let pipeBounds = {
                left: p.x,
                right: p.x + this.w,
                top: p.y,
                bottom: p.y + this.gap
            };

            if (birdBounds.right > pipeBounds.left && birdBounds.left < pipeBounds.right) {
                if (birdBounds.top < pipeBounds.top || birdBounds.bottom > pipeBounds.bottom) {
                    gameOver();
                }
            }
        }
    },

    reset: function () {
        this.position = [];
    }
};

function loop() {
    if (!isGameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pipes.update();
    pipes.draw();

    bird.update();
    bird.draw();

    frames++;
    requestAnimationFrame(loop);
}

function gameOver() {
    isGameRunning = false;
    isGameOver = true;

    // Update High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('why_am_i_flying_highscore', highScore);
    }

    // Update UI
    finalScoreEl.innerText = score;
    bestScoreEl.innerText = highScore;

    gameOverScreen.classList.add('active');
    scoreContainer.style.display = 'none';
}

function resetGame() {
    bird.reset();
    pipes.reset();
    score = 0;
    frames = 0;
    scoreText.innerText = score;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw initial state (Bird hovering)
    characters['nidha'].imgObj.onload = function () {
        updateCharDisplay();
        bird.draw();
    }
    // Force draw if images already loaded
    if (characters[selectedCharKey].imgObj.complete) {
        bird.draw();
    }
}

// Initial Setup
resetGame();
