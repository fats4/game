// Script khusus untuk verifikasi skor game
(function() {
    console.log('Verify.js loaded');
    
    // Pastikan verifyGameScore tidak didefinisikan ulang jika sudah ada
    if (typeof window.verifyGameScore !== 'function') {
        // Tetapkan fungsi verifikasi sebagai global
        window.verifyGameScore = function() {
            console.log('Verifikasi skor dipanggil');
            
            // Dapatkan data skor dari gameState atau gameInstance
            const gameState = window.gameState || {};
            const gameInstance = window.gameInstance || {};
            
            // Pilih sumber data yang valid (prioritaskan gameState)
            const finalScore = gameState.finalScore !== undefined ? gameState.finalScore : 
                              (gameInstance.finalScore !== undefined ? gameInstance.finalScore : 0);
            
            const finalWave = gameState.finalWave !== undefined ? gameState.finalWave : 
                             (gameInstance.finalWave !== undefined ? gameInstance.finalWave : 1);
            
            // Pastikan game tidak aktif
            const gameActive = gameState.gameActive || (gameInstance.gameActive || false);
            if (gameActive) {
                console.log('Game masih aktif, tidak bisa verifikasi');
                return;
            }
            
            console.log(`Verifikasi skor: ${finalScore}, wave: ${finalWave}`);
            
            // Cek apakah skor tersedia
            if (finalScore === undefined || finalScore === null) {
                alert('Tidak ada skor yang tersedia untuk diverifikasi!');
                return;
            }
            
            // Dapatkan nama pemain
            const playerNameInput = document.getElementById('player-name');
            const playerName = playerNameInput ? playerNameInput.value.trim() : 'Anonymous';
            
            if (!playerName) {
                alert('Mohon masukkan nama Anda sebelum memverifikasi skor!');
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
            
            // Tambahkan padding jika hash terlalu pendek
            if (gameHash.length < 64) {
                gameHash = gameHash.padEnd(64, '0');
            } else if (gameHash.length > 64) {
                gameHash = gameHash.slice(0, 64);
            }
            
            // Dapatkan timestamp saat ini
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Tampilkan proof log
            const proofLog = document.getElementById('proof-log');
            if (proofLog) {
                proofLog.style.display = 'block';
            }
            
            // Reset terminal content dan progress bar
            const terminalContent = document.getElementById('terminal-content');
            if (terminalContent) {
                terminalContent.innerHTML = '';
            }
            
            // Dapatkan elemen status
            const statusElement = document.getElementById('verification-status');
            
            // PENTING: Gunakan event source untuk mendapatkan log proving secara real-time
            let logLines = [];
            let evtSource = null;
            
            try {
                // Tambahkan log awal
                addLogWithTypewriter('Memulai verifikasi skor Zero-Knowledge...', terminalContent);
                addLogWithTypewriter(`Player: ${playerName}`, terminalContent);
                addLogWithTypewriter(`Score: ${finalScore}`, terminalContent);
                addLogWithTypewriter(`Wave: ${finalWave}`, terminalContent);
                addLogWithTypewriter(`Timestamp: ${timestamp}`, terminalContent);
                addLogWithTypewriter('Hash: ' + gameHash.substring(0, 16) + '...', terminalContent);
                addLogWithTypewriter('----------------------------', terminalContent);
                addLogWithTypewriter('Memulai proses ZK proving...', terminalContent);
                
                // Gunakan Server-Sent Events untuk streaming log
                evtSource = new EventSource(`/api/verify/log?playerName=${encodeURIComponent(playerName)}&score=${finalScore}&timestamp=${timestamp}`);
                
                evtSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    
                    // Tangani update log
                    if (data.log) {
                        addLogWithTypewriter(data.log, terminalContent);
                        logLines.push(data.log);
                    }
                    
                    // Tangani update progress
                    if (data.progress !== undefined) {
                        updateProgressBar(data.progress);
                    }
                    
                    // Tangani verifikasi selesai
                    if (data.completed) {
                        evtSource.close();
                        
                        // Tambahkan log selesai
                        addLogWithTypewriter('----------------------------', terminalContent);
                        addLogWithTypewriter(`Verifikasi ${data.success ? 'BERHASIL' : 'GAGAL'}!`, terminalContent);
                        
                        // Update status
                        if (statusElement) {
                            statusElement.textContent = data.success 
                                ? 'Verifikasi berhasil diselesaikan! ✅' 
                                : 'Verifikasi gagal! ❌';
                            
                            statusElement.className = data.success ? 'status-message success' : 'status-message error';
                        }
                    }
                };
                
                evtSource.onerror = function(err) {
                    console.error('EventSource error:', err);
                    evtSource.close();
                    
                    // Tambahkan log error
                    addLogWithTypewriter('Error: Koneksi ke server terputus', terminalContent);
                    
                    // Update status
                    if (statusElement) {
                        statusElement.textContent = 'Error: Koneksi ke server terputus';
                        statusElement.className = 'status-message error';
                    }
                };
                
                // Kirim data untuk memulai verifikasi
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
                    console.error('Error saat mengirim data verifikasi:', error);
                    
                    if (evtSource) {
                        evtSource.close();
                    }
                    
                    // Tambahkan log error
                    addLogWithTypewriter(`Error: ${error.message}`, terminalContent);
                    
                    // Update status
                    if (statusElement) {
                        statusElement.textContent = 'Error: ' + error.message;
                        statusElement.className = 'status-message error';
                    }
                });
                
            } catch (error) {
                console.error('Error saat setup verifikasi:', error);
                
                if (evtSource) {
                    evtSource.close();
                }
                
                // Tambahkan log error
                addLogWithTypewriter(`Error: ${error.message}`, terminalContent);
                
                // Update status
                if (statusElement) {
                    statusElement.textContent = 'Error: ' + error.message;
                    statusElement.className = 'status-message error';
                }
            }
            
            // Fungsi untuk menambahkan log dengan efek typewriter
            function addLogWithTypewriter(message, terminalElement) {
                if (!terminalElement) return;
                
                const logEntry = document.createElement('div');
                logEntry.classList.add('terminal-line');
                logEntry.textContent = message;
                terminalElement.appendChild(logEntry);
                terminalElement.scrollTop = terminalElement.scrollHeight;
            }
            
            // Fungsi untuk update progress bar
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
    
    // Setup event listener untuk tombol close log dan restart saat DOM loaded
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
        
        // Pastikan tombol restart selalu berfungsi
        const restartButtons = document.querySelectorAll('[data-action="restart"]');
        restartButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                console.log('Tombol restart diklik langsung');
                
                // Tambahkan flag untuk mencegah multiple handling
                if (button.getAttribute('data-restart-clicked') === 'true') {
                    console.log('Restart sudah sedang diproses, abaikan klik duplikat');
                    return;
                }
                
                button.setAttribute('data-restart-clicked', 'true');
                
                // Sembunyikan proof log jika terbuka
                const proofLog = document.getElementById('proof-log');
                if (proofLog) {
                    proofLog.style.display = 'none';
                }
                
                // Sembunyikan game over dan modal screens
                const gameOverScreen = document.getElementById('game-over-screen');
                if (gameOverScreen) {
                    gameOverScreen.style.display = 'none';
                }
                
                const gameOverModal = document.getElementById('game-over');
                if (gameOverModal) {
                    gameOverModal.style.display = 'none';
                }
                
                // Reset terminal content
                const terminalContent = document.getElementById('terminal-content');
                if (terminalContent) {
                    terminalContent.innerHTML = '';
                }
                
                // Reset progress bar
                const progressBar = document.getElementById('proof-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                
                const progressText = document.getElementById('progress-percentage');
                if (progressText) {
                    progressText.textContent = '0%';
                }
                
                // Restart game menggunakan gameInstance
                if (window.gameInstance && typeof window.gameInstance.restart === 'function') {
                    try {
                        window.gameInstance.restart();
                        console.log('Game berhasil direstart');
                    } catch (error) {
                        console.error('Error saat restart game:', error);
                        // Fallback dengan me-reload halaman jika restart gagal
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    }
                }
                
                // Hapus flag setelah delay
                setTimeout(() => {
                    button.removeAttribute('data-restart-clicked');
                }, 1000);
                
                // Dispatch custom event untuk restart (fallback)
                document.dispatchEvent(new CustomEvent('game:restart'));
            }, { capture: true }); // Gunakan capturing phase
        });
    }
})(); 