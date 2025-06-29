// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let gameActive = false;
let timerInterval;
let timeLeft = 30; // Set initial timer value to 30 seconds
let combo = 0;
let comboActive = false;
let maxCombo = 0;

// --- Difficulty logic additions ---
let difficulty = 'normal';
let dropInterval = 1000; // ms
let badDropChance = 0.25; // default for normal

// --- Game loop background music ---
let gameLoopAudio = null;

// Wait for button click to start the game
document.getElementById("start-btn").addEventListener("click", startGame);

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  // Start/loop background music
  if (!gameLoopAudio) {
    gameLoopAudio = new Audio('sounds/game-loop.mp3');
    gameLoopAudio.loop = true;
    gameLoopAudio.volume = 0.35;
  }
  gameLoopAudio.currentTime = 0;
  gameLoopAudio.play();

  gameRunning = true;
  timeLeft = 30; // Reset timer to 30 seconds when starting the game
  updateTimerDisplay();

  // Start timer countdown
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  // Create new drops at the interval based on difficulty
  dropMaker = setInterval(createDrop, dropInterval);
}

function updateComboDisplay() {
  let comboSpan = document.getElementById('combo');
  let multiplierSpan = document.getElementById('combo-multiplier');
  if (!comboSpan) {
    // Add combo display next to score if not present
    const scorePanel = document.querySelector('.score-panel .score');
    if (scorePanel) {
      comboSpan = document.createElement('span');
      comboSpan.id = 'combo';
      comboSpan.style.marginLeft = '24px';
      comboSpan.style.fontWeight = 'bold';
      comboSpan.style.color = '#2E9DF7';
      scorePanel.appendChild(comboSpan);
    }
  }
  if (!multiplierSpan) {
    const scorePanel = document.querySelector('.score-panel .score');
    if (scorePanel) {
      multiplierSpan = document.createElement('span');
      multiplierSpan.id = 'combo-multiplier';
      multiplierSpan.style.marginLeft = '12px';
      multiplierSpan.style.fontWeight = 'bold';
      multiplierSpan.style.color = '#FFC907';
      scorePanel.appendChild(multiplierSpan);
    }
  }
  if (comboSpan) {
    comboSpan.textContent = `Combo: ${combo}`;
  }
  if (multiplierSpan) {
    multiplierSpan.textContent = combo >= 5 ? '2x' : '';
  }
}

function showScoreAnimation(amount, canRect, isBadDrop = false) {
  // Play sound for collecting a drop
  if (amount > 0) {
    const ding = new Audio('sounds/good-drop.mp3');
    ding.volume = 0.5;
    ding.play();
  } else if (amount < 0 && isBadDrop) {
    const bad = new Audio('sounds/bad-drop.mp3');
    bad.volume = 0.5;
    bad.play();
  }
  const anim = document.createElement('div');
  anim.textContent = amount > 0 ? `+${amount}` : `${amount}`;
  anim.style.position = 'fixed';
  anim.style.left = (canRect.left + canRect.width / 2) + 'px';
  anim.style.top = (canRect.top - 30) + 'px';
  anim.style.transform = 'translate(-50%, 0)';
  anim.style.fontSize = '2em';
  anim.style.fontWeight = 'bold';
  anim.style.color = amount > 0 ? (amount === 2 ? '#FFC907' : '#2E9DF7') : '#F5402C';
  anim.style.opacity = '1';
  anim.style.pointerEvents = 'none';
  anim.style.zIndex = '4000';
  anim.style.transition = 'all 0.7s cubic-bezier(.23,1.02,.64,1)';
  document.body.appendChild(anim);
  setTimeout(() => {
    anim.style.top = (canRect.top - 70) + 'px';
    anim.style.opacity = '0';
  }, 20);
  setTimeout(() => {
    anim.remove();
  }, 800);
}

function createDrop() {
  // Decide if this is a good (blue) or bad (red) drop
  const isBadDrop = Math.random() < badDropChance;
  const drop = document.createElement("div");
  drop.className = isBadDrop ? "water-drop bad-drop" : "water-drop";

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  // Make drops fall for 3-4 seconds
  drop.style.animationDuration = (3 + Math.random()) + "s";

  // Add the new drop to the game screen
  document.getElementById("game-container").appendChild(drop);

  // Collision detection with water can
  function checkCollision() {
    if (!gameActive) return;
    const dropRect = drop.getBoundingClientRect();
    const canRect = waterCan.getBoundingClientRect();
    // Check if drop bottom touches can top and horizontally overlaps
    if (
      dropRect.bottom >= canRect.top &&
      dropRect.top < canRect.bottom &&
      dropRect.right > canRect.left &&
      dropRect.left < canRect.right
    ) {
      const scoreSpan = document.getElementById('score');
      let animAmount = 0;
      if (scoreSpan) {
        let score = parseInt(scoreSpan.textContent, 10) || 0;
        if (isBadDrop) {
          score = Math.max(0, score - 1);
          if (combo > maxCombo) maxCombo = combo;
          combo = 0;
          comboActive = false;
          animAmount = -1;
        } else {
          combo++;
          if (combo > maxCombo) maxCombo = combo;
          if (combo >= 5) {
            comboActive = true;
            score += 2;
            animAmount = 2;
          } else {
            score += 1;
            animAmount = 1;
          }
        }
        scoreSpan.textContent = score.toString();
        updateComboDisplay();
      }
      showScoreAnimation(animAmount, canRect, isBadDrop);
      drop.remove();
      return true;
    }
    return false;
  }

  // Use animation frame for smooth collision detection
  function animate() {
    if (!document.body.contains(drop)) return;
    if (!checkCollision()) {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
}

// Water can follows mouse left/right only
const waterCan = document.getElementById('water-can');
const gameContainer = document.getElementById('game-container');

if (waterCan && gameContainer) {
  document.addEventListener('mousemove', function(e) {
    if (!gameActive) return; // Only move can if game is active
    const containerRect = gameContainer.getBoundingClientRect();
    // Only move if mouse is inside the game container vertically
    if (
      e.clientX >= containerRect.left &&
      e.clientX <= containerRect.right &&
      e.clientY >= containerRect.top &&
      e.clientY <= containerRect.bottom
    ) {
      let newLeft = e.clientX - containerRect.left - waterCan.offsetWidth / 2;
      newLeft = Math.max(0, Math.min(newLeft, containerRect.width - waterCan.offsetWidth));
      waterCan.style.left = newLeft + 'px';
      waterCan.style.bottom = '16px';
      waterCan.style.transform = '';
    }
  });

  // Initial position: center at bottom of game container
  window.addEventListener('load', function() {
    const containerRect = gameContainer.getBoundingClientRect();
    waterCan.style.left = ((containerRect.width - waterCan.offsetWidth) / 2) + 'px';
    waterCan.style.bottom = '16px';
    waterCan.style.transform = '';
  });
}

// Remove old event listener for start-btn if it exists
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.remove(); // Remove from DOM if present
}

// Tutorial popup logic
const tutorialPopup = document.getElementById('tutorial-popup');
const tutorialStartBtn = document.getElementById('tutorial-start-btn');

if (tutorialPopup && tutorialStartBtn) {
  // Hide popup and start game when tutorial start button is clicked
  tutorialStartBtn.addEventListener('click', function() {
    tutorialPopup.style.display = 'none';
    gameActive = true;
    gameRunning = false; // Ensure startGame() can run
    startGame();
  });
}

// Prevent right-click context menu on game container
document.getElementById('game-container').addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

// Update timer display function
function updateTimerDisplay() {
  const timeDisplay = document.getElementById('time');
  if (timeDisplay) {
    timeDisplay.textContent = timeLeft;
  }
}

// Confetti animation function
function createConfetti() {
  const confettiColors = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C', '#159A48', '#F16061'];
  const confettiCount = 80;
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.position = 'fixed';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-20px';
    confetti.style.width = '10px';
    confetti.style.height = '18px';
    confetti.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    confetti.style.opacity = Math.random() * 0.7 + 0.3;
    confetti.style.borderRadius = '3px';
    confetti.style.zIndex = '3000';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.transition = 'top 2.2s cubic-bezier(.23,1.02,.64,1), left 2.2s linear';
    document.body.appendChild(confetti);
    setTimeout(() => {
      confetti.style.top = (80 + Math.random() * 20) + 'vh';
      confetti.style.left = (parseFloat(confetti.style.left) + (Math.random() - 0.5) * 200) + 'px';
    }, 10);
    setTimeout(() => {
      confetti.remove();
    }, 2400);
  }
}

// Add game over popup HTML to the page
function createGameOverPopup(score) {
  createConfetti();
  let popup = document.getElementById('game-over-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'game-over-popup';
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.left = '0';
    popup.style.width = '100vw';
    popup.style.height = '100vh';
    popup.style.background = 'rgba(0,0,0,0.7)';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.justifyContent = 'center';
    popup.style.zIndex = '2000';
    popup.innerHTML = `
      <div style="background:#fff;padding:32px 24px;border-radius:12px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.2);">
        <h2>Game Over</h2>
        <p style="font-size:1.2em;margin:16px 0;">Final Score: <span id="final-score">${score}</span></p>
        <p style="font-size:1.1em;margin:8px 0 20px 0;">Largest Combo: <span id="final-combo">${maxCombo}</span></p>
        <label for="gameover-difficulty-select" style="display:block;margin-bottom:12px;font-size:1.05em;text-align:left;">Difficulty:
          <select id="gameover-difficulty-select" style="margin-left:8px;padding:4px 10px;border-radius:5px;border:1px solid #bbb;font-size:1em;">
            <option value="easy">Easy (no bad drops)</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard (40% bad drops, faster drops)</option>
          </select>
        </label>
        <button id="restart-btn" style="padding:10px 28px;font-size:1.1em;background:#2E9DF7;color:#fff;border:none;border-radius:6px;cursor:pointer;">Restart</button>
      </div>
    `;
    document.body.appendChild(popup);
  } else {
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = maxCombo;
    popup.style.display = 'flex';
  }
  // Set the dropdown to the current difficulty
  const gameoverSelect = document.getElementById('gameover-difficulty-select');
  if (gameoverSelect) {
    gameoverSelect.value = difficulty;
    gameoverSelect.onchange = function() {
      difficulty = this.value;
      if (difficulty === 'easy') {
        badDropChance = 0;
        dropInterval = 1100;
      } else if (difficulty === 'normal') {
        badDropChance = 0.25;
        dropInterval = 1000;
      } else if (difficulty === 'hard') {
        badDropChance = 0.4;
        dropInterval = 700;
      }
    };
  }
  document.getElementById('restart-btn').onclick = function() {
    // Also update the main difficulty dropdown for consistency
    const mainSelect = document.getElementById('difficulty-select');
    if (mainSelect && gameoverSelect) mainSelect.value = gameoverSelect.value;
    popup.style.display = 'none';
    resetGame();
  };
}

function getScore() {
  const scoreSpan = document.getElementById('score');
  return scoreSpan ? parseInt(scoreSpan.textContent, 10) || 0 : 0;
}

function endGame() {
  clearInterval(timerInterval);
  clearInterval(dropMaker);
  gameRunning = false;
  gameActive = false;
  if (gameLoopAudio) gameLoopAudio.pause();
  if (combo > maxCombo) maxCombo = combo;
  updateComboDisplay();
  createGameOverPopup(getScore());
  combo = 0;
  comboActive = false;
}

function resetGame() {
  // Reset score
  const scoreSpan = document.getElementById('score');
  if (scoreSpan) scoreSpan.textContent = '0';
  if (combo > maxCombo) maxCombo = combo;
  combo = 0;
  comboActive = false;
  updateComboDisplay();
  maxCombo = 0;
  // Remove all drops
  const drops = document.querySelectorAll('.water-drop');
  drops.forEach(drop => drop.remove());
  // Reset timer and start game
  startGame();
  gameActive = true;
}

// Ensure combo is shown next to the score as soon as the page loads
window.addEventListener('DOMContentLoaded', function() {
  updateComboDisplay();
});

// Listen for difficulty selection
const difficultySelect = document.getElementById('difficulty-select');
if (difficultySelect) {
  difficultySelect.addEventListener('change', function() {
    difficulty = this.value;
    if (difficulty === 'easy') {
      badDropChance = 0;
      dropInterval = 1100;
    } else if (difficulty === 'normal') {
      badDropChance = 0.25;
      dropInterval = 1000;
    } else if (difficulty === 'hard') {
      badDropChance = 0.4;
      dropInterval = 700;
    }
  });
  // Set initial values based on default selection
  difficulty = difficultySelect.value;
  if (difficulty === 'easy') {
    badDropChance = 0;
    dropInterval = 1100;
  } else if (difficulty === 'normal') {
    badDropChance = 0.25;
    dropInterval = 1000;
  } else if (difficulty === 'hard') {
    badDropChance = 0.4;
    dropInterval = 700;
  }
}
