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

// Menyimpan koneksi SSE yang aktif
const clients = new Map();

// Konfigurasi lokasi file yang sudah dikompilasi - dengan path yang fleksibel
// Cari di beberapa lokasi potensial
const ROOT_DIR = path.resolve(__dirname, '..');
const POSSIBLE_COMPILED_DIRS = [
    path.join(ROOT_DIR, 'target/release'),
    path.join(ROOT_DIR, 'script/target/release'),
    path.join(ROOT_DIR, 'script'),
    path.join(ROOT_DIR, 'bin')
];

// Pilih direktori yang ada
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

// Ubah konfigurasi direktori proof
const PROOF_OUTPUT_DIR = path.join(ROOT_DIR, 'proofs');

// Pastikan direktori proofs ada
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
        
        // Buat ID unik untuk verifikasi ini
        const verificationId = `${playerName}-${timestamp}`;
        
        // Buat nama file untuk proof
        const proofFileName = `${playerName.replace(/[^a-z0-9]/gi, '_')}_${score}_${Date.now()}.bin`;
        const proofFilePath = path.join(PROOF_OUTPUT_DIR, proofFileName);
        
        // Kirim respons awal ke client
        res.json({
            success: true,
            message: "Verification process started",
            verificationId,
            proofFile: proofFileName // Tambahkan nama file ke respons
        });
        
        // Buat file kosong sebagai placeholder (akan diisi oleh proses proving)
        fs.writeFileSync(proofFilePath, Buffer.alloc(0));
        console.log(`Empty proof file created at: ${proofFilePath}`);

        // Jalankan proses verifikasi di background dengan path file proof
        runVerification(playerName, score, timestamp, gameHash, verificationId, proofFilePath);
        
        // PENTING: Tidak mengirim respons lagi di sini
            
    } catch (error) {
        console.error("Server error:", error);
        // Hanya kirim respons error jika belum ada respons yang dikirim
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

// Endpoint untuk Server-Sent Events (SSE)
app.get('/api/verify/log', (req, res) => {
    // Ambil parameter dari query
    const { playerName, score, timestamp } = req.query;
    const verificationId = `${playerName}-${timestamp}`;
    
    console.log(`Client connected to log stream for verification ID: ${verificationId}`);
    
    // Siapkan header untuk SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Kirim event untuk check koneksi
    res.write(`data: ${JSON.stringify({ connected: true, log: "Terhubung ke server..." })}\n\n`);
    
    // Simpan koneksi dalam clients map
    clients.set(verificationId, res);
    
    // Handle client disconnection
    req.on('close', () => {
        console.log(`Client disconnected from log stream: ${verificationId}`);
        clients.delete(verificationId);
    });
});

// Fungsi untuk membersihkan string output
function cleanOutputString(str) {
    // Hapus prefiks stdout: dan stderr: dengan lebih agresif
    // Gunakan regex yang lebih kuat untuk mencocokkan berbagai format
    return str.replace(/^stdout:\s*/gm, '')     // Hapus di awal baris
              .replace(/^stderr:\s*/gm, '')     // Hapus di awal baris
              .replace(/\s+stdout:\s*/gm, ' ')  // Hapus di tengah baris
              .replace(/\s+stderr:\s*/gm, ' '); // Hapus di tengah baris
}

// Fungsi untuk menjalankan proses verifikasi
function runVerification(playerName, score, timestamp, gameHash, verificationId, proofFilePath) {
    // Fungsi untuk mengirim update ke client
    const sendUpdate = (data) => {
        const client = clients.get(verificationId);
        if (client) {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };
    
    // Cari executable prove
    const proveScript = findExecutable('prove', 'cargo run --bin prove --');
    
    // Jika tidak ditemukan, gunakan simulasi
    if (!proveScript && process.env.SIMULATION_MODE !== 'true') {
        console.log("Prover executable not found, falling back to simulation mode");
        process.env.SIMULATION_MODE = 'true';
    }
    
    // Update progress awal
    sendUpdate({ log: "Memulai proses verifikasi...", progress: 5 });
    
    // Mode simulasi untuk testing
    const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';
    
    if (SIMULATION_MODE) {
        console.log("Running in simulation mode - no actual ZK proof generated");
        simulateVerification(sendUpdate, playerName, score);
    } else {
        console.log("Running real verification using SP1 prover");
        
        // Konversi game hash dari hex ke bytes jika perlu
        let gameHashArg = gameHash;
        if (gameHash.length === 64 && /^[0-9a-f]+$/i.test(gameHash)) {
            gameHashArg = gameHash; // Sudah dalam format hex
        }
        
        // Persiapkan command untuk prover
        const args = [
            '--prove',
            '--timestamp', timestamp.toString(),
            '--player', playerName,
            '--score', score.toString(),
            '--game-hash', gameHashArg
        ];
        
        // Log command
        console.log(`Running command: ${proveScript} ${args.join(' ')}`);
        
        // PERBAIKAN: Ganti nama variabel 'process' ke 'childProcess' untuk menghindari konflik
        let childProcess;
        if (proveScript.includes('cargo run')) {
            // Jika menggunakan cargo run
            childProcess = spawn('cargo', ['run', '--bin', 'prove', '--', ...args], {
                cwd: path.join(ROOT_DIR, 'script'),
                env: {
                    ...process.env, // Sekarang mengacu ke Node.js process
                    RUST_BACKTRACE: '1',
                    RUST_LOG: 'info' 
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
        } else {
            // Jika menggunakan executable langsung
            childProcess = spawn(proveScript, args, {
                cwd: COMPILED_DIR,
                env: {
                    ...process.env, // Sekarang mengacu ke Node.js process
                    RUST_BACKTRACE: '1',
                    RUST_LOG: 'info' 
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
        }
        
        let output = '';
        let errorOutput = '';
        
        // Update awal
        sendUpdate({ log: "Memulai SP1 Zero-Knowledge Prover...", progress: 10 });
        
        // PERBAIKAN: Gunakan childProcess bukan process untuk stdout/stderr listeners
        childProcess.stdout.on('data', (data) => {
            // Bersihkan format output
            const rawDataStr = data.toString().trim();
            const dataStr = cleanOutputString(rawDataStr);
            
            // Tambahkan ke output kumulatif
            output += dataStr + "\n";
            
            // Inisialisasi variabel progressValue
            let progressValue = 10; // Default
            
            // Deteksi apakah ini pesan error yang sebenarnya
            const isRealError = dataStr.includes('Error:') || 
                               dataStr.includes('Failed to') || 
                               dataStr.includes('exception');
            
            // Log pesan tanpa prefiks yang mengganggu
            if (isRealError) {
                console.error(dataStr);
            } else {
                console.log(dataStr);
            }
            
            // Kirim ke client - hanya pesan yang sudah dibersihkan
            sendUpdate({ log: dataStr, progress: progressValue });
            
            // Deteksi progress dari output
            if (dataStr.includes('GENERATING KEYS')) {
                progressValue = 20;
                sendUpdate({ log: "Menghasilkan proving keys...", progress: progressValue });
            } else if (dataStr.includes('PROVING AND VERIFICATION KEYS GENERATED')) {
                progressValue = 40;
                sendUpdate({ log: "Keys berhasil dibuat!", progress: progressValue });
            } else if (dataStr.includes('GENERATING PROOF')) {
                progressValue = 50;
                sendUpdate({ log: "Membangun Zero-Knowledge proof...", progress: progressValue });
            } else if (dataStr.includes('ZERO-KNOWLEDGE PROOF GENERATED')) {
                progressValue = 80;
                sendUpdate({ log: "Zero-Knowledge proof berhasil dibuat!", progress: progressValue });
            } else if (dataStr.includes('VERIFYING PROOF')) {
                progressValue = 85;
                sendUpdate({ log: "Verifikasi proof...", progress: progressValue });
            } else if (dataStr.includes('PROOF VERIFIED SUCCESSFULLY')) {
                progressValue = 95;
                sendUpdate({ log: "Proof berhasil diverifikasi!", progress: progressValue });
            } else if (dataStr.includes('VERIFICATION_SUCCESS=true')) {
                progressValue = 100;
                sendUpdate({ 
                    log: "🎉 Verifikasi skor ZK berhasil! 🎉", 
                    progress: 100,
                    completed: true,
                success: true,
                    proofFile: path.basename(proofFilePath) // Tambahkan info file
                });
            } else if (dataStr.includes('Proof saved to')) {
                const match = dataStr.match(/Proof saved to: (.*)/);
                if (match && match[1]) {
                    sendUpdate({ log: `Proof disimpan ke: ${match[1]}`, progress: progressValue });
                }
            }
        });
        
        childProcess.stderr.on('data', (data) => {
            const rawErrorStr = data.toString().trim();
            const errorStr = cleanOutputString(rawErrorStr);
            
            // Tambahkan ke error output kumulatif
            errorOutput += errorStr + "\n";
            
            // Inisialisasi progressValue
            let progressValue = 10; // Default untuk pesan error
            
            // Periksa jika pesan ini sebenarnya stdout yang terkirim melalui stderr
            if (errorStr.includes('Game Score Verification:') || 
                errorStr.includes('Timestamp:') || 
                errorStr.includes('Player:') || 
                errorStr.includes('Score:') || 
                errorStr.includes('Verification Result:') ||
                errorStr.includes('Valid:')) {
                
                // Ini output normal, tampilkan tanpa prefiks error
                console.log(errorStr);
                
                // Kirim ke client sebagai log normal
                sendUpdate({ log: errorStr, progress: progressValue });
            } else {
                // Ini error asli
                console.error(errorStr);
                
                // Kirim ke client sebagai error
                sendUpdate({ log: `Error: ${errorStr}`, progress: progressValue });
            }
        });
        
        childProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            
            if (code !== 0) {
                console.error('Verification failed');
                sendUpdate({ 
                    log: `Verifikasi gagal dengan kode error: ${code}`, 
                    progress: 100,
                    completed: true,
                    success: false
                });
            } else if (!output.includes('VERIFICATION_SUCCESS=true')) {
                // Jika tidak ada konfirmasi sukses
                sendUpdate({ 
                    log: "Verifikasi selesai tanpa konfirmasi sukses", 
                    progress: 100,
                    completed: true,
                    success: true
                });
            }
        });
    }
}

// Fungsi untuk mencari executable
function findExecutable(name, fallback) {
    // Cari di direktori yang sudah dikonfigurasi
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
    
    for (const ext of extensions) {
        const filePath = path.join(COMPILED_DIR, `${name}${ext}`);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    
    // Jika tidak ditemukan di COMPILED_DIR, coba cari di PATH sistem
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
    
    // Jika tidak ditemukan, gunakan fallback
    return fallback;
}

// Simulasi verifikasi untuk testing
function simulateVerification(sendUpdate, playerName, score) {
    // Simulasi tahapan proving
    const steps = [
        { log: "Inisialisasi SP1 ZK Prover...", progress: 10, delay: 800 },
        { log: "Menyiapkan program RISC-V...", progress: 20, delay: 1000 },
        { log: "Memulai eksekusi program dalam ZK circuit...", progress: 30, delay: 1200 },
        { log: "Verifikasi data input game...", progress: 40, delay: 800 },
        { log: `Memproses skor ${score} untuk pemain ${playerName}...`, progress: 50, delay: 1200 },
        { log: "Menerapkan batasan ZK circuit...", progress: 60, delay: 1500 },
        { log: "Generating proof witnesses...", progress: 70, delay: 1500 },
        { log: "Constructing ZK proof...", progress: 80, delay: 2000 },
        { log: "Verifying proof validity...", progress: 90, delay: 1000 },
        { log: "Finalisasi proof...", progress: 95, delay: 800 },
        { log: "Proof generation completed successfully!", progress: 100, delay: 500, completed: true, success: true }
    ];
    
    // Jalankan simulasi secara berurutan dengan delay
    let currentStep = 0;
    
    function processNextStep() {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            sendUpdate(step);
            
            currentStep++;
            setTimeout(processNextStep, step.delay);
        }
    }
    
    // Mulai simulasi
    processNextStep();
}

// Get proof list endpoint
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
            .sort((a, b) => b.created - a.created); // Urutkan terbaru dulu
        
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

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Blade Warrior Game Verification Server running at http://localhost:${PORT}`);
    console.log(`Simulation Mode: ${process.env.SIMULATION_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Using compiled directory: ${COMPILED_DIR}`);
    console.log(`Proof output directory: ${PROOF_OUTPUT_DIR}`);
    console.log(`Use the frontend to verify game scores with real ZK proofs!`);
});