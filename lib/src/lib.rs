use serde::{Serialize, Deserialize};
use alloy_sol_types::private::FixedBytes;

/// Struktur untuk data publik verifikasi skor game
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameScorePublicValues {
    pub timestamp: u64,
    pub player_name_hash: [u8; 32],
    pub score: u32,
    pub game_hash: [u8; 32],
    pub verified: u32,
}

/// ABI encoding untuk GameScorePublicValues
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

/// Verifikasi skor game
#[cfg(feature = "sp1-zkvm")]
pub fn verify_game_score(score: u32, max_score: u32) -> bool {
    // Verifikasi dasar bahwa skor valid (tidak melebihi batas)
    score <= max_score
}