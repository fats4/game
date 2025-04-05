/**
 * SP1 Bridge - Bridge between Focus App and SP1 ZK Proof system
 */

const SP1Bridge = {
    // Main proof generation function
    generateProof: async function(focusData, forceSimulation = false) {
        console.log("SP1Bridge: Proof generation started", focusData);
        
        // Simulation mode for environments like Vercel
        const isVercel = window.location.hostname.includes('vercel.app');
        const forceSimulationFromStorage = localStorage.getItem('forceSimulation') === 'true';
        const useSimulation = forceSimulation || isVercel || forceSimulationFromStorage;
        
        // Log function check
        if (typeof window.logToProofPanel === 'function') {
            window.logToProofPanel("Starting SP1 Proof system...");
            window.logToProofPanel(`Mode: ${useSimulation ? 'SIMULATION' : 'REAL'}`);
            
            if (useSimulation && !forceSimulation) {
                window.logToProofPanel("Note: Real SP1 proofs only work in local environment.");
            }
            
            window.logToProofPanel(`Task: ${focusData.task}`);
            window.logToProofPanel(`Start Time: ${new Date(focusData.startTime * 1000).toLocaleTimeString()}`);
            window.logToProofPanel(`End Time: ${new Date(focusData.endTime * 1000).toLocaleTimeString()}`);
            window.logToProofPanel(`Planned Duration: ${focusData.duration} seconds`);
            window.logToProofPanel(`Actual Duration: ${focusData.endTime - focusData.startTime} seconds`);
            window.logToProofPanel("Running SP1 ZK program...");
        }
        
        try {
            // If simulation is requested
            if (useSimulation) {
                return this.simulateProofProcess(focusData);
            }
            
            // Try to generate real proof
            const result = await this.generateRealProof(focusData);
            if (result.success) {
                return result;
            }
            
            // Fall back to simulation mode if unsuccessful
            if (typeof window.logToProofPanel === 'function') {
                window.logToProofPanel("Switching to simulation mode...");
            }
            return this.simulateProofProcess(focusData);
        } catch (error) {
            console.error("Real proof generation error:", error);
            if (typeof window.logToProofPanel === 'function') {
                window.logToProofPanel(`Error: ${error.message}`);
                window.logToProofPanel("Switching to simulation mode...");
            }
            
            // Fall back to simulation mode in error case
            return this.simulateProofProcess(focusData);
        }
    },
    
    // Call the real SP1 proof API
    generateRealProof: async function(focusData) {
        if (typeof window.logToProofPanel === 'function') {
            window.logToProofPanel("Connecting to SP1 backend...");
        }
        
        try {
            // API call
            const response = await fetch('http://localhost:3000/api/generate-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(focusData)
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Result from API:", result);
            
            if (typeof window.logToProofPanel === 'function') {
                window.logToProofPanel("SP1 Proof successfully generated!");
                window.logToProofPanel(`Proof Hash: ${result.proofHash}`);
                
                if (result.isValid) {
                    window.logToProofPanel("Focus verification: SUCCESS");
                } else {
                    window.logToProofPanel("Focus verification: FAILED. Required focus time not met!");
                }
            }
            
            return result;
        } catch (error) {
            console.error("API call failed:", error);
            if (typeof window.logToProofPanel === 'function') {
                window.logToProofPanel(`API Error: ${error.message}`);
            }
            throw error;
        }
    },
    
    // Simulate the proof process
    simulateProofProcess: function(focusData) {
        // Calculations
        const actualDuration = focusData.endTime - focusData.startTime;
        const isValid = actualDuration >= focusData.duration;
        
        const steps = [
            { message: "Loading SP1 RISC-V program...", delay: 500 },
            { message: "Preparing focus data for verification...", delay: 500 },
            { message: `Input values: Start=${new Date(focusData.startTime * 1000).toLocaleTimeString()}, End=${new Date(focusData.endTime * 1000).toLocaleTimeString()}, Duration=${focusData.duration}s`, delay: 1000 },
            { message: "Verifying focus session...", delay: 800 },
            { message: `Actual duration: ${actualDuration} seconds`, delay: 1200 },
            { message: `Focus verification: ${isValid ? "SUCCESS" : "FAILED!"}`, delay: 1000 },
            { message: "Creating SP1 ZK circuit...", delay: 1000 },
            { message: "Generating cryptographic proof (1/3)...", delay: 1200 },
            { message: "Generating cryptographic proof (2/3)...", delay: 1200 },
            { message: "Generating cryptographic proof (3/3)...", delay: 1200 },
            { message: "Verifying proof...", delay: 1000 },
            { message: "Proof successfully generated and verified! (SIMULATION)", delay: 800 }
        ];
        
        let currentStep = 0;
        
        // Show steps in sequence
        const processNextStep = () => {
            if (currentStep < steps.length) {
                if (typeof window.logToProofPanel === 'function') {
                    window.logToProofPanel(steps[currentStep].message);
                }
                
                setTimeout(() => {
                    currentStep++;
                    processNextStep();
                }, steps[currentStep].delay);
            } else {
                // All steps completed, show result
                this.completeProof(focusData, isValid);
            }
        };
        
        // Start first step
        processNextStep();
        
        // Simulated hash
        const hash = this.generateProofHash(focusData);
        
        return {
            success: true,
            simulation: true,
            proofHash: hash,
            startTime: focusData.startTime,
            endTime: focusData.endTime,
            plannedDuration: focusData.duration,
            actualDuration: actualDuration,
            isValid: isValid,
            task: focusData.task
        };
    },
    
    // Complete the proof process
    completeProof: function(focusData, isValid) {
        // Create hash
        const hash = this.generateProofHash(focusData);
        
        // Show result
        if (typeof window.logToProofPanel === 'function') {
            window.logToProofPanel("=== PROOF RESULT ===");
            window.logToProofPanel(`Hash: ${hash}`);
            window.logToProofPanel(`Verification: ${isValid ? "SUCCESS" : "FAILED"}`);
            window.logToProofPanel("===================");
        }
    },
    
    // Create visual result panel
    createVisualProofResult: function(focusData, hash, isValid, returnOnly = false) {
        // Create div to show proof result
        const proofResultDiv = document.createElement('div');
        proofResultDiv.id = 'proof-result';
        proofResultDiv.style.marginTop = '15px';
        proofResultDiv.style.padding = '12px';
        proofResultDiv.style.backgroundColor = 'rgba(20, 20, 35, 0.9)';
        proofResultDiv.style.borderRadius = '8px';
        proofResultDiv.style.border = isValid ? 
            '1px solid #2ecc71' : '1px solid #e74c3c';
        proofResultDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        proofResultDiv.style.fontSize = '13px';
        
        // Calculated values
        const actualDuration = focusData.endTime - focusData.startTime;
        const startDate = new Date(focusData.startTime * 1000);
        const endDate = new Date(focusData.endTime * 1000);
        
        // Convert to minutes and seconds format
        const formatDuration = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins} min ${secs} sec`;
        };
        
        // Result content
        const resultHTML = `
            <div style="text-align: center; margin-bottom: 8px;">
                <span style="font-size: 18px; color: ${isValid ? '#2ecc71' : '#e74c3c'}; display: inline-block; margin-right: 6px;">
                    ${isValid ? '✓' : '✗'}
                </span>
                <span style="font-weight: bold; font-size: 16px; color: ${isValid ? '#2ecc71' : '#e74c3c'};">
                    Focus Proof ${isValid ? 'Verified!' : 'Failed!'}
                </span>
            </div>
            
            <div style="background-color: rgba(52, 152, 219, 0.1); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="font-weight: bold; color: #3498db; font-size: 12px;">Task</div>
                <div style="font-size: 14px; word-break: break-word;">${focusData.task}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="flex: 1; background-color: rgba(46, 204, 113, 0.1); padding: 6px; border-radius: 4px; margin-right: 4px;">
                    <div style="font-weight: bold; color: #2ecc71; font-size: 12px;">Planned</div>
                    <div style="font-size: 14px;">${formatDuration(focusData.duration)}</div>
                </div>
                <div style="flex: 1; background-color: rgba(241, 196, 15, 0.1); padding: 6px; border-radius: 4px; margin-left: 4px;">
                    <div style="font-weight: bold; color: #f1c40f; font-size: 12px;">Actual</div>
                    <div style="font-size: 14px;">${formatDuration(actualDuration)} ${!isValid ? '<span style="color:#e74c3c; font-size: 11px;">(Not enough!)</span>' : ''}</div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="flex: 1; background-color: rgba(155, 89, 182, 0.1); padding: 6px; border-radius: 4px; margin-right: 4px;">
                    <div style="font-weight: bold; color: #9b59b6; font-size: 12px;">Start Time</div>
                    <div style="font-size: 14px;">${startDate.toLocaleTimeString()}</div>
                </div>
                <div style="flex: 1; background-color: rgba(52, 152, 219, 0.1); padding: 6px; border-radius: 4px; margin-left: 4px;">
                    <div style="font-weight: bold; color: #3498db; font-size: 12px;">End Time</div>
                    <div style="font-size: 14px;">${endDate.toLocaleTimeString()}</div>
                </div>
            </div>
            
            <div style="background-color: rgba(52, 152, 219, 0.05); padding: 6px; border-radius: 4px; margin-bottom: 10px; word-break: break-all; border: 1px dashed #3498db;">
                <div style="font-weight: bold; color: #3498db; font-size: 11px; margin-bottom: 2px;">Proof Hash</div>
                <div style="font-family: monospace; font-size: 11px; color: #7f8c8d;">${hash}</div>
            </div>
            
            <!-- Twitter Share Button -->
            <div style="text-align: center;">
                <button id="share-twitter-button" style="
                    background: linear-gradient(45deg, #1DA1F2, #1a91da);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    margin: 0 auto;
                    font-size: 12px;
                    box-shadow: 0 2px 4px rgba(29, 161, 242, 0.3);
                ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Share
                </button>
            </div>
        `;
        
        proofResultDiv.innerHTML = resultHTML;
        
        // Add event listener to Twitter share button
        setTimeout(() => {
            const shareButton = proofResultDiv.querySelector('#share-twitter-button');
            if (shareButton) {
                shareButton.addEventListener('click', () => this.shareOnTwitter(focusData, actualDuration, isValid));
            }
        }, 100);
        
        // If only returning is requested
        if (returnOnly) {
            return proofResultDiv;
        }
        
        // Add to proof-log element
        const proofLog = document.getElementById('proof-log');
        if (proofLog) {
            proofLog.appendChild(proofResultDiv);
        }
        
        return proofResultDiv;
    },
    
    // Share on Twitter
    shareOnTwitter: function(focusData, actualDuration, isValid) {
        const taskText = focusData.task.length > 30 ? 
            focusData.task.substring(0, 27) + '...' : 
            focusData.task;
            
        const formatDuration = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins} min ${secs} sec`;
        };
            
        const statusText = isValid ? 'successfully completed' : 'attempted';
        const shareText = `I ${statusText} a ${formatDuration(actualDuration)} focus session on "${taskText}" and proved it with SP1 zero-knowledge proofs! 🧠✨ #FocusProof @SuccinctLabs `;
        
        const encodedText = encodeURIComponent(shareText);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        // Open Twitter share page in new window
        window.open(twitterUrl, '_blank');
    },
    
    // Generate proof hash for simulation
    generateProofHash: function(focusData) {
        // Convert parameters to hex
        const startTimeHex = focusData.startTime.toString(16).padStart(8, '0');
        const endTimeHex = focusData.endTime.toString(16).padStart(8, '0');
        const durationHex = focusData.duration.toString(16).padStart(4, '0');
        const timePart = Date.now().toString(16).slice(-8);
        
        return `0xSIM${startTimeHex}${endTimeHex}${durationHex}${timePart}`;
    }
};

// Global SP1Bridge object
window.SP1Bridge = SP1Bridge;

// Global proof generation function
window.generateSP1Proof = function(focusData, forceSimulation = false) {
    return SP1Bridge.generateProof(focusData, forceSimulation);
};

// Create proof panel
window.createProofPanel = function() {
    console.log("Creating proof panel...");
    
    // Clear old panel
    const oldPanel = document.getElementById('proof-panel');
    if (oldPanel) oldPanel.classList.remove('hidden');
    
    // Show panel if not visible
    const panel = document.getElementById('proof-panel');
    if (panel) {
        panel.classList.remove('hidden');
        panel.style.zIndex = 1000; // Show on top with high z-index
    }
    
    // Clear log area
    const logArea = document.getElementById('proof-log');
    if (logArea) logArea.innerHTML = '';
    
    console.log("Proof panel created!");
    return panel;
};

// Log to proof panel
window.logToProofPanel = function(message) {
    console.log("Log message:", message);
    const logArea = document.getElementById('proof-log');
    if (!logArea) {
        console.error("proof-log element not found!");
        return;
    }
    
    // Add timestamp
    const date = new Date();
    const timestamp = `[${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}] `;
    
    // Create new line
    const line = document.createElement('div');
    line.textContent = timestamp + message;
    
    // Add line to log area
    logArea.appendChild(line);
    
    // Auto-scroll
    logArea.scrollTop = logArea.scrollHeight;
};

// Show proof panel
window.showProofPanel = function() {
    const panel = document.getElementById('proof-panel');
    if (panel) panel.classList.remove('hidden');
};

// Hide proof panel
window.hideProofPanel = function() {
    const panel = document.getElementById('proof-panel');
    if (panel) panel.classList.add('hidden');
};

console.log("SP1Bridge loaded - Focus App ZK integration ready!");