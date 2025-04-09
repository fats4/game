//! SP1 proof program untuk verifikasi skor game.

#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_sol_types::private::FixedBytes;

/// Struktur untuk data publik verifikasi skor game
#[derive(Debug, Clone)]
pub struct GameScorePublicValues {
    pub timestamp: u64,
    pub player_name_hash: [u8; 32],
    pub score: u32,
    pub game_hash: [u8; 32],
    pub verified: u32,
}

/// Implementasi encoding ABI untuk GameScorePublicValues
pub mod abi {
    use super::*;
    use alloy_sol_types::{sol, SolType};

    sol! {
        struct GameScoreData {
            uint64 timestamp;
            bytes32 playerNameHash;
            uint32 score;
            bytes32 gameHash;
            uint32 verified;
        }
    }

    impl From<GameScorePublicValues> for GameScoreData {
        fn from(value: GameScorePublicValues) -> Self {
            Self {
                timestamp: value.timestamp,
                playerNameHash: FixedBytes(value.player_name_hash),
                score: value.score,
                gameHash: FixedBytes(value.game_hash),
                verified: value.verified,
            }
        }
    }

    pub fn encode(values: GameScorePublicValues) -> Vec<u8> {
        GameScoreData::abi_encode(&GameScoreData::from(values))
    }
}

pub fn main() {
    // Baca input data dari SP1 VM
    let timestamp = sp1_zkvm::io::read::<u64>();
    let player_name = sp1_zkvm::io::read::<Vec<u8>>(); // Membaca nama pemain sebagai bytes
    let score = sp1_zkvm::io::read::<u32>();
    let game_hash_input = sp1_zkvm::io::read::<Vec<u8>>(); // Membaca hash game sebagai bytes

    // Hash nama pemain untuk privasi menggunakan hash SHA-256 manual
    // karena sp1_zkvm::hash::sha256 tidak tersedia
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(&player_name);
    let player_name_hash: [u8; 32] = hasher.finalize().into();
    
    // Konversi game_hash ke [u8; 32]
    let mut game_hash = [0u8; 32];
    for (i, &byte) in game_hash_input.iter().enumerate().take(32) {
        game_hash[i] = byte;
    }

    // Konstanta
    const MAX_SCORE: u32 = 10000; 

    // Verifikasi skor
    let current_time = sp1_zkvm::io::read::<u64>(); // Timestamp saat ini
    
    // Verifikasi timestamp (tidak lebih dari 1 jam perbedaan)
    let time_diff = if current_time > timestamp {
        current_time - timestamp
    } else {
        timestamp - current_time
    };
    
    let timestamp_valid = time_diff <= 3600;
    
    // Verifikasi skor tidak melebihi batas
    let score_valid = score <= MAX_SCORE;
    
    // Verifikasi game hash valid (harus 32 bytes)
    let hash_valid = game_hash_input.len() == 32;
    
    // Hasil verifikasi keseluruhan
    let verified = (timestamp_valid && score_valid && hash_valid) as u32;

    // Debug output
    println!("Game Score Verification:");
    println!("Timestamp: {}", timestamp);
    println!("Player: [HASHED]");
    println!("Score: {}", score);
    println!("Timestamp Valid: {}", timestamp_valid);
    println!("Score Valid: {}", score_valid);
    println!("Hash Valid: {}", hash_valid);
    println!("Verification Result: {}", if verified == 1 { "SUCCESS" } else { "FAILED" });
    
    // Buat public values
    let public_values = GameScorePublicValues {
        timestamp,
        player_name_hash,
        score,
        game_hash,
        verified,
    };
    
    // Encode hasil untuk output - perhatikan perubahan di sini
    let encoded = abi::encode(public_values);
    sp1_zkvm::io::commit_slice(&encoded);
} 