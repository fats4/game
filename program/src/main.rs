//! SP1 proof program for the Blade Warrior Game

#![no_main]
sp1_zkvm::entrypoint!(main);

use game_lib::GameScorePublicValues;

pub fn main() {
    // Read input data
    let timestamp = sp1_zkvm::io::read::<u64>();
    let player_name = sp1_zkvm::io::read::<Vec<u8>>(); // Read player name as bytes
    let score = sp1_zkvm::io::read::<u32>();
    let game_hash_input = sp1_zkvm::io::read::<Vec<u8>>(); // Read game hash as bytes

    // Hash player name for privacy using manual SHA-256 hash
    // since sp1_zkvm::hash::sha256 is not available
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(&player_name);
    let player_name_hash: [u8; 32] = hasher.finalize().into();
    
    // Convert game_hash to [u8; 32]
    let mut game_hash = [0u8; 32];
    for (i, &byte) in game_hash_input.iter().enumerate().take(32) {
        game_hash[i] = byte;
    }
    
    // Constants
    const MAX_SCORE: u32 = 10000; 
    
    // Verify score
    let current_time = sp1_zkvm::io::read::<u64>(); // Current timestamp
    
    // Verify timestamp (not more than 1 hour difference)
    let time_diff = if current_time > timestamp {
        current_time - timestamp
    } else {
        timestamp - current_time
    };
    
    let timestamp_valid = time_diff <= 3600;
    
    // Verify score doesn't exceed limit
    let score_valid = score <= MAX_SCORE;
    
    // Verify game hash is valid (must be 32 bytes)
    let hash_valid = game_hash_input.len() == 32;
    
    // Overall verification result
    let verified = (timestamp_valid && score_valid && hash_valid) as u32;
    
    // Debug output with consistent formatting
    // (all output in one block to prevent stdout/stderr separation)
    println!("===== GAME SCORE VERIFICATION REPORT =====");
    println!("Timestamp: {}", timestamp);
    println!("Timestamp Valid: {}", timestamp_valid);
    println!("Player: [HASHED]");
    println!("Score: {}", score);
    println!("Score Valid: {}", score_valid);
    println!("Hash Valid: {}", hash_valid);
    println!("Verification Status: {}", if verified == 1 { "SUCCESS" } else { "FAILED" });
    println!("=========================================");
    
    // Create public values
    let public_values = GameScorePublicValues {
        timestamp,
        player_name_hash,
        score,
        game_hash,
        verified,
    };
    
    // Encode results for output
    let encoded = game_lib::abi::encode(public_values);
    sp1_zkvm::io::commit_slice(&encoded);
}