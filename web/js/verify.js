// Game score verification script
(function() {
    console.log('Verify.js loaded');
    
    // Ensure verifyGameScore isn't redefined if it already exists
    if (typeof window.verifyGameScore !== 'function') {
        // Set verification function as global
        window.verifyGameScore = function() {
            console.log('Score verification called');
            
            // Get score data from gameState or gameInstance
            const gameState = window.gameState || {};
            const gameInstance = window.gameInstance || {};
            
            // Select valid data source (prioritize gameState)
            const finalScore = gameState.finalScore !== undefined ? gameState.finalScore : 
                              (gameInstance.finalScore !== undefined ? gameInstance.finalScore : 0);
            
            const finalWave = gameState.finalWave !== undefined ? gameState.finalWave : 
                             (gameInstance.finalWave !== undefined ? gameInstance.finalWave : 1);
            
            // Ensure game is not active
            const gameActive = gameState.gameActive || (gameInstance.gameActive || false);
            if (gameActive) {
                console.log('Game still active, cannot verify');
                return;
            }
            
            console.log(`Verifying score: ${finalScore}, wave: ${finalWave}`);
            
            // Check if score is available
            if (finalScore === undefined || finalScore === null) {
                alert('No score available for verification!');
                return;
            }
            
            // Get player name
            const playerNameInput = document.getElementById('player-name');
            const playerName = playerNameInput ? playerNameInput.value.trim() : 'Anonymous';
            
            if (!playerName) {
                alert('Please enter your name before verifying score!');
                if (playerNameInput) playerNameInput.focus();
                return;
            }
            
            // Update global state
            if (window.gameState) {
                window.gameState.playerName = playerName;
            }
            
            // Generate game hash
            let gameHash;
            if (window.gameState && typeof window.gameState.generateGameHash === 'function') {
                gameHash = window.gameState.generateGameHash(playerName, finalScore);
            } else if (gameInstance && typeof gameInstance.generateGameHash === 'function') {
                gameHash = gameInstance.generateGameHash(playerName, finalScore);
            } else {
                // Fallback implementation
                const timestamp = Math.floor(Date.now() / 1000);
                gameHash = `${playerName}-${finalScore}-${timestamp}`.split('').map(c => c.charCodeAt(0).toString(16)).join('');
            }
            
            // Add padding if hash is too short
            if (gameHash.length < 64) {
                gameHash = gameHash.padEnd(64, '0');
            } else if (gameHash.length > 64) {
                gameHash = gameHash.slice(0, 64);
            }
            
            // Get current timestamp
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Show proof log
            const proofLog = document.getElementById('proof-log');
            if (proofLog) {
                proofLog.style.display = 'block';
            }
            
            // Reset terminal content and progress bar
            const terminalContent = document.getElementById('terminal-content');
            if (terminalContent) {
                terminalContent.innerHTML = '';
            }
            
            // Get status element
            const statusElement = document.getElementById('verification-status');
            
            // IMPORTANT: Use event source to get real-time proving logs
            let logLines = [];
            let evtSource = null;
            
            try {
                // Add initial logs
                addLogWithTypewriter('Starting Zero-Knowledge verification...', terminalContent);
                addLogWithTypewriter(`Player: ${playerName}`, terminalContent);
                addLogWithTypewriter(`Score: ${finalScore}`, terminalContent);
                addLogWithTypewriter(`Wave: ${finalWave}`, terminalContent);
                addLogWithTypewriter(`Timestamp: ${timestamp}`, terminalContent);
                addLogWithTypewriter('Hash: ' + gameHash.substring(0, 16) + '...', terminalContent);
                addLogWithTypewriter('----------------------------', terminalContent);
                addLogWithTypewriter('Starting ZK proving process...', terminalContent);
                
                // Use Server-Sent Events for log streaming
                evtSource = new EventSource(`/api/verify/log?playerName=${encodeURIComponent(playerName)}&score=${finalScore}&timestamp=${timestamp}`);
                
                evtSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    
                    // Handle log updates
                    if (data.log) {
                        addLogWithTypewriter(data.log, terminalContent);
                        logLines.push(data.log);
                    }
                    
                    // Handle progress updates
                    if (data.progress !== undefined) {
                        updateProgressBar(data.progress);
                    }
                    
                    // Handle verification completion
                    if (data.completed) {
                        evtSource.close();
                        
                        // add log
                        addLogWithTypewriter('----------------------------', terminalContent);
                        addLogWithTypewriter(`Verification ${data.success ? 'SUCCESSFUL' : 'FAILED'}!`, terminalContent);
                        
                        // Update status
                        if (statusElement) {
                            statusElement.textContent = data.success 
                                ? 'Verification completed successfully! ✅' 
                                : 'Verification failed! ❌';
                            
                            statusElement.className = data.success ? 'status-message success' : 'status-message error';
                        }
                    }
                };
                
                evtSource.onerror = function(err) {
                    console.error('EventSource error:', err);
                    evtSource.close();
                    
                    // add log error
                    addLogWithTypewriter('Error: Connection to server lost', terminalContent);
                    
                    // Update status
                    if (statusElement) {
                        statusElement.textContent = 'Error: Connection to server lost';
                        statusElement.className = 'status-message error';
                    }
                };
                
                // send data to start verification
                fetch('/api/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        playerName,
                        score: finalScore,
                        timestamp,
                        gameHash
                    })
                }).catch(error => {
                    console.error('Error when sending verification data:', error);
                    
                    if (evtSource) {
                        evtSource.close();
                    }
                    
                    // add log error
                    addLogWithTypewriter(`Error: ${error.message}`, terminalContent);
                    
                    // Update status
                    if (statusElement) {
                        statusElement.textContent = 'Error: ' + error.message;
                        statusElement.className = 'status-message error';
                    }
                });
                
            } catch (error) {
                console.error('Error when setting up verification:', error);
                
                if (evtSource) {
                    evtSource.close();
                }
                
                // add log error
                addLogWithTypewriter(`Error: ${error.message}`, terminalContent);
                
                // Update status
                if (statusElement) {
                    statusElement.textContent = 'Error: ' + error.message;
                    statusElement.className = 'status-message error';
                }
            }
            
            // function to add log with typewriter effect
            function addLogWithTypewriter(message, terminalElement) {
                if (!terminalElement) return;
                
                const logEntry = document.createElement('div');
                logEntry.classList.add('terminal-line');
                logEntry.textContent = message;
                terminalElement.appendChild(logEntry);
                terminalElement.scrollTop = terminalElement.scrollHeight;
            }
            
            // function to update progress bar
            function updateProgressBar(percentage) {
                const progressBar = document.getElementById('proof-progress-bar');
                const progressText = document.getElementById('progress-percentage');
                
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                }
                
                if (progressText) {
                    progressText.textContent = `${percentage}%`;
                }
            }
        };
    }
    
    // setup event listener for close log and restart button when DOM loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupButtons);
    } else {
        setupButtons();
    }
    
    function setupButtons() {
        // Setup close log button
        const closeLogButton = document.getElementById('close-log');
        if (closeLogButton) {
            closeLogButton.addEventListener('click', function() {
                const proofLog = document.getElementById('proof-log');
                if (proofLog) {
                    proofLog.style.display = 'none';
                }
            });
        }
        
        // ensure restart button always works
        const restartButtons = document.querySelectorAll('[data-action="restart"]');
        restartButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                console.log('Tombol restart diklik langsung');
                
                // add flag to prevent multiple handling
                if (button.getAttribute('data-restart-clicked') === 'true') {
                    console.log('Restart already in progress, ignore duplicate click');
                    return;
                }
                
                button.setAttribute('data-restart-clicked', 'true');
                
                // hide proof log if opened
                const proofLog = document.getElementById('proof-log');
                if (proofLog) {
                    proofLog.style.display = 'none';
                }
                
                // hide game over and modal screens
                const gameOverScreen = document.getElementById('game-over-screen');
                if (gameOverScreen) {
                    gameOverScreen.style.display = 'none';
                }
                
                const gameOverModal = document.getElementById('game-over');
                if (gameOverModal) {
                    gameOverModal.style.display = 'none';
                }
                
                // reset terminal content
                const terminalContent = document.getElementById('terminal-content');
                if (terminalContent) {
                    terminalContent.innerHTML = '';
                }
                
                // reset progress bar
                const progressBar = document.getElementById('proof-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                
                const progressText = document.getElementById('progress-percentage');
                if (progressText) {
                    progressText.textContent = '0%';
                }
                
                // restart game using gameInstance
                if (window.gameInstance && typeof window.gameInstance.restart === 'function') {
                    try {
                        window.gameInstance.restart();
                        console.log('Game successfully restarted');
                    } catch (error) {
                        console.error('Error restarting game:', error);
                        // fallback by reloading the page if restart fails
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    }
                }
                
                // remove flag after delay
                setTimeout(() => {
                    button.removeAttribute('data-restart-clicked');
                }, 1000);
                
                // dispatch custom event for restart (fallback)
                document.dispatchEvent(new CustomEvent('game:restart'));
            }, { capture: true }); // use capturing phase
        });
    }
})(); 