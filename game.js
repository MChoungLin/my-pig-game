const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PIG_X = 60;

// --- 音效管理器 ---
const sounds = {
    bgm: new Audio('sounds/bgm.mp3'),
    shoot: new Audio('sounds/shoot.mp3'),
    pop: new Audio('sounds/pop.mp3'),
    fall: new Audio('sounds/fall.mp3'),
    score: new Audio('sounds/score.mp3'),
    hurt: new Audio('sounds/hurt.mp3')
};
sounds.bgm.loop = true;
sounds.bgm.volume = 0.3;

// --- 靜音控制 ---
let isMuted = false;

function toggleMute() {
    isMuted = !isMuted; 
    const btn = document.getElementById('mute-btn');
    
    if (isMuted) {
        btn.innerText = '🔇';
        sounds.bgm.pause(); 
    } else {
        btn.innerText = '🔊';
        if (isGameRunning) {
            sounds.bgm.play().catch(e => {});
        }
    }
}

function playSound(name) {
    if (isMuted) return;
    const sound = sounds[name];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => {}); 
    }
}

// 遊戲變數
let score = 0;
let lives = 5;
let isGameRunning = false;
let frameCount = 0;

// --- 類別定義 ---
class Pig {
    constructor() {
        this.width = 40; this.height = 40;
        this.x = PIG_X; this.y = HEIGHT / 2;
        this.speed = 3; 
        this.direction = 1;
    }
    update() {
        this.y += this.speed * this.direction;
        if (this.y <= 0) { this.y = 0; this.direction = 1; }
        if (this.y + this.height >= HEIGHT) { this.y = HEIGHT - this.height; this.direction = -1; }
    }
    draw() {
        ctx.fillStyle = '#FFC0CB'; ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black'; ctx.fillRect(this.x + 25, this.y + 10, 5, 5);
        ctx.fillStyle = '#ff69b4'; ctx.fillRect(this.x + 28, this.y + 20, 12, 10);
    }
}

class Arrow {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 20; this.height = 5;
        this.speed = 8; this.markedForDeletion = false;
    }
    update() {
        this.x += this.speed;
        if (this.x > WIDTH) this.markedForDeletion = true;
    }
    draw() {
        ctx.fillStyle = 'black'; ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.beginPath(); ctx.moveTo(this.x+this.width, this.y-2); ctx.lineTo(this.x+this.width+10, this.y+2.5); ctx.lineTo(this.x+this.width, this.y+7); ctx.fill();
    }
}

class Wolf {
    constructor() {
        this.width = 40; this.height = 50;
        const branchStart = 400;
        this.x = Math.random() * (WIDTH - branchStart - 60) + branchStart;
        this.y = 90;
        this.speedY = Math.random() * 0.8 + 0.3; 
        this.fallSpeed = 8; 
        this.balloonRadius = 28; 
        this.hasBalloon = true;
        this.markedForDeletion = false;
        this.fallSoundPlayed = false;
    }
    update() {
        if (this.hasBalloon) {
            this.y += this.speedY;
        } else {
            this.y += this.fallSpeed;
            if (!this.fallSoundPlayed) {
                playSound('fall');
                this.fallSoundPlayed = true;
            }
        }
        if (this.y + this.height >= HEIGHT) {
            this.y = HEIGHT - this.height;
            if (this.hasBalloon) {
                lives--; playSound('hurt'); updateUI(); this.markedForDeletion = true;
                if (lives <= 0) gameOver();
            } else {
                score += 100; playSound('score'); updateUI(); this.markedForDeletion = true;
            }
        }
    }
    draw() {
        if (this.hasBalloon) {
            ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y - 15, this.balloonRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(this.x + this.width/2 - 8, this.y - 23, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'white'; ctx.beginPath(); ctx.moveTo(this.x + this.width/2, this.y - 15 + this.balloonRadius); ctx.lineTo(this.x + this.width/2, this.y); ctx.stroke();
        }
        ctx.fillStyle = this.hasBalloon ? '#555' : '#333'; ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'yellow';
        let eyeSize = this.hasBalloon ? 8 : 12; 
        ctx.fillRect(this.x + 5, this.y + 10, eyeSize, eyeSize); ctx.fillRect(this.x + 25, this.y + 10, eyeSize, eyeSize);
    }
}

// --- 遊戲控制 ---
let pig = new Pig();
let arrows = [];
let wolves = [];

function playerShoot() {
    if (isGameRunning) {
        arrows.push(new Arrow(pig.x + pig.width, pig.y + pig.height/2));
        playSound('shoot');
        
        const btn = document.getElementById('fire-btn');
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = 'scale(1)', 100);
    }
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.key === 'Enter' || e.keyCode === 13) {
        playerShoot();
        e.preventDefault(); 
    }
});

function checkCollisions() {
    arrows.forEach(arrow => {
        wolves.forEach(wolf => {
            if (wolf.hasBalloon && !arrow.markedForDeletion) {
                const bx = wolf.x + wolf.width/2;
                const by = wolf.y - 15;
                const ax = arrow.x + arrow.width;
                const ay = arrow.y + arrow.height/2;
                if (Math.sqrt((bx-ax)**2 + (by-ay)**2) < wolf.balloonRadius + 10) {
                    wolf.hasBalloon = false; arrow.markedForDeletion = true; playSound('pop');
                }
            }
        });
    });
}

function drawBackground() {
    ctx.fillStyle = '#b0e0e6'; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(PIG_X + 20, 0); ctx.lineTo(PIG_X + 20, HEIGHT); ctx.stroke();
    ctx.fillStyle = '#8B4513'; ctx.fillRect(WIDTH - 100, 0, 100, HEIGHT);
    ctx.fillRect(WIDTH/2, 60, WIDTH/2, 30);
    ctx.fillStyle = '#32CD32'; ctx.beginPath(); ctx.arc(WIDTH - 100, 60, 40, 0, Math.PI*2); ctx.arc(WIDTH/2, 60, 30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, HEIGHT-10, WIDTH, 10);
}

function updateUI() {
    document.getElementById('scoreDisplay').innerText = `分數: ${score}`;
    document.getElementById('livesDisplay').innerText = `血量: ${'❤️'.repeat(Math.max(0, lives))}`;
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('fire-btn').style.display = 'flex';
    
    sounds.bgm.currentTime = 0; 
    if (!isMuted) {
        sounds.bgm.play().catch(e => {});
    }
    
    resetGameLogic(); isGameRunning = true; gameLoop();
}

function gameOver() {
    isGameRunning = false; sounds.bgm.pause();
    document.getElementById('fire-btn').style.display = 'none';
    document.getElementById('final-score').innerText = `最終分數: ${score}`;
    document.getElementById('game-over').style.display = 'block';
}

function resetGame() { startGame(); }
function resetGameLogic() { score = 0; lives = 5; frameCount = 0; pig = new Pig(); arrows = []; wolves = []; updateUI(); }

function gameLoop() {
    if (!isGameRunning) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    pig.update(); pig.draw();
    frameCount++;
    let spawnRate = 120;
    if (score > 500) spawnRate = 100;
    if (frameCount % spawnRate === 0) wolves.push(new Wolf());
    arrows.forEach(arrow => { arrow.update(); arrow.draw(); });
    arrows = arrows.filter(arrow => !arrow.markedForDeletion);
    wolves.forEach(wolf => { wolf.update(); wolf.draw(); });
    wolves = wolves.filter(wolf => !wolf.markedForDeletion);
    checkCollisions();
    requestAnimationFrame(gameLoop);
}

// 初始畫面繪製
drawBackground();
updateUI();