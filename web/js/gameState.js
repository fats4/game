// Store globally accessible game state
window.gameState = window.gameState || {
    finalScore: 0,
    finalWave: 1,
    playerName: '',
    gameActive: false,
    lastRestart: 0, // Last restart timestamp to prevent double restart
    
    // Method to update state
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
        // Simple implementation for demo
        const timestamp = Math.floor(Date.now() / 1000);
        const input = `${playerName}-${score}-${timestamp}`;
        let hash = '';
        
        // Create simple hash (64 hex characters)
        for (let i = 0; i < 64; i++) {
            const charIndex = (input.charCodeAt(i % input.length) + i) % 16;
            hash += '0123456789abcdef'[charIndex];
        }
        
        return hash;
    }
};

// IMPORTANT: Use event capturing to catch events before bubble
document.addEventListener('click', function(event) {
    // Log for debugging
    console.log('Click detected, checking for data-action');
    
    // Find element with data-action
    let target = event.target;
    while (target && !target.dataset.action) {
        target = target.parentElement;
    }
    
    if (!target) return; // No action found
    
    const action = target.dataset.action;
    console.log('Action detected:', action);
    
    // Prevent default action and propagation for verification
    if (action === 'verify') {
        console.log('Verify action intercepted via delegation');
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Score verification called through global handler');
        if (typeof window.verifyGameScore === 'function') {
            window.verifyGameScore();
        } else {
            console.error('Error: window.verifyGameScore not available');
        }
        return false;
    }
    
    // Don't prevent restart action, just log it
    if (action === 'restart') {
        console.log('Restart action detected via delegation - allowing propagation');
        
        // Check if restart was just performed (within the last second)
        const now = Date.now();
        const lastRestart = window.gameState ? window.gameState.lastRestart || 0 : 0;
        
        // Only process restart if no restart in the last second
        if (now - lastRestart > 1000) {
            console.log('Restart eligible, calling restart via delegation handler');
            
            if (window.gameInstance && typeof window.gameInstance.restart === 'function') {
                // Update last restart timestamp
                if (window.gameState) window.gameState.lastRestart = now;
                
                try {
                    // Make sure DOM is ready and display canvas
                    const canvas = document.getElementById('gameCanvas');
                    if (canvas) {
                        canvas.style.display = 'block';
                    }
                    
                    // Call restart with proper context
                    window.gameInstance.restart();
                    console.log('Game restart called from delegation handler');
                } catch (error) {
                    console.error('Error in restart delegation:', error);
                    // Fallback reload page
                    setTimeout(() => window.location.reload(), 500);
                }
            } else {
                console.error('gameInstance or restart function not available!');
            }
        } else {
            console.log('Ignoring rapid restart request, last restart:', lastRestart);
        }
    }
}, true); // true = use capturing phase

// Add global listener to catch custom restart event
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