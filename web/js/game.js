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
        
        // Preload karakter Succinct jika ada
        this.playerImage = new Image();
        this.playerImage.src = 'assets/succinct-character.png'; // Gambar karakter Succinct
        
        // Preload topi biru jika ada
        this.hatImage = new Image();
        this.hatImage.src = 'assets/succinct-hat.png'; // Gambar topi biru
        
        // Enemies
        this.enemies = [];
        this.enemySpawnRate = 60; // Frames between enemy spawns
        this.enemySpawnCounter = 0;
        this.enemySpeed = 2;
        this.enemyRadius = 15;
        
        // Particles
        this.particles = [];
        
        // Input handling - perbarui untuk mencegah scrolling
        this.keys = {};
        
        // UI elements - dengan penanganan error yang lebih baik
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
        
        this.canvas.addEventListener('mousedown', (e) => {
            // Shoot when mouse is clicked
            if (this.gameActive && e.button === 0) { // Left click
                this.shoot();
            }
        });
        
        // Start game loop
        this.gameLoop();
        
        console.log('Game initialized!');
    }
    
    // Metode baru untuk menginisialisasi UI elements dengan penanganan error
    initializeUIElements() {
        // Dapatkan semua elemen UI yang diperlukan
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
        
        // Log elemen UI yang ditemukan/tidak ditemukan
        console.log('UI elements:', uiElements);
        
        // Periksa elemen yang tidak ditemukan
        const missingElements = Object.entries(uiElements)
            .filter(([_, element]) => !element)
            .map(([name]) => name);
        
        if (missingElements.length > 0) {
            console.warn('Some UI elements not found!', missingElements);
        }
        
        // Simpan referensi ke elemen UI
        this.startButton = uiElements.startButton;
        this.startScreen = uiElements.startScreen;
        this.gameOverScreen = uiElements.gameOverScreen;
        this.finalScoreElement = uiElements.finalScoreElement;
        this.finalWaveElement = uiElements.finalWaveElement;
        this.restartButton = uiElements.restartButton;
        this.submitScoreButton = uiElements.submitScoreButton;
        this.highScoreElement = uiElements.highScoreElement;
        this.waveNotification = uiElements.waveNotification;
        
        // Setup event listeners untuk UI
        this.setupUIEventListeners();
    }
    
    // Metode baru untuk setup event listeners dengan penanganan error
    setupUIEventListeners() {
        // Start button
        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Restart button dalam game over screen
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Submit score button dalam game over screen
        if (this.submitScoreButton) {
            this.submitScoreButton.addEventListener('click', () => {
                this.verifyScore();
            });
        }
        
        // Restart button dalam modal
        const modalRestartButton = document.querySelector('#game-over #restart-button');
        if (modalRestartButton) {
            modalRestartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Submit score button dalam modal
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
        
        // Initialize projectiles
        this.projectiles = [];
        
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
    
    update() {
        if (!this.gameActive) return;
        
        // Update player position based on input
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
        
        // Ganti rotasi pedang otomatis dengan perhitungan berdasarkan posisi mouse
        const angle = Math.atan2(
            this.mousePosition.y - this.player.y,
            this.mousePosition.x - this.player.x
        );
        this.player.bladeRotation = angle;
        
        // Efek kedip saat invulnerable
        if (this.player.invulnerable) {
            this.player.invulnerableTime--;
            if (this.player.invulnerableTime <= 0) {
                this.player.invulnerable = false;
            }
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            projectile.x += projectile.velocity.x;
            projectile.y += projectile.velocity.y;
            
            // Remove projectiles that are off screen
            if (projectile.x < 0 || projectile.x > this.width || projectile.y < 0 || projectile.y > this.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move enemy towards player
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            enemy.velocity.x = Math.cos(angle) * enemy.speed;
            enemy.velocity.y = Math.sin(angle) * enemy.speed;
            
            enemy.x += enemy.velocity.x;
            enemy.y += enemy.velocity.y;
            
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
                    this.gameOver();
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
        
        // Determine number of enemies to spawn based on wave
        const enemyCount = Math.min(5, this.wave);
        
        // Spawn enemies
        for (let i = 0; i < enemyCount; i++) {
            // Determine spawn position (outside of screen)
            let x, y;
            if (Math.random() < 0.5) {
                // Spawn on left or right
                x = Math.random() < 0.5 ? -30 : this.width + 30;
                y = Math.random() * this.height;
            } else {
                // Spawn on top or bottom
                x = Math.random() * this.width;
                y = Math.random() < 0.5 ? -30 : this.height + 30;
            }
            
            // Create enemy
            this.enemies.push({
                x: x,
                y: y,
                size: 20,
                color: this.getRandomEnemyColor(),
                velocity: {
                    x: 0,
                    y: 0
                },
                speed: 1 + Math.random() * this.wave / 2
            });
        }
    }
    
    getRandomEnemyColor() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    nextWave() {
        this.wave++;
        
        // Increase difficulty
        this.enemySpawnRate = Math.max(10, 60 - this.wave * 5); // Spawn enemies faster
        this.enemySpeed = Math.min(5, 2 + this.wave * 0.5); // Increase enemy speed
        
        // Show wave notification
        this.showWaveNotification();
        
        // Add game event
        this.addGameEvent('newWave', { wave: this.wave });
        
        console.log(`Wave ${this.wave} started!`);
    }
    
    gameOver() {
        console.log('Game over!');
        this.gameActive = false;
        
        // Simpan skor akhir
        const finalScore = this.score;
        const finalWave = this.wave;
        
        console.log(`Game over - Final Score: ${finalScore}, Wave: ${finalWave}`);
        
        // Show game over screen if exists
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'flex';
            
            // Update final score and wave
            const finalScoreElement = gameOverScreen.querySelector('#final-score');
            if (finalScoreElement) {
                finalScoreElement.textContent = finalScore;
            }
            
            const finalWaveElement = gameOverScreen.querySelector('#final-wave');
            if (finalWaveElement) {
                finalWaveElement.textContent = finalWave;
            }
        }
        
        // Update high score if needed
        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            localStorage.setItem('bladeWarriorHighScore', this.highScore);
            const highScoreElement = document.getElementById('high-score');
            if (highScoreElement) {
                highScoreElement.textContent = this.highScore;
            }
        }
        
        // Simpan skor terakhir untuk verifikasi
        this.finalScore = finalScore;
        this.finalWave = finalWave;
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
            
            // Draw player dengan efek glow
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Gambar pedang
            this.drawBlade();
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
            
            // Draw enemies dengan efek glow
            this.enemies.forEach(enemy => {
                this.ctx.shadowColor = enemy.color;
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = enemy.color;
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            });
            
            // Draw projectiles dengan efek glow
            this.projectiles.forEach(projectile => {
                this.ctx.shadowColor = projectile.color;
                this.ctx.shadowBlur = 8;
                this.ctx.fillStyle = projectile.color;
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
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
    
    // Metode untuk menggambar pedang
    drawBlade() {
        // Simpan state context
        this.ctx.save();
        
        // Translasi ke posisi player
        this.ctx.translate(this.player.x, this.player.y);
        
        // Rotasi pedang
        this.ctx.rotate(this.player.bladeRotation);
        
        // Efek glow untuk pedang
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 15;
        
        // Gambar pedang (bentuk persegi panjang)
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(0, -this.player.bladeWidth / 2, this.player.bladeLength, this.player.bladeWidth);
        
        // Tambahkan detail pedang (gagang)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(-10, -this.player.bladeWidth - 2, 10, this.player.bladeWidth * 2 + 4);
        
        // Kembalikan state context
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
            
            // Tambahkan cursor
            const cursor = document.createElement('span');
            cursor.classList.add('cursor');
            terminalContent.appendChild(cursor);
            
            // Efek ketikan
            let i = 0;
            const typeWriter = () => {
                if (i < message.length) {
                    logEntry.innerHTML = message.substring(0, i+1);
                    terminalContent.insertBefore(logEntry, cursor);
                    terminalContent.scrollTop = terminalContent.scrollHeight;
                    i++;
                    setTimeout(typeWriter, delay);
                } else {
                    // Hapus cursor dari baris ini dan pindahkan ke baris baru
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
        console.log('Verifying score...');
        
        // Pastikan kita memiliki skor yang valid
        if (this.finalScore === undefined) {
            console.error('No valid score to verify!');
            alert('No valid score to verify!');
            return;
        }
        
        // Dapatkan nama pemain
        const playerNameInput = document.getElementById('player-name');
        const playerName = playerNameInput ? playerNameInput.value.trim() : 'Anonymous';
        
        if (!playerName) {
            alert('Please enter your name before verifying score!');
            if (playerNameInput) playerNameInput.focus();
            return;
        }
        
        // Buat hash sederhana dari data game
        const gameHash = this.generateGameHash(playerName, this.finalScore);
        
        // Tampilkan proof log
        const proofLog = document.getElementById('proof-log');
        if (proofLog) {
            proofLog.style.display = 'block';
        }
        
        // Tampilkan terminal output
        const terminalContent = document.getElementById('terminal-content');
        const progressBar = document.querySelector('.progress-bar');
        const progressPercentage = document.getElementById('progress-percentage');
        
        if (terminalContent) {
            terminalContent.textContent = '';
            
            // Simulasi output terminal
            this.simulateTerminalOutput(
                terminalContent, 
                progressBar, 
                progressPercentage,
                playerName,
                this.finalScore,
                this.finalWave,
                gameHash
            );
        }
    }
    
    // Metode untuk menghasilkan hash game
    generateGameHash(playerName, score) {
        const timestamp = Date.now();
        const data = `${playerName}-${score}-${timestamp}`;
        
        // Hash sederhana (untuk contoh saja)
        let hash = '';
        for (let i = 0; i < 64; i++) {
            hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
        }
        
        return hash;
    }
    
    // Metode untuk simulasi output terminal
    simulateTerminalOutput(terminal, progressBar, progressPercentage, playerName, score, wave, gameHash) {
        const lines = [
            "=== SP1 GAME SCORE VERIFICATION ===",
            "INITIALIZING VERIFICATION PROTOCOL...",
            `AGENT: ${playerName}`,
            `MISSION SCORE: ${score}`,
            `WAVE REACHED: ${wave}`,
            `TIMESTAMP: ${new Date().toISOString()}`,
            `MISSION DATA HASH: ${gameHash}`,
            "RUNNING SP1 ZERO-KNOWLEDGE PROOF VERIFICATION...",
            "GENERATING CRYPTOGRAPHIC CIRCUITS...",
            "COMPUTING WITNESS...",
            "GENERATING PROOF...",
            "VERIFYING PROOF...",
            "[SUCCESS] SP1 VERIFICATION COMPLETED",
            "ALL VERIFICATIONS PASSED!",
            "=== VERIFICATION SUCCESSFUL ===",
            "MISSION SCORE CONFIRMED AND RECORDED"
        ];
        
        let lineIndex = 0;
        let charIndex = 0;
        
        // Reset terminal dan progress
        terminal.textContent = '';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercentage) progressPercentage.textContent = '0%';
        
        const typeNextChar = () => {
            if (lineIndex < lines.length) {
                const line = lines[lineIndex];
                
                if (charIndex < line.length) {
                    // Tambahkan karakter berikutnya
                    terminal.textContent += line[charIndex];
                    charIndex++;
                    setTimeout(typeNextChar, 20);
                } else {
                    // Pindah ke baris berikutnya
                    terminal.textContent += '\n';
                    lineIndex++;
                    charIndex = 0;
                    
                    // Update progress
                    const progress = Math.floor((lineIndex / lines.length) * 100);
                    if (progressBar) progressBar.style.width = `${progress}%`;
                    if (progressPercentage) progressPercentage.textContent = `${progress}%`;
                    
                    setTimeout(typeNextChar, 500);
                }
            }
        };
        
        // Mulai animasi
        setTimeout(typeNextChar, 500);
    }
    
    showStartScreen() {
        // Pastikan elemen UI ada
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.waveNotification = document.getElementById('wave-notification');
        
        if (!this.startScreen || !this.gameOverScreen || !this.waveNotification) {
            console.error('UI elements not found!');
            return;
        }
        
        // Tampilkan layar start
        this.startScreen.style.display = 'flex';
        this.gameOverScreen.style.display = 'none';
        
        // Reset game state
        this.gameActive = false;
        
        // Hapus class game-active dari body
        document.body.classList.remove('game-active');
        
        // Update high score jika ada
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
        
        // Tampilkan notifikasi wave
        this.waveNotification.textContent = `WAVE ${this.wave}`;
        this.waveNotification.style.display = 'block';
        this.waveNotification.style.opacity = 1;
        
        // Animasi fade out
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
        
        // Tambahkan log wave baru
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
        
        // Tambahkan timestamp ke event
        const event = {
            type: eventType,
            timestamp: Date.now(),
            ...eventData
        };
        
        // Tambahkan event ke gameData
        this.gameData.events.push(event);
        
        console.log('Game event added:', event);
    }
    
    // Tambahkan metode untuk memeriksa elemen HTML
    checkElements() {
        // Daftar elemen yang diperlukan
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
        
        // Periksa setiap elemen
        let missingElements = [];
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                missingElements.push(elementId);
            }
        }
        
        // Tampilkan pesan error jika ada elemen yang hilang
        if (missingElements.length > 0) {
            console.error('Missing HTML elements:', missingElements);
            alert('Beberapa elemen HTML tidak ditemukan. Game mungkin tidak berfungsi dengan benar.');
        }
        
        return missingElements.length === 0;
    }
    
    // Tambahkan metode debugging
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
    
    // Tambahkan atau perbaiki metode checkBladeCollision
    checkBladeCollision(enemy) {
        // Hitung ujung pedang
        const bladeEndX = this.player.x + Math.cos(this.player.bladeRotation) * this.player.bladeLength;
        const bladeEndY = this.player.y + Math.sin(this.player.bladeRotation) * this.player.bladeLength;
        
        // Periksa jarak enemy ke segmen garis pedang
        // Gunakan cek jarak point ke line segment
        const lineLength = Math.hypot(bladeEndX - this.player.x, bladeEndY - this.player.y);
        
        // Projection of enemy position onto blade line
        const t = Math.max(0, Math.min(1, 
                    ((enemy.x - this.player.x) * (bladeEndX - this.player.x) + 
                     (enemy.y - this.player.y) * (bladeEndY - this.player.y)) / 
                     (lineLength * lineLength)));
        
        // Titik terdekat pada pedang ke musuh
        const projectionX = this.player.x + t * (bladeEndX - this.player.x);
        const projectionY = this.player.y + t * (bladeEndY - this.player.y);
        
        // Jarak antara musuh dan titik terdekat pada pedang
        const distance = Math.hypot(enemy.x - projectionX, enemy.y - projectionY);
        
        // Tumbukan terjadi jika jaraknya kurang dari radius musuh + lebar pedang/2
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
    
    // Tambahkan metode untuk membuat elemen yang hilang
    createMissingElements() {
        console.log('Attempting to create missing elements...');
        
        // Cek dan buat modal overlay jika tidak ada
        if (!document.getElementById('modal-overlay')) {
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'modal-overlay';
            modalOverlay.className = 'modal-overlay';
            document.body.appendChild(modalOverlay);
            console.log('Created modal overlay');
        }
        
        // Cek dan buat proof log jika tidak ada
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
        
        // Cek dan buat verification details jika tidak ada
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

    // Perbaiki metode updateUI untuk memastikan UI selalu terlihat rapi
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

    // Metode untuk animasi counter (untuk skor)
    animateCounter(element, start, end, duration) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            // Tambahkan efek glow saat angka berubah
            element.style.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff';
            setTimeout(() => {
                element.style.textShadow = '';
            }, 50);
            
            if (current == end) {
                clearInterval(timer);
                
                // Tambahkan efek final glow
                element.style.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff';
                setTimeout(() => {
                    element.style.textShadow = '';
                }, 500);
            }
        }, stepTime);
    }

    // Metode untuk efek shake pada canvas
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
        
        // Shake dengan interval 50ms
        const shakeInterval = setInterval(shake, 50);
        
        // Hentikan shake setelah durasi tertentu
        setTimeout(() => {
            clearInterval(shakeInterval);
            gameContainer.style.transform = `translate(${originalPosition.x}px, ${originalPosition.y}px)`;
        }, duration);
    }

    // Tambahkan metode drawGrid ke dalam class BladeWarrior
    drawGrid() {
        // Gambar grid untuk background
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Gambar garis vertikal
        for (let x = 0; x <= this.width; x += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Gambar garis horizontal
        for (let y = 0; y <= this.height; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    // Tambahkan metode logGameEvent yang hilang
    logGameEvent(eventType, eventData) {
        console.log(`Game event: ${eventType}`, eventData);
        
        // Tambahkan event ke gameData
        if (!this.gameData.events) {
            this.gameData.events = [];
        }
        
        this.gameData.events.push({
            type: eventType,
            data: eventData,
            timestamp: Date.now()
        });
    }

    // Tambahkan metode updateParticles yang hilang
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

    // Perbarui metode shoot() untuk menembak ke arah kursor
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
}

// Tambahkan fungsi untuk memastikan game dimulai dengan benar
function initializeGame() {
    console.log('Initializing game...');
    
    try {
        // Periksa apakah canvas ada
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found!');
            // Coba buat canvas jika tidak ada
            createGameCanvas();
            return;
        }
        
        // Inisialisasi game
        const game = new BladeWarrior('gameCanvas');
        
        // Pastikan event listener untuk tombol start berfungsi
        const startButton = document.getElementById('start-button');
        if (startButton) {
            console.log('Start button found, attaching event listener');
            // Hapus event listener yang ada
            const newStartButton = startButton.cloneNode(true);
            startButton.parentNode.replaceChild(newStartButton, startButton);
            
            // Tambahkan event listener baru
            newStartButton.addEventListener('click', function() {
                console.log('Start button clicked');
                if (game) {
                    game.startGame();
                    console.log('Game started!');
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

// Fungsi untuk membuat canvas jika tidak ada
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
    
    // Tambahkan canvas ke container
    gameContainer.prepend(canvas);
    console.log('Game canvas created');
    
    // Coba inisialisasi game lagi
    setTimeout(initializeGame, 100);
}

// Perbaikan pada metode startGame
BladeWarrior.prototype.startGame = function() {
    console.log('Starting game...');
    
    // Reset game state
    this.gameActive = true;
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
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

// Pastikan event listener untuk document.DOMContentLoaded berfungsi
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Inisialisasi game
    const game = initializeGame();
    
    // Tambahkan event listener untuk tombol restart
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        console.log('Restart button found, attaching event listener');
        restartButton.addEventListener('click', function() {
            console.log('Restart button clicked');
            if (window.gameInstance) {
                window.gameInstance.startGame();
            }
        });
    }
    
    // Tambahkan event listener untuk tombol verify score
    const verifyButton = document.getElementById('submit-score-button');
    if (verifyButton) {
        console.log('Verify button found, attaching event listener');
        verifyButton.addEventListener('click', function() {
            console.log('Verify button clicked');
            if (window.gameInstance) {
                window.gameInstance.verifyScore();
            }
        });
    }
});