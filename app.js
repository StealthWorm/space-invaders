// @ts-check
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }

  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }
}

class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = '';
    this.width = 0;
    this.height = 0;
    this.img = undefined;
  }

  draw(ctx) {
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }

  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }
}

class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    (this.width = 99), (this.height = 75);
    this.type = 'Hero';
    this.speed = { x: 0, y: 0 };
  }
}

class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = 'Laser';
    this.movementInterval = setInterval(() => {
      if (!this.dead) {
        if (!gamePaused) {
          this.y = this.y > 0 ? this.y - 20 : this.y;
          if (this.y <= 0) {
            this.dead = true;
          }
        }
      } else {
        clearInterval(this.movementInterval);
      }
    }, 100);
  }
}

class Explosion extends GameObject {
  constructor(x, y, img) {
    super(x, y);
    this.img = img;
    this.type = 'Explosion';
    (this.width = 56 * 2), (this.height = 54 * 2);
    setTimeout(() => {
      this.dead = true;
    }, 300);
  }
}

class Monster extends GameObject {
  constructor(x, y, index) {
    super(x, y);
    this.type = 'Monster';
    (this.width = 98), (this.height = 50);
    this.index = index;
    this.movingRight = true; // Start moving right
    this.initialX = x; // Store initial x position
    this.speed = 30;

    // Vertical movement
    this.movementIntervalY = setInterval(() => {
      if (!this.dead) {
        if (!gamePaused) {
          this.y = this.y < HEIGHT ? this.y + 30 : this.y;
          if (this.y >= HEIGHT - this.height) {
            this.dead = true;
            eventEmitter.emit('MONSTER_OUT_OF_BOUNDS');
          }
        }
      } else {
        clearInterval(this.movementIntervalY);
      }
    }, 12000);

    // Horizontal movement
    this.movementIntervalX = setInterval(() => {
      if (!this.dead) {
        if (!gamePaused) {
          const maxRight = canvas.width - this.width * this.index;
          const maxLeft = 0 - this.width * this.index + 600; //98*5

          if (this.movingRight) {
            if (this.x + this.width < maxRight) {
              this.x += this.speed;
            } else {
              this.movingRight = false;
            }
          } else {
            if (this.x > maxLeft) {
              this.x -= this.speed;
            } else {
              this.movingRight = true;
            }
          }
        }
      } else {
        clearInterval(this.movementIntervalX);
      }
    }, 600);
  }
}

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

const Messages = {
  MONSTER_OUT_OF_BOUNDS: 'MONSTER_OUT_OF_BOUNDS',
  HERO_SPEED_LEFT: 'HERO_MOVING_LEFT',
  HERO_SPEED_RIGHT: 'HERO_MOVING_RIGHT',
  HERO_SPEED_ZERO: 'HERO_SPEED_ZERO',
  HERO_FIRE: 'HERO_FIRE',
  GAME_END_LOSS: 'GAME_END_LOSS',
  GAME_END_WIN: 'GAME_END_WIN',
  COLLISION_MONSTER_LASER: 'COLLISION_MONSTER_LASER',
  COLLISION_MONSTER_HERO: 'COLLISION_MONSTER_HERO',
  KEY_EVENT_UP: 'KEY_EVENT_UP',
  KEY_EVENT_DOWN: 'KEY_EVENT_DOWN',
  KEY_EVENT_LEFT: 'KEY_EVENT_LEFT',
  KEY_EVENT_RIGHT: 'KEY_EVENT_RIGHT',
  GAME_START: 'GAME_START',
  GAME_PAUSE: 'GAME_PAUSE',
};

class Game {
  constructor() {
    this.points = 0;
    this.life = 3;
    this.end = false;
    this.ready = false;
    this.paused = false;
    this.start = false;

    eventEmitter.on(Messages.MONSTER_OUT_OF_BOUNDS, () => {
      audioManager.pause('theme');
      audioManager.play('gameOver');
      hero.dead = true;
    });
    eventEmitter.on(Messages.HERO_SPEED_LEFT, () => {
      if (!gamePaused) {
        hero.speed.x = -10;
        hero.img = heroImgLeft;
      }
    });
    eventEmitter.on(Messages.HERO_SPEED_RIGHT, () => {
      if (!gamePaused) {
        hero.speed.x = 10;
        hero.img = heroImgRight;
      }
    });
    eventEmitter.on(Messages.HERO_SPEED_ZERO, () => {
      if (!gamePaused) {
        hero.speed = { x: 0, y: 0 };
        if (game.life === 3) {
          hero.img = heroImg;
        } else {
          hero.img = heroImgDamaged;
        }
      }
    });
    eventEmitter.on(Messages.HERO_FIRE, () => {
      if (coolDown === 0 && !gamePaused) {
        if (!game.end) {
          audioManager.play('laser');
        }

        let l = new Laser(hero.x + 45, hero.y - 30);
        l.img = laserRedImg;
        gameObjects.push(l);
        cooling();
      }
    });
    eventEmitter.on(Messages.GAME_END_LOSS, (_, gameLoopId) => {
      game.end = true;
      game.start = false;
      displayMessage(
        'You died... - Press [Enter] to start the game Starship Commander'
      );

      audioManager.stopAll();
      audioManager.play('gameOver');

      clearInterval(gameLoopId);
    });

    eventEmitter.on(Messages.GAME_END_WIN, (_, gameLoopId) => {
      game.end = true;
      game.start = false;
      displayMessage(
        'Victory!!! Pew Pew... - Press [Enter] to start a new game Starship Commander',
        'green'
      );

      clearInterval(gameLoopId);
    });
    eventEmitter.on(
      Messages.COLLISION_MONSTER_LASER,
      (_, { first: laser, second: monster }) => {
        laser.dead = true;
        monster.dead = true;
        this.points += 100;

        gameObjects.push(new Explosion(monster.x, monster.y, laserRedShot));
        audioManager.play('explosion');
      }
    );
    eventEmitter.on(
      Messages.COLLISION_MONSTER_HERO,
      (_, { monster: m, id }) => {
        game.life--;
        if (game.life === 0) {
          hero.dead = true;
          game.start = false;
          eventEmitter.emit(Messages.GAME_END_LOSS, id);
          gameObjects.push(new Explosion(hero.x, hero.y, laserGreenShot));
        }
        hero.img = heroImgDamaged;
        m.dead = true;
        gameObjects.push(new Explosion(m.x, m.y, laserRedShot));
      }
    );
    eventEmitter.on(Messages.KEY_EVENT_UP, () => {
      if (!gamePaused) {
        hero.y = hero.y > 0 ? hero.y - 5 : hero.y;
      }
    });
    eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
      if (!gamePaused) {
        hero.y = hero.y < HEIGHT ? hero.y + 5 : hero.y;
      }
    });
    eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
      if (!gamePaused) {
        hero.x = hero.x > 0 ? hero.x - 10 : hero.x;
      }
    });
    eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
      if (!gamePaused) {
        hero.x = hero.x < WIDTH ? hero.x + 10 : hero.x;
      }
    });
    eventEmitter.on(Messages.GAME_START, async () => {
      audioManager.stopAll();

      if (!game.start) {
        audioManager.stop('titleScreen');
        audioManager.play('start');
      }

      if (game.ready && game.end) {
        // Stop starfield animation
        if (starfieldAnimationId) {
          cancelAnimationFrame(starfieldAnimationId);
          starfieldAnimationId = null;
        }

        // Clear canvas and start game
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        game.start = true;
        setTimeout(() => {
          audioManager.play('theme');
        }, 1500);

        runGame();
      }
    });
    eventEmitter.on(Messages.GAME_PAUSE, () => {
      if (!game.end) {
        gamePaused = !gamePaused;
        if (gamePaused) {
          audioManager.pause('theme');
          displayMessage('PAUSED - Press P to resume', 'yellow');
        } else {
          audioManager.resume('theme');
        }
      }
    });
  }
}

const eventEmitter = new EventEmitter();
const hero = new Hero(0, 0);
const WIDTH = 1024;
const HEIGHT = 768;
let gameObjects = [];
let laserRedImg;
let laserRedShot;
let laserGreenShot;
let canvas;
let ctx;
let heroImg;
let heroImgLeft;
let heroImgRight;
let heroImgDamaged;
let lifeImg;
let monsterImg;
let audio;
let theme;
const stars = [];
const numStars = 500;

let coolDown = 0;
let gamePaused = false;

const game = new Game();

class AudioManager {
  constructor() {
    this.sounds = {
      theme: new Audio('assets/mp3/theme.mp3'),
      laser: new Audio('assets/mp3/laser-shoot.mp3'),
      explosion: new Audio('assets/mp3/explosion.mp3'),
      gameOver: new Audio('assets/mp3/game_over.mp3'),
      stageCleared: new Audio('assets/mp3/clear.mp3'),
      titleScreen: new Audio('assets/mp3/screen.mp3'),
      start: new Audio('assets/mp3/start.mp3'),
    };

    // Set initial volumes
    this.sounds.theme.volume = 0.1;
    this.sounds.titleScreen.volume = 0.4;
    this.sounds.start.volume = 0.3;
    this.sounds.stageCleared.volume = 0.4;
    this.sounds.gameOver.volume = 0.4;
    this.sounds.explosion.volume = 0.2;
    this.sounds.laser.volume = 0.3;

    this.sounds.theme.p;

    // Set theme to loop
    this.sounds.theme.loop = true;
    this.sounds.titleScreen.loop = true;

    // Preload all sounds
    Object.values(this.sounds).forEach((sound) => {
      sound.load();
    });
  }

  async playPromise(soundName) {
    if (this.sounds[soundName]) {
      try {
        this.sounds[soundName].currentTime = 0;
        await this.sounds[soundName].play();
      } catch (error) {
        console.log('Audio play failed:', error);
        // Try to play again after a short delay
        setTimeout(() => {
          this.sounds[soundName]
            .play()
            .catch((e) => console.log('Retry play failed:', e));
        }, 100);
      }
    }
  }

  play(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].currentTime = 0;
      this.sounds[soundName]
        .play()
        .catch((e) => console.log('Audio play failed:', e));
    }
  }

  pause(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].pause();
    }
  }

  stop(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].pause();
      this.sounds[soundName].currentTime = 0;
    }
  }

  resume(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].play();
    }
  }

  stopAll() {
    Object.keys(this.sounds).forEach((soundName) => {
      this.stop(soundName);
    });
  }
}

// Initialize audio manager
const audioManager = new AudioManager();

function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
  });
}

function rectFromGameObject(go) {
  return {
    top: go.y,
    left: go.x,
    bottom: go.y + go.height,
    right: go.x + go.width,
  };
}

function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

function draw(ctx, objects) {
  objects.forEach((obj) => {
    obj.draw(ctx);
  });
}

let onKeyDown = function (e) {
  console.log(e.keyCode);
  switch (e.keyCode) {
    case 37:
    case 39:
    case 38:
    case 40: // Arrow keys
    case 32:
    case 80:
      e.preventDefault();
      break; // Space
    default:
      break; // do not block other keys
  }
};

window.addEventListener('keypress', onKeyDown);
window.addEventListener('keypress', (e) => {
  switch (e.keyCode) {
    case 37:
      // if left
      eventEmitter.emit(Messages.HERO_SPEED_LEFT);
      break;
    case 39:
      eventEmitter.emit(Messages.HERO_SPEED_RIGHT);
      break;
  }
});

// TODO make message driven
window.addEventListener('keydown', (evt) => {
  eventEmitter.emit(Messages.HERO_SPEED_ZERO);
  if (evt.key === 'ArrowUp') {
    eventEmitter.emit(Messages.KEY_EVENT_UP);
  } else if (evt.key === 'ArrowDown') {
    eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  } else if (evt.key === 'ArrowLeft') {
    eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  } else if (evt.key === 'ArrowRight') {
    eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  } else if (evt.keyCode === 32) {
    // space
    eventEmitter.emit(Messages.HERO_FIRE);
  } else if (evt.key === 'Enter') {
    eventEmitter.emit(Messages.GAME_START);
  } else if (evt.key === 'p') {
    eventEmitter.emit(Messages.GAME_PAUSE);
  }
});

function cooling() {
  coolDown = 500;
  let id = setInterval(() => {
    coolDown -= 100;
    if (coolDown === 0) {
      clearInterval(id);
    }
  }, 100);
}

function displayGameScore(message) {
  ctx.font = '30px Arial';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'right';
  ctx.fillText(message, canvas.width - 90, canvas.height - 30);
}

function displayLife() {
  // should show tree ships.. 94 * 3
  const START_X = canvas.width - 150 - 30;
  for (let i = 0; i < game.life; i++) {
    ctx.drawImage(lifeImg, START_X + (i + 1) * 35, canvas.height - 90);
  }
}

function displayMessage(message, color = 'red', opacity = 1) {
  ctx.font = '30px Arial';
  ctx.fillStyle = color;
  ctx.fontWeight = 'bold';
  ctx.textAlign = 'center';
  ctx.globalAlpha = opacity;
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  ctx.globalAlpha = 1;
}

function createMonsters(monsterImg) {
  // 98 * 5     canvas.width - (98*5 /2)
  const MONSTER_TOTAL = 5;
  const MONSTER_WIDTH = MONSTER_TOTAL * 98;
  const START_X = (canvas.width - MONSTER_WIDTH) / 2;
  const STOP_X = START_X + MONSTER_WIDTH;

  let indexForRelativeMovement = 5;

  for (let x = START_X; x < STOP_X; x += 98) {
    for (let y = 0; y < 50 * 5; y += 50) {
      gameObjects.push(new Monster(x, y, indexForRelativeMovement));
    }

    indexForRelativeMovement--;
  }

  gameObjects.forEach((go) => {
    go.img = monsterImg;
  });
}

function createHero(heroImg) {
  hero.dead = false;
  hero.img = heroImg;
  hero.y = (canvas.height / 4) * 3;
  hero.x = canvas.width / 2;
  gameObjects.push(hero);
}

function checkGameState(gameLoopId) {
  const monsters = gameObjects.filter((go) => go.type === 'Monster');
  if (hero.dead) {
    eventEmitter.emit(Messages.GAME_END_LOSS, gameLoopId);
  } else if (monsters.length === 0) {
    // Stop all sounds and play victory music
    audioManager.stopAll();
    audioManager.play('stageCleared');

    // Set game state before emitting win event
    game.end = true;
    game.start = false;
    eventEmitter.emit(Messages.GAME_END_WIN, gameLoopId);
  }

  // update hero position
  if (hero.speed.x !== 0) {
    hero.x += hero.speed.x;
  }

  // Update monster speeds based on remaining count
  const initialMonsters = 25; // 5x5 matrix of monsters
  const baseSpeed = 30; // Initial speed when all monsters are present

  console.log(
    `Monsters remaining: ${monsters.length}, Current speed: ${
      baseSpeed + (initialMonsters - monsters.length)
    }`
  );

  monsters.forEach((m) => {
    m.speed = baseSpeed + (initialMonsters - monsters.length);
  });

  const lasers = gameObjects.filter((go) => go.type === 'Laser');
  // laser hit something
  lasers.forEach((l) => {
    monsters.forEach((m) => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_MONSTER_LASER, {
          first: l,
          second: m,
        });
      }
    });
  });

  // hero hit monster
  monsters.forEach((m) => {
    if (intersectRect(m.rectFromGameObject(), hero.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_MONSTER_HERO, {
        monster: m,
        id: gameLoopId,
      });
    }
  });

  gameObjects = gameObjects.filter((go) => !go.dead);
}

function runGame() {
  gameObjects = [];
  game.life = 3;
  game.points = 0;
  game.end = false;
  gamePaused = false;

  createMonsters(monsterImg);
  createHero(heroImg);
  // addStars(canvas.width, canvas.height, 100);
  // animateStars(canvas.width, 1);

  let gameLoopId = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game objects first
    draw(ctx, gameObjects);

    // Then draw UI elements (score, life, pause message)
    displayGameScore('Score: ' + game.points);
    displayLife();

    if (gamePaused) {
      // Draw a semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      displayMessage('PAUSED - Press P to resume', 'yellow');
    } else {
      checkGameState(gameLoopId);
    }
  }, 100);
}

let starfieldAnimationId = null;

// Separate animation function for starfield
function animateStarfield() {
  if (game.start) {
    if (starfieldAnimationId) {
      cancelAnimationFrame(starfieldAnimationId);
      starfieldAnimationId = null;
    }
    return;
  }

  // Clear the canvas with a semi-transparent black to create fade effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw all stars
  stars.forEach((star) => {
    star.update();
    star.draw();
  });

  // Draw the title message
  displayMessage('Press [Enter] to start the game Starship Commander', 'blue');

  starfieldAnimationId = requestAnimationFrame(animateStarfield);
}

window.onload = async () => {
  canvas = document.getElementById('myCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  if (!ctx) return;

  heroImg = await loadTexture('assets/png/player.png');
  heroImgLeft = await loadTexture('assets/png/playerLeft.png');
  heroImgRight = await loadTexture('assets/png/playerRight.png');
  heroImgDamaged = await loadTexture('assets/png/playerDamaged.png');
  monsterImg = await loadTexture('assets/png/enemyShip.png');
  laserRedImg = await loadTexture('assets/png/laserRed.png');
  laserRedShot = await loadTexture('assets/png/laserRedShot.png');
  laserGreenShot = await loadTexture('assets/png/laserGreenShot.png');
  lifeImg = await loadTexture('assets/png/life.png');

  // Create stars for background
  for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
  }

  game.ready = true;
  game.end = true;

  // Start title screen animation
  animateStarfield();
  canvas.addEventListener('click', () => {
    if (!game.start) {
      audioManager.play('titleScreen');
    }
  });
};
