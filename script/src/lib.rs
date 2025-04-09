use std::time::{SystemTime, UNIX_EPOCH};
use sp1_sdk::{SP1Stdin, ProverClient, include_elf};
use sha2::{Sha256, Digest};

/// RISC-V ELF file for game score verification program
pub const GAME_SCORE_ELF: &[u8] = include_elf!("game_score_program");
pub const GAME_VERIFICATION_ELF: &[u8] = include_elf!("game_verification_program");

#[derive(Debug)]
pub struct GameVerificationResult {
    pub success: bool,
    pub timestamp: u64,
    pub player_name: String,
    pub score: u32,
    pub game_hash: String,
    pub proof_hash: String,
}

/// Verify game score using SP1
pub fn verify_game_score(timestamp: u64, player_name: &str, score: u32, game_hash: &str) -> bool {
    // Output verification information with color
    println!("\x1b[38;5;213m=== SP1 GAME SCORE VERIFICATION ===\x1b[0m");
    println!("\x1b[38;5;213mINITIALIZING VERIFICATION PROTOCOL...\x1b[0m");
    println!("\x1b[38;5;213mAGENT: {}\x1b[0m", player_name);
    println!("\x1b[38;5;213mMISSION SCORE: {}\x1b[0m", score);
    println!("\x1b[38;5;213mTIMESTAMP: {}\x1b[0m", timestamp);
    println!("\x1b[38;5;213mMISSION DATA HASH: {}\x1b[0m", game_hash);
    
    // Verify timestamp (not too far in the past or future)
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    println!("\x1b[38;5;213mCURRENT TIME: {}\x1b[0m", current_time);
    
    let time_diff = if current_time > timestamp {
        current_time - timestamp
    } else {
        timestamp - current_time
    };
    
    println!("\x1b[38;5;213mTIME DIFFERENCE: {} SECONDS\x1b[0m", time_diff);
    
    // Timestamp cannot be more than 1 hour different
    if time_diff > 3600 {
        println!("\x1b[38;5;197mTIMESTAMP VERIFICATION FAILED: TOO FAR FROM CURRENT TIME\x1b[0m");
        println!("\x1b[38;5;197mSECURITY PROTOCOL VIOLATED\x1b[0m");
        return false;
    }
    println!("\x1b[38;5;46m[SUCCESS] TIMESTAMP VERIFICATION PASSED\x1b[0m");
    
    // Verify score (example: maximum valid score is 10000)
    if score > 10000 {
        println!("\x1b[38;5;197mSCORE VERIFICATION FAILED: SCORE ANOMALY DETECTED\x1b[0m");
        println!("\x1b[38;5;197mSECURITY PROTOCOL VIOLATED\x1b[0m");
        return false;
    }
    println!("\x1b[38;5;46m[SUCCESS] SCORE VERIFICATION PASSED\x1b[0m");
    
    // Verify game hash (must be 64 characters long)
    if game_hash.len() != 64 {
        println!("\x1b[38;5;197mGAME HASH VERIFICATION FAILED: INVALID HASH LENGTH\x1b[0m");
        println!("\x1b[38;5;197mSECURITY PROTOCOL VIOLATED\x1b[0m");
        return false;
    }
    println!("\x1b[38;5;46m[SUCCESS] GAME HASH VERIFICATION PASSED\x1b[0m");
    
    // Run actual SP1 verification
    println!("\x1b[38;5;213mINITIALIZING SP1 VERIFICATION...\x1b[0m");
    
    // Prepare SP1 client - from_env() does not return Result, so no need to match
    let client = ProverClient::from_env();
    println!("\x1b[38;5;46m[SUCCESS] SP1 CLIENT INITIALIZED\x1b[0m");
    
    // Prepare SP1 program input
    let mut stdin = SP1Stdin::new();
    
    // Write input to SP1 program
    stdin.write(&timestamp);
    
    // Convert player_name to bytes
    let player_name_bytes = player_name.as_bytes().to_vec();
    stdin.write(&player_name_bytes);
    
    // Write score
    stdin.write(&score);
    
    // Convert game_hash hex to bytes
    let game_hash_bytes = match hex::decode(game_hash) {
        Ok(bytes) => bytes,
        Err(e) => {
            println!("\x1b[38;5;197mFailed to decode game hash: {}\x1b[0m", e);
            return false;
        }
    };
    stdin.write(&game_hash_bytes);
    
    // Write current time to SP1 program for verification
    stdin.write(&current_time);
    
    println!("\x1b[38;5;213mCOMPUTING WITNESS...\x1b[0m");
    
    // Run program and generate proof (setup does not return Result)
    println!("\x1b[38;5;213mGENERATING KEYS...\x1b[0m");
    let (pk, vk) = client.setup(GAME_SCORE_ELF);
    println!("\x1b[38;5;46m[SUCCESS] PROVING AND VERIFICATION KEYS GENERATED\x1b[0m");

    println!("\x1b[38;5;213mGENERATING PROOF...\x1b[0m");
    // prove().run() returns Result
    let proof = match client.prove(&pk, &stdin).run() {
        Ok(proof) => proof,
        Err(e) => {
            println!("\x1b[38;5;197mFailed to generate proof: {}\x1b[0m", e);
            return false;
        }
    };
    println!("\x1b[38;5;46m[SUCCESS] ZERO-KNOWLEDGE PROOF GENERATED\x1b[0m");

    println!("\x1b[38;5;213mVERIFYING PROOF...\x1b[0m");
    // verify requires SP1ProofWithPublicValues, not Result
    if let Err(e) = client.verify(&proof, &vk) {
        println!("\x1b[38;5;197mProof verification failed: {}\x1b[0m", e);
        return false;
    }
    println!("\x1b[38;5;46m[SUCCESS] PROOF VERIFIED SUCCESSFULLY\x1b[0m");

    // save also available in SP1ProofWithPublicValues, not Result
    let proof_path = format!("game_score_proof_{}.bin", timestamp);
    if let Err(e) = proof.save(&proof_path) {
        println!("\x1b[38;5;197mWarning: Failed to save proof: {}\x1b[0m", e);
    } else {
        println!("\x1b[38;5;46mProof saved to: {}\x1b[0m", proof_path);
    }
    true
}

/// Helper function to generate game hash from game data
pub fn generate_game_hash(player_name: &str, score: u32, timestamp: u64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(player_name.as_bytes());
    hasher.update(&score.to_le_bytes());
    hasher.update(&timestamp.to_le_bytes());
    
    let result = hasher.finalize();
    hex::encode(result)
} 