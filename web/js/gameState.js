// Menyimpan state game yang dapat diakses global
window.gameState = window.gameState || {
    finalScore: 0,
    finalWave: 1,
    playerName: '',
    gameActive: false,
    lastRestart: 0, // Timestamp restart terakhir untuk mencegah double restart
    
    // Metode untuk mengupdate state
    updateState: function(properties) {
        for (const key in properties) {
            if (this.hasOwnProperty(key)) {
                this[key] = properties[key];
            }
        }
        console.log('Game state updated:', this);
    },
    
    // Generate game hash
    generateGameHash: function(playerName, score) {
        // Implementasi sederhana untuk demo
        const timestamp = Math.floor(Date.now() / 1000);
        const input = `${playerName}-${score}-${timestamp}`;
        let hash = '';
        
        // Buat hash sederhana (64 karakter hex)
        for (let i = 0; i < 64; i++) {
            const charIndex = (input.charCodeAt(i % input.length) + i) % 16;
            hash += '0123456789abcdef'[charIndex];
        }
        
        return hash;
    }
};

// PENTING: Gunakan event capturing untuk menangkap event sebelum bubble
document.addEventListener('click', function(event) {
    // Log untuk debugging
    console.log('Click detected, checking for data-action');
    
    // Temukan elemen dengan data-action
    let target = event.target;
    while (target && !target.dataset.action) {
        target = target.parentElement;
    }
    
    if (!target) return; // Tidak ada action yang ditemukan
    
    const action = target.dataset.action;
    console.log('Action detected:', action);
    
    // Cegah default action dan propagation untuk verifikasi
    if (action === 'verify') {
        console.log('Verify action intercepted via delegation');
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Verifikasi skor dipanggil melalui global handler');
        if (typeof window.verifyGameScore === 'function') {
            window.verifyGameScore();
        } else {
            console.error('Error: window.verifyGameScore tidak tersedia');
        }
        return false;
    }
    
    // Jangan cegah aksi restart, hanya log saja
    if (action === 'restart') {
        console.log('Restart action detected via delegation - allowing propagation');
        
        // Periksa apakah restart baru saja dilakukan (dalam 1 detik terakhir)
        const now = Date.now();
        const lastRestart = window.gameState ? window.gameState.lastRestart || 0 : 0;
        
        // Hanya proses restart jika tidak ada restart dalam 1 detik terakhir
        if (now - lastRestart > 1000) {
            console.log('Restart eligible, calling restart via delegation handler');
            
            if (window.gameInstance && typeof window.gameInstance.restart === 'function') {
                // Update timestamp restart terakhir
                if (window.gameState) window.gameState.lastRestart = now;
                
                try {
                    // Pastikan DOM sudah siap dan tampilkan canvas 
                    const canvas = document.getElementById('gameCanvas');
                    if (canvas) {
                        canvas.style.display = 'block';
                    }
                    
                    // Panggil restart dengan proper context
                    window.gameInstance.restart();
                    console.log('Game restart dipanggil dari delegation handler');
                } catch (error) {
                    console.error('Error dalam restart delegation:', error);
                    // Fallback reload halaman
                    setTimeout(() => window.location.reload(), 500);
                }
            } else {
                console.error('gameInstance atau restart function tidak tersedia!');
            }
        } else {
            console.log('Ignoring rapid restart request, last restart:', lastRestart);
        }
    }
}, true); // true = use capturing phase

// Tambahkan listener global untuk menangkap custom event restart
document.addEventListener('game:restart', function() {
    console.log('Custom restart event received');
    
    const now = Date.now();
    const lastRestart = window.gameState ? window.gameState.lastRestart || 0 : 0;
    
    if (now - lastRestart > 1000) {
        if (window.gameState) window.gameState.lastRestart = now;
        
        if (window.gameInstance && typeof window.gameInstance.restart === 'function') {
            try {
                window.gameInstance.restart();
                console.log('Game restarted via custom event');
            } catch (error) {
                console.error('Error restarting via custom event:', error);
            }
        }
    }
}); 