// Get the canvas and its context
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// Set canvas background to black
canvas.style.backgroundColor = 'black';

// Star class to manage individual stars
class Star {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width - canvas.width / 2;
    this.y = Math.random() * canvas.height - canvas.height / 2;
    this.z = Math.random() * 1000;
    this.pz = this.z;
  }

  update() {
    this.pz = this.z;
    this.z -= 1; // Speed of stars moving towards viewer

    if (this.z <= 0) {
      this.reset();
    }
  }

  draw() {
    const size = 2;
    const sx = (this.x / this.z) * canvas.width + canvas.width / 2;
    const sy = (this.y / this.z) * canvas.height + canvas.height / 2;
    const px = (this.x / this.pz) * canvas.width + canvas.width / 2;
    const py = (this.y / this.pz) * canvas.height + canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size;
    ctx.stroke();
  }
}

// Create stars
const stars = [];
const numStars = 500;

for (let i = 0; i < numStars; i++) {
  stars.push(new Star());
}

let animationId = null;

// Function to start the starfield animation
function startStarfield() {
  if (animationId) return; // Don't start if already running

  // Start the title screen audio
  audioManager.playPromise('titleScreen');

  function animate() {
    // Clear the canvas with a semi-transparent black to create fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all stars
    stars.forEach((star) => {
      star.update();
      star.draw();
    });

    // Draw the title message on top of the stars
    displayMessage(
      'Press [Enter] to start the game Starship Commander',
      'blue'
    );

    animationId = requestAnimationFrame(animate);
  }

  animate();
}

// Function to stop the starfield animation
function stopStarfield() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  // Stop the title screen audio
  audioManager.stop('titleScreen');
}

// Listen for game state changes
eventEmitter.on(Messages.GAME_START, () => {
  stopStarfield();
});

eventEmitter.on(Messages.GAME_PAUSE, () => {
  if (game.paused) {
    stopStarfield();
  } else {
    startStarfield();
  }
});

// Start the starfield animation when the page loads
startStarfield();
