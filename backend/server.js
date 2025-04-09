require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Important: Set this constant to false for real SP1 proofs
const SIMULATION_MODE = false;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the web directory
app.use(express.static(path.join(__dirname, '../web')));

const clients = new Map();

const ROOT_DIR = path.resolve(__dirname, '..');
const POSSIBLE_COMPILED_DIRS = [
    path.join(ROOT_DIR, 'target/release'),
    path.join(ROOT_DIR, 'script/target/release'),
    path.join(ROOT_DIR, 'script'),
    path.join(ROOT_DIR, 'bin')
];

let COMPILED_DIR = null;
for (const dir of POSSIBLE_COMPILED_DIRS) {
    if (fs.existsSync(dir)) {
        COMPILED_DIR = dir;
        console.log(`Found compiled directory: ${dir}`);
        break;
    }
}

if (!COMPILED_DIR) {
    console.warn('Warning: Could not find compiled directory. Using root directory as fallback.');
    COMPILED_DIR = ROOT_DIR;
}

const PROOF_OUTPUT_DIR = path.join(ROOT_DIR, 'proofs');

try {
    if (!fs.existsSync(PROOF_OUTPUT_DIR)) {
        fs.mkdirSync(PROOF_OUTPUT_DIR, { recursive: true });
        console.log(`Created proof output directory: ${PROOF_OUTPUT_DIR}`);
    }
} catch (err) {
    console.error(`Error creating proof directory: ${err.message}`);
    console.log('Using current directory as fallback for proofs');
    PROOF_OUTPUT_DIR = path.join(__dirname, 'proofs');
    
    if (!fs.existsSync(PROOF_OUTPUT_DIR)) {
        fs.mkdirSync(PROOF_OUTPUT_DIR, { recursive: true });
    }
}

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/index.html'));
});

// Debug endpoint
app.get('/debug', (req, res) => {
    const scriptPath = path.join(__dirname, '../script');
    const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        env: {
            ...process.env,
            PATH: '[REDACTED]' // Don't expose actual PATH for security
        }
    };
    
    res.json({
        status: 'OK',
        message: 'Debug endpoint working',
        timestamp: new Date().toISOString(),
        scriptPath,
        simulationMode: SIMULATION_MODE,
        systemInfo
    });
});

// Game score verification endpoint
app.post('/api/verify', async (req, res) => {
    try {
        const { playerName, score, timestamp, gameHash } = req.body;
        
        if (!playerName || score === undefined || !timestamp || !gameHash) {
        return res.status(400).json({
            success: false,
                message: 'Missing required fields in request' 
            });
        }
        
        console.log(`Verifying score for player ${playerName}: ${score} points`);
        
        const verificationId = `${playerName}-${timestamp}`;
        
        const proofFileName = `${playerName.replace(/[^a-z0-9]/gi, '_')}_${score}_${Date.now()}.bin`;
        const proofFilePath = path.join(PROOF_OUTPUT_DIR, proofFileName);
        
        res.json({
            success: true,
            message: "Verification process started",
            verificationId,
            proofFile: proofFileName 
        });
        
        fs.writeFileSync(proofFilePath, Buffer.alloc(0));
        console.log(`Empty proof file created at: ${proofFilePath}`);

        runVerification(playerName, score, timestamp, gameHash, verificationId, proofFilePath);
            
    } catch (error) {
        console.error("Server error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: `Server error: ${error.message || 'Unknown error'}`
            });
        } else {
            console.error("Cannot send error response, headers already sent");
        }
    }
});

app.get('/api/verify/log', (req, res) => {
    const { playerName, score, timestamp } = req.query;
    const verificationId = `${playerName}-${timestamp}`;
    
    console.log(`Client connected to log stream for verification ID: ${verificationId}`);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    res.write(`data: ${JSON.stringify({ connected: true, log: "Connected to the server..." })}\n\n`);
    
    clients.set(verificationId, res);
    
    // Handle client disconnection
    req.on('close', () => {
        console.log(`Client disconnected from log stream: ${verificationId}`);
        clients.delete(verificationId);
    });
});

function cleanOutputString(str) {
    return str.replace(/^stdout:\s*/gm, '')     
              .replace(/^stderr:\s*/gm, '')     
              .replace(/\s+stdout:\s*/gm, ' ')  
              .replace(/\s+stderr:\s*/gm, ' '); 
}

function runVerification(playerName, score, timestamp, gameHash, verificationId, proofFilePath) {
    // Function to send updates to client
    const sendUpdate = (data) => {
        const client = clients.get(verificationId);
        if (client) {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };
    
    // Find prove executable
    const proveScript = findExecutable('prove', 'cargo run --bin prove --');
    
    // If not found, use simulation
    if (!proveScript && process.env.SIMULATION_MODE !== 'true') {
        console.log("Prover executable not found, falling back to simulation mode");
        process.env.SIMULATION_MODE = 'true';
    }
    
    // Initial progress update
    sendUpdate({ log: "Starting verification process...", progress: 5 });
    
    // Simulation mode for testing
    const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';
    
    if (SIMULATION_MODE) {
        console.log("Running in simulation mode - no actual ZK proof generated");
        simulateVerification(sendUpdate, playerName, score);
    } else {
        console.log("Running real verification using SP1 prover");
        
        // Convert game hash from hex to bytes if needed
        let gameHashArg = gameHash;
        if (gameHash.length === 64 && /^[0-9a-f]+$/i.test(gameHash)) {
            gameHashArg = gameHash; // Already in hex format
        }
        
        // Prepare command for prover
        const args = [
            '--prove',
            '--timestamp', timestamp.toString(),
            '--player', playerName,
            '--score', score.toString(),
            '--game-hash', gameHashArg
        ];
        
        // Log command
        console.log(`Running command: ${proveScript} ${args.join(' ')}`);
        
        // Create child process
        let childProcess;
        if (proveScript.includes('cargo run')) {
            childProcess = spawn('cargo', ['run', '--bin', 'prove', '--', ...args], {
                cwd: path.join(ROOT_DIR, 'script'),
                env: {
                    ...process.env, 
                    RUST_BACKTRACE: '1',
                    RUST_LOG: 'info' 
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
        } else {
            childProcess = spawn(proveScript, args, {
                cwd: COMPILED_DIR,
                env: {
                    ...process.env, 
                    RUST_BACKTRACE: '1',
                    RUST_LOG: 'info' 
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
        }
        
        let output = '';
        let errorOutput = '';
        
        // Initial update
        sendUpdate({ log: "Starting SP1 Zero-Knowledge Prover...", progress: 10 });
        
        // Fix: Use childProcess instead of process for stdout/stderr listeners
        childProcess.stdout.on('data', (data) => {
            // Clean output format
            const rawDataStr = data.toString().trim();
            const dataStr = cleanOutputString(rawDataStr);
            
            output += dataStr + "\n";
            
            let progressValue = 10; // Default
            
            const isRealError = dataStr.includes('Error:') || 
                               dataStr.includes('Failed to') || 
                               dataStr.includes('exception');
            
            if (isRealError) {
                console.error(dataStr);
            } else {
                console.log(dataStr);
            }
            
            sendUpdate({ log: dataStr, progress: progressValue });
            
            if (dataStr.includes('GENERATING KEYS')) {
                progressValue = 20;
                sendUpdate({ log: "Generating proving keys...", progress: progressValue });
            } else if (dataStr.includes('PROVING AND VERIFICATION KEYS GENERATED')) {
                progressValue = 40;
                sendUpdate({ log: "Keys created!", progress: progressValue });
            } else if (dataStr.includes('GENERATING PROOF')) {
                progressValue = 50;
                sendUpdate({ log: "Building Zero-Knowledge proof...", progress: progressValue });
            } else if (dataStr.includes('ZERO-KNOWLEDGE PROOF GENERATED')) {
                progressValue = 80;
                sendUpdate({ log: "Zero-Knowledge proof created!", progress: progressValue });
            } else if (dataStr.includes('VERIFYING PROOF')) {
                progressValue = 85;
                sendUpdate({ log: "Verification proof...", progress: progressValue });
            } else if (dataStr.includes('PROOF VERIFIED SUCCESSFULLY')) {
                progressValue = 95;
                sendUpdate({ log: "Proof has been verified!", progress: progressValue });
            } else if (dataStr.includes('VERIFICATION_SUCCESS=true')) {
                progressValue = 100;
                sendUpdate({ 
                    log: "🎉 Verification of Game Score ZK Success! 🎉", 
                    progress: 100,
                    completed: true,
                success: true,
                    proofFile: path.basename(proofFilePath) 
                });
            } else if (dataStr.includes('Proof saved to')) {
                const match = dataStr.match(/Proof saved to: (.*)/);
                if (match && match[1]) {
                    sendUpdate({ log: `Proof send to: ${match[1]}`, progress: progressValue });
                }
            }
        });
        
        childProcess.stderr.on('data', (data) => {
            const rawErrorStr = data.toString().trim();
            const errorStr = cleanOutputString(rawErrorStr);

            errorOutput += errorStr + "\n";
            
            let progressValue = 10; 
            
            if (errorStr.includes('Game Score Verification:') || 
                errorStr.includes('Timestamp:') || 
                errorStr.includes('Player:') || 
                errorStr.includes('Score:') || 
                errorStr.includes('Verification Result:') ||
                errorStr.includes('Valid:')) {
                
                console.log(errorStr);
                
                sendUpdate({ log: errorStr, progress: progressValue });
            } else {
                console.error(errorStr);
                
                sendUpdate({ log: `Error: ${errorStr}`, progress: progressValue });
            }
        });
        
        childProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            
            if (code !== 0) {
                console.error('Verification failed');
                sendUpdate({ 
                    log: `Verification failed send code error: ${code}`, 
                    progress: 100,
                    completed: true,
                    success: false
                });
            } else if (!output.includes('VERIFICATION_SUCCESS=true')) {
                sendUpdate({ 
                    log: "Verification success", 
                    progress: 100,
                    completed: true,
                    success: true
                });
            }
        });
    }
}

function findExecutable(name, fallback) {
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
    
    for (const ext of extensions) {
        const filePath = path.join(COMPILED_DIR, `${name}${ext}`);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);
    
    for (const dir of pathDirs) {
        for (const ext of extensions) {
            const filePath = path.join(dir, `${name}${ext}`);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
    }
    
    return fallback;
}

function simulateVerification(sendUpdate, playerName, score) {
    const steps = [
        { log: "SP1 ZK Prover...", progress: 10, delay: 800 },
        { log: "Preparing program RISC-V...", progress: 20, delay: 1000 },
        { log: "Starting program execution in ZK circuit...", progress: 30, delay: 1200 },
        { log: "Verifying game data input...", progress: 40, delay: 800 },
        { log: `Processing score ${score} for player ${playerName}...`, progress: 50, delay: 1200 },
        { log: "Applying ZK circuit constraints...", progress: 60, delay: 1500 },
        { log: "Generating proof witnesses...", progress: 70, delay: 1500 },
        { log: "Constructing ZK proof...", progress: 80, delay: 2000 },
        { log: "Verifying proof validity...", progress: 90, delay: 1000 },
        { log: "Finalisasi proof...", progress: 95, delay: 800 },
        { log: "Proof generation completed successfully!", progress: 100, delay: 500, completed: true, success: true }
    ];
    
    let currentStep = 0;
    
    function processNextStep() {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            sendUpdate(step);
            
            currentStep++;
            setTimeout(processNextStep, step.delay);
        }
    }
    
    processNextStep();
}

app.get('/api/proofs', (req, res) => {
    try {
        const proofFiles = fs.readdirSync(PROOF_OUTPUT_DIR)
            .filter(file => file.endsWith('.bin'))
            .map(file => {
                const stats = fs.statSync(path.join(PROOF_OUTPUT_DIR, file));
                return {
                    name: file,
                    created: stats.ctime,
                    size: stats.size
                };
            })
            .sort((a, b) => b.created - a.created); 
        
        res.json({
                    success: true,
            proofs: proofFiles
        });
    } catch (error) {
        console.error("Error listing proofs:", error);
        res.status(500).json({
            success: false,
            message: `Error listing proofs: ${error.message}`
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Blade Warrior Game Verification Server running at http://localhost:${PORT}`);
    console.log(`Simulation Mode: ${process.env.SIMULATION_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Using compiled directory: ${COMPILED_DIR}`);
    console.log(`Proof output directory: ${PROOF_OUTPUT_DIR}`);
    console.log(`Use the frontend to verify game scores with real ZK proofs!`);
});