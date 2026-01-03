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
let framesSinceLastPipe = 0;
let score = 0;
let level = 1;
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
    // Handle both click and touchstart
    const selectChar = function (e) {
        e.stopPropagation(); // Prevent game start

        charOptions.forEach(opt => opt.classList.remove('selected'));
        // For the current element (this or e.currentTarget)
        e.currentTarget.classList.add('selected');
        selectedCharKey = e.currentTarget.getAttribute('data-char');
        updateCharDisplay();
    };

    option.addEventListener('click', selectChar);
    option.addEventListener('touchstart', selectChar, { passive: false });
    option.addEventListener('mousedown', (e) => e.stopPropagation()); // Stop mousedown bubbling to container
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
        // e.preventDefault(); 
    }

    if ((e.code === 'Space') || (e.type === 'touchstart') || (e.type === 'mousedown')) {
        startGame();
    }
}

document.addEventListener('keydown', handleInput);
// Bind touch to canvas or container to avoid blocking UI clicks
const gameContainer = document.getElementById('game-container');
gameContainer.addEventListener('touchstart', handleInput, { passive: false });
gameContainer.addEventListener('mousedown', handleInput);

const homeBtn = document.getElementById('home-btn');

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Instant Restart: Just start the game immediately
    startGame();
});

homeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetGame();
    // Go to Start Screen
    startScreen.classList.add('active');
    gameOverScreen.classList.remove('active');
    scoreContainer.style.display = 'none'; // Hide score on home
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
    gravity: 0.15, // Smoother gravity
    jump: 3.5,     // Smoother jump
    scaleX: 1,
    scaleY: 1,

    draw: function () {
        const currentImg = characters[selectedCharKey].imgObj;

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

        // Rotate based on speed
        let rotation = this.speed * 0.1;
        if (rotation > 0.5) rotation = 0.5;
        if (rotation < -0.5) rotation = -0.5;
        ctx.rotate(rotation);

        // Squash and Stretch
        ctx.scale(this.scaleX, this.scaleY);

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

        // Elastic recovery for squash and stretch
        this.scaleX += (1 - this.scaleX) * 0.1;
        this.scaleY += (1 - this.scaleY) * 0.1;

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

        // Squash effect (Exaggerated)
        this.scaleX = 1.3;
        this.scaleY = 0.7;

        const soundMaster = characters[selectedCharKey].soundObj;
        if (soundMaster) {
            const sound = soundMaster.cloneNode();
            sound.play().catch(e => { });
        }
    },

    reset: function () {
        this.y = 150;
        this.speed = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
    }
};

const pipes = {
    position: [],
    w: 53,
    gap: 150,
    dx: 2,

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topPipeHeight = p.y;
            let bottomPipeTop = p.y + this.gap;

            // Pipe Gradient
            // Dynamic color based on score (rotate hue)
            let hueShift = (score * 5) % 360;
            let baseHue = 90 + hueShift;

            let gradient = ctx.createLinearGradient(p.x, 0, p.x + this.w, 0);
            gradient.addColorStop(0, `hsl(${baseHue}, 55%, 35%)`); // Darker edge
            gradient.addColorStop(0.5, `hsl(${baseHue}, 65%, 50%)`); // Lighter center
            gradient.addColorStop(1, `hsl(${baseHue}, 55%, 35%)`); // Darker edge

            ctx.fillStyle = gradient;

            // Top pipe
            ctx.fillRect(p.x, 0, this.w, topPipeHeight);

            // Bottom pipe
            ctx.fillRect(p.x, bottomPipeTop, this.w, canvas.height - bottomPipeTop);

            // Caps (Rim)
            ctx.fillStyle = `hsl(${baseHue}, 65%, 45%)`;
            const capHeight = 20;
            const capOverhang = 2;

            // Top Cap
            ctx.fillRect(p.x - capOverhang, topPipeHeight - capHeight, this.w + (capOverhang * 2), capHeight);
            // Bottom Cap
            ctx.fillRect(p.x - capOverhang, bottomPipeTop, this.w + (capOverhang * 2), capHeight);

            // Borders
            ctx.strokeStyle = `hsl(${baseHue}, 70%, 20%)`;
            ctx.lineWidth = 2;

            ctx.strokeRect(p.x - capOverhang, topPipeHeight - capHeight, this.w + (capOverhang * 2), capHeight);
            ctx.strokeRect(p.x - capOverhang, bottomPipeTop, this.w + (capOverhang * 2), capHeight);
        }
    },

    update: function () {
        // Difficulty Scaling
        let difficultyMultiplier = 1 + (score * 0.02);

        // Cap difficulty
        if (difficultyMultiplier > 2.5) difficultyMultiplier = 2.5;

        this.dx = 2 * difficultyMultiplier;

        // Let's just adjust based on multiplier.
        // Reduced base interval from 150 to 110 for tighter gameplay
        let spawnInterval = Math.floor(110 / difficultyMultiplier);

        framesSinceLastPipe++;
        if (framesSinceLastPipe > spawnInterval) {
            const minPipeLen = 80;
            const maxPipeLen = canvas.height - this.gap - minPipeLen;
            const randomY = Math.floor(Math.random() * (maxPipeLen - minPipeLen + 1)) + minPipeLen;

            this.position.push({
                x: canvas.width,
                y: randomY
            });
            framesSinceLastPipe = 0;
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            if (p.x + this.w <= 0) {
                this.position.shift();
                score++;
                scoreText.innerText = score;
                i--;

                // Level Up Logic
                // Level up every 10 points
                if (score > 0 && score % 10 === 0) {
                    level++;
                    const levelDisplay = document.getElementById('level-display');
                    levelDisplay.innerText = "Level " + level;
                    levelDisplay.classList.add('active');
                    setTimeout(() => {
                        levelDisplay.classList.remove('active');
                    }, 1500);
                }
            }

            // Collision
            let birdBounds = {
                left: bird.x + 5,
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

    // Shake Effect
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.add('shake-effect');
    setTimeout(() => {
        gameContainer.classList.remove('shake-effect');
    }, 500);

    // Update High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('why_am_i_flying_highscore', highScore);

        bestScoreEl.classList.add('highscore-pulse');
        bestScoreEl.innerText = highScore + " (NEW!)";
    } else {
        bestScoreEl.classList.remove('highscore-pulse');
        bestScoreEl.innerText = highScore;
    }

    // Update UI
    finalScoreEl.innerText = score;

    gameOverScreen.classList.add('active');
    scoreContainer.style.display = 'none';
}

function resetGame() {
    bird.reset();
    pipes.reset();
    score = 0;
    level = 1;
    frames = 0;
    framesSinceLastPipe = 0;
    scoreText.innerText = score;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Initial Draw
    updateCharDisplay();
    // Force draw if images already loaded
    if (characters[selectedCharKey].imgObj.complete) {
        bird.draw();
    }
}

// Initial Setup
resetGame();
