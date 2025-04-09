class BladeWarrior {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Canvas 2D context not available!');
            return;
        }
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        console.log(`Canvas initialized: ${this.width}x${this.height}`);
        
        // Game state
        this.gameActive = false;
        this.score = 0;
        this.wave = 1;
        this.lives = 3;
        this.gameData = {
            events: []
        };
        
        // Player properties
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            radius: 20,
            color: '#ff00ff',
            speed: 5,
            size: 20,
            bladeLength: 40,
            bladeWidth: 6,
            bladeRotation: 0,
            bladeRotationSpeed: 0.1,
            invulnerable: false,
            invulnerableTime: 0
        };
        
        // Preload Succinct character if available
        this.playerImage = new Image();
        this.playerImage.src = 'assets/succinct-character.png'; // Succinct character image
        
        // Preload blue hat if available
        this.hatImage = new Image();
        this.hatImage.src = 'assets/succinct-hat.png'; // Blue hat image
        
        // Enemies
        this.enemies = [];
        this.enemySpawnRate = 60; // Frames between enemy spawns
        this.enemySpawnCounter = 0;
        this.baseEnemySpeed = 2.0;
        this.enemySpeedMultiplier = 1.0;
        
        // Particles
        this.particles = [];
        
        // Input handling - update to prevent scrolling
        this.keys = {};
        
        // UI elements - with better error handling
        this.initializeUIElements();
        
        // Load high score
        this.highScore = localStorage.getItem('bladeWarriorHighScore') || 0;
        if (this.highScoreElement) {
            this.highScoreElement.textContent = this.highScore;
        }
        
        // Set up event listeners for keyboard
        window.addEventListener('keydown', (e) => {
            // Prevent default for arrow keys and space to avoid page scrolling
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key] = true;
            
            // Shoot on space
            if (e.key === ' ' || e.key === 'Space') {
                this.shoot();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Add click event listener to canvas
        this.canvas.addEventListener('click', () => {
            if (!this.gameActive) {
                this.startGame();
            }
        });
        
        // Tambahkan properti mousePosition
        this.mousePosition = {
            x: this.width / 2,
            y: this.height / 2
        };
        
        // Add mouse event listeners
        this.canvas.addEventListener('mousemove', (e) => {
            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });
        
        // Start game loop
        this.gameLoop();
        
        console.log('Game initialized!');
        
        // Initialize global game state
        window.gameState = window.gameState || {
            finalScore: 0,
            finalWave: 1,
            playerName: '',
            gameActive: false,
            
            // Method to update state
            updateState: function(properties) {
                for (const key in properties) {
                    if (this.hasOwnProperty(key)) {
                        this[key] = properties[key];
                    }
                }
            },
            
            generateGameHash: function(playerName, score) {
                // Implementation from gameState.js
                const timestamp = Math.floor(Date.now() / 1000);
                const input = `${playerName}-${score}-${timestamp}`;
                let hash = '';
                
                for (let i = 0; i < 64; i++) {
                    const charIndex = (input.charCodeAt(i % input.length) + i) % 16;
                    hash += '0123456789abcdef'[charIndex];
                }
                
                return hash;
            }
        };
        
        // IMPORTANT: Set constant for base speed
        this.DEFAULT_ENEMY_SPEED = 2.0;
        this.DEFAULT_ENEMY_SPAWN_RATE = 60;
        
        // Initialize speed variables
        this.baseEnemySpeed = this.DEFAULT_ENEMY_SPEED;
        this.enemySpeedMultiplier = 1.0;
        this.enemySpawnRate = this.DEFAULT_ENEMY_SPAWN_RATE;
    }
    
    // New method to initialize UI elements with error handling
    initializeUIElements() {
        // Get all required UI elements
        const uiElements = {
            startButton: document.getElementById('start-button'),
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            finalScoreElement: document.getElementById('final-score'),
            finalWaveElement: document.getElementById('final-wave'),
            restartButton: document.getElementById('restart-button'),
            submitScoreButton: document.getElementById('submit-score-button'),
            highScoreElement: document.getElementById('high-score'),
            waveNotification: document.getElementById('wave-notification')
        };
        
        // Log found/missing UI elements
        console.log('UI elements:', uiElements);
        
        // Check for missing elements
        const missingElements = Object.entries(uiElements)
            .filter(([_, element]) => !element)
            .map(([name]) => name);
        
        if (missingElements.length > 0) {
            console.warn('Some UI elements not found!', missingElements);
        }
        
        // Save reference to UI elements
        this.startButton = uiElements.startButton;
        this.startScreen = uiElements.startScreen;
        this.gameOverScreen = uiElements.gameOverScreen;
        this.finalScoreElement = uiElements.finalScoreElement;
        this.finalWaveElement = uiElements.finalWaveElement;
        this.restartButton = uiElements.restartButton;
        this.submitScoreButton = uiElements.submitScoreButton;
        this.highScoreElement = uiElements.highScoreElement;
        this.waveNotification = uiElements.waveNotification;
        
        // Setup event listeners for UI
        this.setupUIEventListeners();
    }
    
    // New method to setup event listeners with error handling
    setupUIEventListeners() {
        // Start button
        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Restart button in game over screen
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Submit score button in game over screen
        if (this.submitScoreButton) {
            this.submitScoreButton.addEventListener('click', () => {
                this.verifyScore();
            });
        }
        
        // Restart button in modal
        const modalRestartButton = document.querySelector('#game-over #restart-button');
        if (modalRestartButton) {
            modalRestartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Submit score button in modal
        const modalSubmitButton = document.querySelector('#game-over #submit-score-button');
        if (modalSubmitButton) {
            modalSubmitButton.addEventListener('click', () => {
                this.verifyScore();
            });
        }
        
        // Close log button
        const closeLogButton = document.getElementById('close-log');
        if (closeLogButton) {
            closeLogButton.addEventListener('click', () => {
                const proofLog = document.getElementById('proof-log');
                if (proofLog) {
                    proofLog.style.display = 'none';
                }
            });
        }
        
        // Arcade buttons
        const shareButton = document.querySelector('.button-share');
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                this.shareScore();
            });
        }
        
        const resetButton = document.querySelector('.button-reset');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetGame();
            });
        }
        
        const proveButton = document.querySelector('.button-prove');
        if (proveButton) {
            proveButton.addEventListener('click', () => {
                this.verifyScore();
            });
        }
        
        const infoButton = document.querySelector('.button-info');
        if (infoButton) {
            infoButton.addEventListener('click', () => {
                alert('BLADE WARRIOR\nA SP1 VERIFIED GAME\n\nCONTROLS:\nARROW KEYS - MOVE\nSPACE - SHOOT');
            });
        }
        
        const statsButton = document.querySelector('.button-stats');
        if (statsButton) {
            statsButton.addEventListener('click', () => {
                const gamesPlayed = localStorage.getItem('bladeWarriorGamesPlayed') || '0';
                alert(`GAMES PLAYED: ${gamesPlayed}\nHIGH SCORE: ${this.highScore}`);
            });
        }

        // Bind verify score button with avoiding restart game
        const verifyButton = document.getElementById('verify-button');
        if (verifyButton) {
            // Remove existing event listener
            const newVerifyButton = verifyButton.cloneNode(true);
            verifyButton.parentNode.replaceChild(newVerifyButton, verifyButton);
            
            // Add new event listener with explicit preventDefault
            newVerifyButton.addEventListener('click', (e) => {
                console.log('Verify button clicked, preventing default action');
                e.preventDefault();
                e.stopPropagation();
                
                // Call verify score function
                this.verifyScore();
                
                // To ensure, add return false
                return false;
            });
        }
    }
    
    startGame() {
        if (this.gameActive) return;
        
        console.log('Starting game...');
        
        // Reset game state
        this.score = 0;
        this.wave = 1;
        this.lives = 3;
        this.gameActive = true;
        
        // Reset player position
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            radius: 20,
            color: '#ff00ff',
            speed: 5,
            size: 20,
            bladeLength: 40,
            bladeWidth: 6,
            bladeRotation: 0,
            bladeRotationSpeed: 0.1,
            invulnerable: false,
            invulnerableTime: 0
        };
        
        // Reset input
        this.keys = {};
        
        // Hide any game over screen
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'none';
        }
        
        // Hide game over modal if exists
        const gameOverModal = document.getElementById('game-over');
        if (gameOverModal) {
            gameOverModal.style.display = 'none';
        }
        
        // Hide start screen
        if (this.startScreen) {
            this.startScreen.style.display = 'none';
        }
        
        // Initialize enemies
        this.enemies = [];
        this.spawnEnemies();
        
        // Initialize particles
        this.particles = [];
        
        // Update UI
        this.updateUI();
        
        // Increment games played counter
        const gamesPlayed = parseInt(localStorage.getItem('bladeWarriorGamesPlayed') || '0');
        localStorage.setItem('bladeWarriorGamesPlayed', gamesPlayed + 1);
        
        console.log('Game started!');
    }
    
    gameLoop() {
        // Update game state
        if (this.gameActive) {
            this.update();
        }
        
        // Render game
        this.render();
        
        // Request next frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        if (this.gameOver) {
            return;
        }
        
        // Update player position based on keyboard input
        if (this.keys.ArrowUp || this.keys.w || this.keys.W) {
            this.player.y -= this.player.speed;
        }
        if (this.keys.ArrowDown || this.keys.s || this.keys.S) {
            this.player.y += this.player.speed;
        }
        if (this.keys.ArrowLeft || this.keys.a || this.keys.A) {
            this.player.x -= this.player.speed;
        }
        if (this.keys.ArrowRight || this.keys.d || this.keys.D) {
            this.player.x += this.player.speed;
        }
        
        // Keep player within bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));
        
        // Replace automatic blade rotation with calculation based on mouse position
        const angle = Math.atan2(
            this.mousePosition.y - this.player.y,
            this.mousePosition.x - this.player.x
        );
        this.player.bladeRotation = angle;
        
        // Blink effect when invulnerable
        if (this.player.invulnerable) {
            this.player.invulnerableTime--;
            if (this.player.invulnerableTime <= 0) {
                this.player.invulnerable = false;
            }
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Calculate direction towards player (vector from enemy to player)
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            
            // Normalize vector (change to unit vector)
            const distance = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / distance;
            const ndy = dy / distance;
            
            // Update enemy position based on direction towards player
            const baseSpeed = enemy.speed || (enemy.velocity ? Math.abs(enemy.velocity.y) : this.baseEnemySpeed);
            
            // Update enemy position to chase player
            enemy.x += ndx * baseSpeed;
            enemy.y += ndy * baseSpeed;
            
            // Update velocity object for compatibility
            if (enemy.velocity) {
                enemy.velocity.x = ndx * baseSpeed;
                enemy.velocity.y = ndy * baseSpeed;
            }
            
            // Enemy out of screen?
            if (enemy.x < -50 || enemy.x > this.width + 50 || 
                enemy.y < -50 || enemy.y > this.height + 50) {
                this.enemies.splice(i, 1);
                i--;
                continue;
            }
            
            // Check for blade collision first
            if (this.checkBladeCollision(enemy)) {
                // Player hit enemy with blade - add score!
                this.score += 10;
                
                // Create particles for collision
                this.createParticles(enemy.x, enemy.y, 20, enemy.color, 3, 2);
                
                // Remove enemy
                this.enemies.splice(i, 1);
                
                // Update UI
                this.updateUI();
                
                // Add game event
                this.addGameEvent('enemy_killed', { position: { x: enemy.x, y: enemy.y }, score: this.score });
                
                // Skip the player collision check for this enemy since it's already removed
                continue;
            }
            
            // Check for collision with player
            const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            if (dist - enemy.size - this.player.radius < 1) {
                // Only reduce lives if player is not invulnerable
                if (!this.player.invulnerable) {
                    this.lives--;
                    this.player.invulnerable = true;
                    this.player.invulnerableTime = 60; // Invulnerable for 60 frames
                    
                    // Add game event
                    this.addGameEvent('player_hit', { lives: this.lives });
                    
                    // Shake the screen
                    this.shakeCanvas(10, 300);
                }
                
                // Create particles for collision
                this.createParticles(enemy.x, enemy.y, 20, enemy.color, 3, 2);
                
                // Remove enemy
                this.enemies.splice(i, 1);
                
                // Update UI
                this.updateUI();
                
                if (this.lives <= 0) {
                    this.handleGameOver();
                }
            }
        }
        
        // Update particles
        this.updateParticles();
        
        // Spawn new enemies if needed
        if (this.enemies.length === 0) {
            this.wave++;
            this.updateUI();
            this.spawnEnemies();
        }
    }
    
    spawnEnemies() {
        if (!this.gameActive) return;
        
        console.log(`Spawning enemies for wave ${this.wave}`);
        
        // Calculate number of enemies based on wave
        const numEnemies = Math.min(3 + this.wave, 15);
        
        // Calculate speed for this wave
        this.enemySpeedMultiplier = Math.min(1.0 + (this.wave * 0.1), 2.5);
        
        console.log(`Wave ${this.wave}: Speed multiplier = ${this.enemySpeedMultiplier.toFixed(2)}`);
        
        // Spawn enemies with random position outside screen
        for (let i = 0; i < numEnemies; i++) {
            // Determine random spawn position (outside screen)
            let x, y;
            const side = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left
            
            switch (side) {
                case 0: // Top
                    x = Math.random() * this.width;
                    y = -50;
                    break;
                case 1: // Right
                    x = this.width + 50;
                    y = Math.random() * this.height;
                    break;
                case 2: // Bottom
                    x = Math.random() * this.width;
                    y = this.height + 50;
                    break;
                case 3: // Left
                    x = -50;
                    y = Math.random() * this.height;
                    break;
            }
            
            // Consistent base speed
            const speed = (this.baseEnemySpeed + Math.random() * 0.5) * this.enemySpeedMultiplier;
            
            // Create enemy object with full format
            this.enemies.push({
                x: x,
                y: y,
                radius: 20,
                size: 20, // For compatibility
                color: this.getRandomEnemyColor(),
                speed: speed,
                velocity: {
                    x: 0, // Placeholder, will be updated in update()
                    y: 0  // Placeholder, will be updated in update()
                }
            });
        }
    }
    
    getRandomEnemyColor() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    nextWave() {
        this.wave++;
        this._speedLogged = false; // Reset speed logging flag
        
        // Update UI
        document.getElementById('wave-display').textContent = this.wave;
        
        // Show wave notification
        const waveNotification = document.getElementById('wave-notification');
        const waveNumber = document.getElementById('wave-number');
        
        if (waveNotification && waveNumber) {
            waveNumber.textContent = this.wave;
            waveNotification.style.display = 'block';
            
            // Hide notification after a few seconds
            setTimeout(() => {
                waveNotification.style.display = 'none';
            }, 2000);
        }
        
        // Spawn enemies for new wave
        this.spawnEnemies();
        
        // Debug log
        console.log(`Wave ${this.wave} started, enemy multiplier: ${this.enemySpeedMultiplier.toFixed(2)}`);
    }
    
    handleGameOver() {
        console.log('Game over!');
        this.gameActive = false;
        
        // Save final score to instance variable
        this.finalScore = this.score;
        this.finalWave = this.wave;
        
        // Update global game state
        window.gameState.updateState({
            finalScore: this.finalScore,
            finalWave: this.finalWave,
            gameActive: false
        });
        
        console.log(`Final score: ${this.finalScore}, Final wave: ${this.finalWave}`);
        
        // Update UI
        document.querySelectorAll('#final-score').forEach(el => {
            el.textContent = this.finalScore;
        });
        
        document.querySelectorAll('#final-wave').forEach(el => {
            el.textContent = this.finalWave;
        });
        
        // Show game over screen
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'block';
        }
        
        // Play game over sound effect
        if (this.gameOverSound) {
            this.gameOverSound.play();
        }
        
        // Show game over modal
        const gameOverModal = document.getElementById('game-over');
        if (gameOverModal) {
            gameOverModal.style.display = 'flex';
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#110011';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid
        this.drawGrid();
        
        if (this.gameActive) {
            // Draw line from player to mouse (optional aim indicator)
            if (this.mousePosition) {
                this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.4)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.x, this.player.y);
                this.ctx.lineTo(this.mousePosition.x, this.mousePosition.y);
                this.ctx.stroke();
            }
            
            // Draw player with glow effect
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw blade
            this.drawBlade();
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
            
            // Draw enemies with glow effect
            this.enemies.forEach(enemy => {
                this.ctx.shadowColor = enemy.color;
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = enemy.color;
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            });
            
            // Draw particles dengan efek glow dan transparansi
            this.particles.forEach(particle => {
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 5;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                this.ctx.shadowBlur = 0;
            });
        } else {
            // Show start instruction if game is not active
            const gameOverScreen = document.getElementById('game-over');
            if (gameOverScreen && gameOverScreen.style.display === 'none') {
                // Tampilkan instruksi start melalui HTML, bukan di canvas
                const gameTitle = document.querySelector('.game-title');
                if (gameTitle) {
                    gameTitle.style.display = 'block';
                }
            } else {
                // Sembunyikan instruksi start jika game over screen ditampilkan
                const gameTitle = document.querySelector('.game-title');
                if (gameTitle) {
                    gameTitle.style.display = 'none';
                }
            }
        }
    }
    
    // Method to draw blade
    drawBlade() {
        // Save context state
        this.ctx.save();
        
        // Translate to player position
        this.ctx.translate(this.player.x, this.player.y);
        
        // Rotate blade
        this.ctx.rotate(this.player.bladeRotation);
        
        // Blade glow effect
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 15;
        
        // Draw blade (rectangle shape)
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(0, -this.player.bladeWidth / 2, this.player.bladeLength, this.player.bladeWidth);
        
        // Add blade details (handle)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(-10, -this.player.bladeWidth - 2, 10, this.player.bladeWidth * 2 + 4);
        
        // Restore context state
        this.ctx.restore();
    }
    
    showProofGenerationWindow() {
        console.log('Showing proof generation window...');
        
        const proofWindow = document.getElementById('proof-generation-window');
        const modalOverlay = document.getElementById('modal-overlay');
        const terminalContent = document.getElementById('terminal-content');
        const progressBar = document.getElementById('proof-progress-bar');
        const progressPercentage = document.getElementById('progress-percentage');
        
        if (!proofWindow) {
            console.error('Proof generation window element not found!');
            return;
        }
        
        if (!modalOverlay) {
            console.error('Modal overlay element not found!');
        } else {
            modalOverlay.style.display = 'block';
        }
        
        // Show the window
        proofWindow.style.display = 'block';
        
        // Clear terminal content
        if (terminalContent) {
            terminalContent.innerHTML = '';
        } else {
            console.error('Terminal content element not found!');
        }
        
        // Reset progress bar
        if (progressBar) {
            progressBar.style.width = '0%';
        } else {
            console.error('Progress bar element not found!');
        }
        
        // Reset progress percentage
        if (progressPercentage) {
            progressPercentage.textContent = '0%';
        } else {
            console.error('Progress percentage element not found!');
        }
        
        // Add event listeners for window controls
        const minimizeButton = document.getElementById('minimize-window');
        const closeButton = document.getElementById('close-window');
        
        if (minimizeButton) {
            minimizeButton.addEventListener('click', () => {
                proofWindow.style.display = 'none';
            });
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideProofGenerationWindow();
            });
        }
        
        console.log('Proof generation window shown');
    }
    
    hideProofGenerationWindow() {
        console.log('Hiding proof generation window...');
        
        const proofWindow = document.getElementById('proof-generation-window');
        const modalOverlay = document.getElementById('modal-overlay');
        
        if (!proofWindow) {
            console.error('Proof generation window element not found!');
        } else {
            proofWindow.style.display = 'none';
        }
        
        if (!modalOverlay) {
            console.error('Modal overlay element not found!');
        } else {
            modalOverlay.style.display = 'none';
        }
        
        console.log('Proof generation window hidden');
    }
    
    addToTerminal(message, delay = 50) {
        return new Promise(resolve => {
            const terminalContent = document.getElementById('terminal-content');
            const logEntry = document.createElement('div');
            logEntry.classList.add('terminal-line');
            
            // Add cursor
            const cursor = document.createElement('span');
            cursor.classList.add('cursor');
            terminalContent.appendChild(cursor);
            
            // Typing effect
            let i = 0;
            const typeWriter = () => {
                if (i < message.length) {
                    logEntry.innerHTML = message.substring(0, i+1);
                    terminalContent.insertBefore(logEntry, cursor);
                    terminalContent.scrollTop = terminalContent.scrollHeight;
                    i++;
                    setTimeout(typeWriter, delay);
                } else {
                    // Remove cursor from this line and move to new line
                    terminalContent.removeChild(cursor);
                    terminalContent.appendChild(cursor);
                    terminalContent.scrollTop = terminalContent.scrollHeight;
                    resolve();
                }
            };
            
            typeWriter();
        });
    }
    
    updateProgressBar(percentage) {
        document.getElementById('proof-progress-bar').style.width = `${percentage}%`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
    }
    
    verifyScore() {
        console.log('Game.verifyScore called - redirecting to global verifyGameScore');
        
        // Call global verification function
        if (typeof window.verifyGameScore === 'function') {
            window.verifyGameScore();
        } else {
            console.error('Error: window.verifyGameScore not found!');
            alert('Verification cannot be performed. Please reload the page.');
        }
    }
    
    showStartScreen() {
        // Ensure UI elements exist
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.waveNotification = document.getElementById('wave-notification');
        
        if (!this.startScreen || !this.gameOverScreen || !this.waveNotification) {
            console.error('UI elements not found!');
            return;
        }
        
        // Display start screen
        this.startScreen.style.display = 'flex';
        this.gameOverScreen.style.display = 'none';
        
        // Reset game state
        this.gameActive = false;
        
        // Remove game-active class from body
        document.body.classList.remove('game-active');
        
        // Update high score if exists
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            const highScore = localStorage.getItem('bladeWarriorHighScore') || 0;
            highScoreElement.textContent = highScore;
        }
        
        console.log('Start screen shown');
    }
    
    showWaveNotification() {
        if (!this.waveNotification) {
            this.waveNotification = document.getElementById('wave-notification');
            if (!this.waveNotification) {
                console.error('Wave notification element not found!');
                return;
            }
        }
        
        // Display wave notification
        this.waveNotification.textContent = `WAVE ${this.wave}`;
        this.waveNotification.style.display = 'block';
        this.waveNotification.style.opacity = 1;
        
        // Fade out animation
        setTimeout(() => {
            let opacity = 1;
            const fadeInterval = setInterval(() => {
                opacity -= 0.05;
                this.waveNotification.style.opacity = opacity;
                
                if (opacity <= 0) {
                    clearInterval(fadeInterval);
                    this.waveNotification.style.display = 'none';
                }
            }, 50);
        }, 2000);
        
        // Add new wave log
        this.addGameEvent('newWave', { wave: this.wave });
        
        console.log(`Wave ${this.wave} started`);
    }
    
    restartGame() {
        // Hide game over screen if exists
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'none';
        }
        
        // Hide game over modal as fallback
        const gameOverModal = document.getElementById('game-over');
        if (gameOverModal) {
            gameOverModal.style.display = 'none';
        }
        
        // Start new game
        this.startGame();
    }
    
    addGameEvent(eventType, eventData) {
        if (!this.gameData) {
            this.gameData = { events: [] };
        }
        
        if (!this.gameData.events) {
            this.gameData.events = [];
        }
        
        // Add timestamp to event
        const event = {
            type: eventType,
            timestamp: Date.now(),
            ...eventData
        };
        
        // Add event to gameData
        this.gameData.events.push(event);
        
        console.log('Game event added:', event);
    }
    
    // Add method to check HTML elements
    checkElements() {
        // List of required elements
        const requiredElements = [
            'gameCanvas',
            'start-screen',
            'game-over-screen',
            'wave-notification',
            'final-score',
            'player-name',
            'submit-score-button',
            'restart-button',
            'start-button'
        ];
        
        // Check each element
        let missingElements = [];
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                missingElements.push(elementId);
            }
        }
        
        // Show error message if any elements are missing
        if (missingElements.length > 0) {
            console.error('Missing HTML elements:', missingElements);
            alert('Some HTML elements are missing. Game might not function correctly.');
        }
        
        return missingElements.length === 0;
    }
    
    // Add debugging method
    debug() {
        console.log('=== BLADE WARRIOR DEBUG INFO ===');
        console.log('Canvas:', this.canvas ? 'Found' : 'Not found');
        console.log('Context:', this.ctx ? 'Available' : 'Not available');
        console.log('Canvas dimensions:', this.width, 'x', this.height);
        console.log('Game active:', this.gameActive);
        console.log('Player position:', this.player.x, this.player.y);
        console.log('Start screen element:', this.startScreen ? 'Found' : 'Not found');
        console.log('Game over screen element:', this.gameOverScreen ? 'Found' : 'Not found');
        console.log('Wave notification element:', this.waveNotification ? 'Found' : 'Not found');
        console.log('Start button element:', document.getElementById('start-button') ? 'Found' : 'Not found');
        console.log('Restart button element:', document.getElementById('restart-button') ? 'Found' : 'Not found');
        console.log('Submit score button element:', document.getElementById('submit-score-button') ? 'Found' : 'Not found');
        console.log('=== END DEBUG INFO ===');
    }
    
    // Add or fix checkBladeCollision method
    checkBladeCollision(enemy) {
        // Calculate blade end
        const bladeEndX = this.player.x + Math.cos(this.player.bladeRotation) * this.player.bladeLength;
        const bladeEndY = this.player.y + Math.sin(this.player.bladeRotation) * this.player.bladeLength;
        
        // Check distance from enemy to blade segment
        // Use distance from point to line segment
        const lineLength = Math.hypot(bladeEndX - this.player.x, bladeEndY - this.player.y);
        
        // Projection of enemy position onto blade line
        const t = Math.max(0, Math.min(1, 
                    ((enemy.x - this.player.x) * (bladeEndX - this.player.x) + 
                     (enemy.y - this.player.y) * (bladeEndY - this.player.y)) / 
                     (lineLength * lineLength)));
        
        // Closest point on blade to enemy
        const projectionX = this.player.x + t * (bladeEndX - this.player.x);
        const projectionY = this.player.y + t * (bladeEndY - this.player.y);
        
        // Distance between enemy and closest point on blade
        const distance = Math.hypot(enemy.x - projectionX, enemy.y - projectionY);
        
        // Collision occurs if distance is less than enemy size + blade width/2
        return distance < enemy.size + this.player.bladeWidth;
    }
    
    // Fix the player position update method
    updatePlayerPosition() {
        let dx = 0;
        let dy = 0;
        
        // Handle keyboard input
        if (this.keys['ArrowUp'] || this.keys['w']) dy -= this.player.speed;
        if (this.keys['ArrowDown'] || this.keys['s']) dy += this.player.speed;
        if (this.keys['ArrowLeft'] || this.keys['a']) dx -= this.player.speed;
        if (this.keys['ArrowRight'] || this.keys['d']) dx += this.player.speed;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const factor = 1 / Math.sqrt(2);
            dx *= factor;
            dy *= factor;
        }
        
        // Update player position
        this.player.x += dx;
        this.player.y += dy;
        
        // Keep player within bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));
    }
    
    // Add proper collision detection method
    checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < obj1.radius + obj2.radius;
    }
    
    // Add the missing createParticles function
    createParticles(x, y, count, color, size, speed) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            
            this.particles.push({
                x,
                y,
                size: Math.random() * size,
                color,
                velocity: {
                    x: Math.cos(angle) * speed * Math.random(),
                    y: Math.sin(angle) * speed * Math.random()
                },
                alpha: 1,
                life: Math.random() * 30 + 10
            });
        }
    }
    
    // Add method to check if all required elements for proof generation exist
    checkProofElements() {
        const requiredElements = [
            'proof-generation-window',
            'modal-overlay',
            'terminal-content',
            'proof-progress-bar',
            'progress-percentage',
            'proof-log',
            'log-content',
            'close-log',
            'verification-details',
            'verification-status',
            'proof-hash',
            'proof-timestamp',
            'minimize-window',
            'close-window'
        ];
        
        const missingElements = [];
        
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                missingElements.push(elementId);
            }
        }
        
        if (missingElements.length > 0) {
            console.error('Missing proof elements:', missingElements);
            return false;
        }
        
        return true;
    }
    
    // Add method to create missing elements
    createMissingElements() {
        console.log('Attempting to create missing elements...');
        
        // Check and create modal overlay if it doesn't exist
        if (!document.getElementById('modal-overlay')) {
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'modal-overlay';
            modalOverlay.className = 'modal-overlay';
            document.body.appendChild(modalOverlay);
            console.log('Created modal overlay');
        }
        
        // Check and create proof log if it doesn't exist
        if (!document.getElementById('proof-log')) {
            const proofLog = document.createElement('div');
            proofLog.id = 'proof-log';
            proofLog.className = 'proof-log';
            proofLog.style.display = 'none';
            
            const logHeader = document.createElement('div');
            logHeader.className = 'proof-log-header';
            
            const logTitle = document.createElement('h3');
            logTitle.textContent = 'SP1 ZERO-KNOWLEDGE PROOF LOG';
            
            const closeButton = document.createElement('button');
            closeButton.id = 'close-log';
            closeButton.className = 'close-button';
            closeButton.textContent = 'X';
            closeButton.addEventListener('click', () => {
                proofLog.style.display = 'none';
            });
            
            logHeader.appendChild(logTitle);
            logHeader.appendChild(closeButton);
            
            const logContent = document.createElement('div');
            logContent.id = 'log-content';
            logContent.className = 'log-content';
            
            proofLog.appendChild(logHeader);
            proofLog.appendChild(logContent);
            
            document.body.appendChild(proofLog);
            console.log('Created proof log');
        }
        
        // Check and create verification details if it doesn't exist
        if (!document.getElementById('verification-details')) {
            const verificationDetails = document.createElement('div');
            verificationDetails.id = 'verification-details';
            verificationDetails.className = 'verification-details';
            verificationDetails.style.display = 'none';
            
            const title = document.createElement('h3');
            title.textContent = 'VERIFICATION DETAILS';
            
            const statusP = document.createElement('p');
            statusP.innerHTML = 'Status: <span id="verification-status">Enter your name and generate a proof</span>';
            
            const hashP = document.createElement('p');
            hashP.innerHTML = 'Proof Hash: <span id="proof-hash">-</span>';
            
            const timestampP = document.createElement('p');
            timestampP.innerHTML = 'Timestamp: <span id="proof-timestamp">-</span>';
            
            verificationDetails.appendChild(title);
            verificationDetails.appendChild(statusP);
            verificationDetails.appendChild(hashP);
            verificationDetails.appendChild(timestampP);
            
            document.body.appendChild(verificationDetails);
            console.log('Created verification details');
        }
        
        console.log('Finished creating missing elements');
    }

    // Fix updateUI method to ensure UI always looks clean
    updateUI() {
        // Update score, wave, and lives display
        const scoreDisplay = document.getElementById('score-display');
        const waveDisplay = document.getElementById('wave-display');
        const livesDisplay = document.getElementById('lives-display');
        
        if (scoreDisplay) scoreDisplay.textContent = this.score;
        if (waveDisplay) waveDisplay.textContent = this.wave;
        
        // Update lives display with colored circles
        if (livesDisplay) {
            let livesHTML = '';
            for (let i = 0; i < this.lives; i++) {
                livesHTML += '<span class="life-circle">●</span> ';
            }
            livesDisplay.innerHTML = livesHTML;
        }
    }

    // Method for counter animation (for score)
    animateCounter(element, start, end, duration) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            // Add glow effect when number changes
            element.style.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff';
            setTimeout(() => {
                element.style.textShadow = '';
            }, 50);
            
            if (current == end) {
                clearInterval(timer);
                
                // Add final glow effect
                element.style.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff';
                setTimeout(() => {
                    element.style.textShadow = '';
                }, 500);
            }
        }, stepTime);
    }

    // Method for canvas shake effect
    shakeCanvas(intensity, duration) {
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) return;
        
        const originalPosition = {
            x: 0,
            y: 0
        };
        
        const shake = () => {
            const xOffset = (Math.random() - 0.5) * intensity;
            const yOffset = (Math.random() - 0.5) * intensity;
            
            gameContainer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        };
        
        // Shake with interval 50ms
        const shakeInterval = setInterval(shake, 50);
        
        // Stop shake after duration
        setTimeout(() => {
            clearInterval(shakeInterval);
            gameContainer.style.transform = `translate(${originalPosition.x}px, ${originalPosition.y}px)`;
        }, duration);
    }

    // Add drawGrid method to class BladeWarrior
    drawGrid() {
        // Draw grid for background
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.width; x += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.height; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    // Add missing logGameEvent method
    logGameEvent(eventType, eventData) {
        console.log(`Game event: ${eventType}`, eventData);
        
        // Add event to gameData
        if (!this.gameData.events) {
            this.gameData.events = [];
        }
        
        this.gameData.events.push({
            type: eventType,
            data: eventData,
            timestamp: Date.now()
        });
    }

    // Add missing updateParticles method
    updateParticles() {
        if (!this.particles) {
            this.particles = [];
            return;
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Move particle
            particle.x += particle.dx;
            particle.y += particle.dy;
            
            // Fade out
            particle.alpha -= 0.02;
            
            // Remove if faded out
            if (particle.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // Update shoot() method to shoot in mouse direction
    shoot() {
        if (!this.gameActive) return;
        
        // Calculate direction based on mouse position
        const angle = Math.atan2(
            this.mousePosition.y - this.player.y,
            this.mousePosition.x - this.player.x
        );
        
        // Calculate velocity based on angle
        const velocity = {
            x: Math.cos(angle) * 10,
            y: Math.sin(angle) * 10
        };
        
        // Create projectile
        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            size: 5,
            color: '#00ffff',
            velocity: velocity
        });
        
        // Add game event
        this.addGameEvent('shoot', { position: { x: this.player.x, y: this.player.y }, angle });
        
        // Create particles for visual effect
        this.createParticles(this.player.x, this.player.y, 5, '#00ffff', 1, 1);
    }

    // Add function to send score to server (at end of verifyScore or create new function)
    sendScoreToServer(playerName, score, gameHash) {
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Only do this in non-simulation environment
        if (!this.simulationMode) {
            // Show loading state
            const statusElement = document.getElementById('verification-status');
            if (statusElement) {
                statusElement.textContent = 'Sending verification request to server...';
            }
            
            // Send to backend
            fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerName,
                    score,
                    timestamp,
                    gameHash
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Verification response:', data);
                
                // Update UI with result
                if (statusElement) {
                    statusElement.textContent = data.success 
                        ? 'Verification completed successfully! ✅' 
                        : 'Verification failed! ❌';
                    
                    statusElement.className = data.success ? 'success' : 'error';
                }
            })
            .catch(error => {
                console.error('Error sending verification request:', error);
                if (statusElement) {
                    statusElement.textContent = 'Error: ' + error.message;
                    statusElement.className = 'error';
                }
            });
        }
    }

    // Hard reset all game parameters including speed
    restart() {
        console.log('Game restart called from BladeWarrior');
        
        try {
            // Reset game state
            this.score = 0;
            this.lives = 3;
            this.wave = 1;
            this.gameOver = false;
            this.gameActive = true;
            this.isRunning = false;
            
            // PERBAIKAN: Reset ALL speed parameters to default values
            this.baseEnemySpeed = 2.0; // Reset to default value
            this.enemySpeedMultiplier = 1.0; // Reset to default value
            this.enemySpawnRate = 60; // Reset to default value
            this.enemySpawnCounter = 0;
            
            console.log('Speed parameters reset: baseSpeed=' + this.baseEnemySpeed + 
                      ', multiplier=' + this.enemySpeedMultiplier);
            
            // Ensure initial wave value is 1
            document.getElementById('wave-display').textContent = '1';
            
            // Hide game over screen if it exists
            if (this.gameOverScreen) {
                this.gameOverScreen.style.display = 'none';
            }
            
            // Hide game over modal
            const gameOverModal = document.getElementById('game-over');
            if (gameOverModal) {
                gameOverModal.style.display = 'none';
            }
            
            // Show canvas and ensure it's visible
            this.canvas.style.display = 'block';
            
            // PERBAIKAN: Set player with all required properties
            this.player = {
                x: this.width / 2,
                y: this.height - 80,
                radius: 20,
                width: 40,
                height: 40,
                speed: 5,
                color: '#ff00ff',
                bladeLength: 40,
                bladeWidth: 6,
                bladeRotation: 0,
                bladeRotationSpeed: 0.1,
                invulnerable: false,
                invulnerableTime: 0
            };
            
            // Reset arrays and collections
            this.enemies = [];
            this.particles = [];
            this.keys = {};
            
            // Update UI
            this.updateUI();
            
            // IMPORTANT: Spawn enemies with correct initial speed
            this.spawnEnemies();
            
            // Update gameState global
            if (window.gameState) {
                window.gameState.updateState({
                    finalScore: 0,
                    finalWave: 1,
                    gameActive: true
                });
            }
            
            console.log('Game successfully restarted!');
            return true;
        } catch (error) {
            console.error('Error on game restart:', error);
            return false;
        }
    }

    // Fix draw method to support both enemy types
    draw() {
        if (!this.ctx || !this.canvas) {
            console.error('Context or canvas not available for drawing!');
            return;
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // PERBAIKAN: Add draw logging for debugging
        console.log(`Drawing game: player at ${this.player.x},${this.player.y}, enemies: ${this.enemies.length}`);
        
        // Draw player with proper checks
        if (this.player) {
            this.ctx.save();
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius || 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw player blade
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.rotate(this.player.bladeRotation);
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(0, -this.player.bladeWidth / 2, this.player.bladeLength, this.player.bladeWidth);
            this.ctx.restore();
        }
        
        // Draw enemies with compatibility for both size and radius properties
        for (const enemy of this.enemies) {
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            // Use radius if available, otherwise use size
            const enemySize = enemy.radius || enemy.size || 20;
            this.ctx.arc(enemy.x, enemy.y, enemySize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw particles
        for (const particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
    }
}

// Add function to ensure game starts correctly
function initializeGame() {
    console.log('Initializing game...');
    
    try {
        // Check if canvas exists
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found!');
            // Try to create canvas if it doesn't exist
            createGameCanvas();
            return;
        }
        
        // Initialize game
        const game = new BladeWarrior('gameCanvas');
        
        // Ensure start button event listener works
        const startButton = document.getElementById('start-button');
        if (startButton) {
            console.log('Start button found, attaching event listener');
            // Remove existing event listener
            const newStartButton = startButton.cloneNode(true);
            startButton.parentNode.replaceChild(newStartButton, startButton);
            
            // Add new event listener
            newStartButton.addEventListener('click', function() {
                console.log('Start button clicked');
                if (game) {
                    try {
                        game.startGame();
                        console.log('Game started!');
                    } catch (error) {
                        console.error('Error starting game:', error);
                        alert('Error starting game: ' + error.message);
                    }
                }
            });
        } else {
            console.error('Start button not found!');
        }
        
        // Expose game object to window for debugging
        window.gameInstance = game;
        
        console.log('Game initialization complete!');
        return game;
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error initializing game: ' + error.message);
    }
}

// Function to create canvas if it doesn't exist
function createGameCanvas() {
    console.log('Creating game canvas...');
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
        console.error('Game container not found!');
        return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 600;
    
    // Add canvas to container
    gameContainer.prepend(canvas);
    console.log('Game canvas created');
    
    // Try to initialize game again
    setTimeout(initializeGame, 100);
}

// Fix startGame method
BladeWarrior.prototype.startGame = function() {
    console.log('Starting game...');
    
    // Reset game state
    this.gameActive = true;
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.enemies = [];
    this.gameData = { events: [] };
    
    // Reset player position
    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.bladeRotation = 0;
    this.player.invulnerable = false;
    this.player.invulnerableTime = 0;
    
    // Update UI
    this.updateUI();
    
    // Hide start screen if exists
    if (this.startScreen) {
        this.startScreen.style.display = 'none';
    }
    
    // Hide game over screen if exists
    if (this.gameOverScreen) {
        this.gameOverScreen.style.display = 'none';
    }
    
    // Log game start event
    this.logGameEvent('game_start', { timestamp: Date.now() });
    
    console.log('Game started!');
};

// Ensure event listener for document.DOMContentLoaded works
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('DOM fully loaded - initializing game');
        
        // Check if canvas exists
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found!');
            alert('Canvas not found! Game cannot be initialized.');
            return;
        }
        
        // Initialize game
        const game = new BladeWarrior('gameCanvas');
        
        // Ensure start button event listener works
        const startButton = document.getElementById('start-button');
        if (startButton) {
            console.log('Start button found, attaching event listener');
            startButton.addEventListener('click', function() {
                console.log('Start button clicked');
                if (game) {
                    try {
                        game.startGame();
                        console.log('Game started!');
                    } catch (error) {
                        console.error('Error starting game:', error);
                        alert('Error starting game: ' + error.message);
                    }
                }
            });
        } else {
            console.error('Start button not found!');
        }
        
        // Expose game object to window for debugging
        window.gameInstance = game;
        
        console.log('Game initialization complete!');
        
        // Setup event listeners for debugging
        window.addEventListener('error', function(e) {
            console.error('Global error caught:', e.error);
        });
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error initializing game: ' + error.message);
    }
});