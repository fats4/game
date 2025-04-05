use std::env;
use image_gen_script::verify_game_score;

fn main() {
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    // Check if we're in prove mode
    if args.len() > 1 && args[1] == "--prove" {
        let mut timestamp = 0;
        let mut player_name = String::new();
        let mut score = 0;
        let mut game_hash = String::new();
        
        // Tampilkan header dengan tema pink
        println!("\x1b[38;5;213m========================================\x1b[0m");
        println!("\x1b[38;5;213m    SP1 BLADE WARRIOR VERIFICATION     \x1b[0m");
        println!("\x1b[38;5;213m========================================\x1b[0m");
        
        // Parse arguments
        for i in 2..args.len() {
            if args[i] == "--timestamp" && i + 1 < args.len() {
                timestamp = args[i + 1].parse().unwrap_or_else(|e| {
                    eprintln!("\x1b[38;5;197mError parsing timestamp: {}\x1b[0m", e);
                    0
                });
            } else if args[i] == "--player" && i + 1 < args.len() {
                player_name = args[i + 1].clone();
            } else if args[i] == "--score" && i + 1 < args.len() {
                score = args[i + 1].parse().unwrap_or_else(|e| {
                    eprintln!("\x1b[38;5;197mError parsing score: {}\x1b[0m", e);
                    0
                });
            } else if args[i] == "--game-hash" && i + 1 < args.len() {
                game_hash = args[i + 1].clone();
            }
        }
        
        // Verify the game score
        let result = verify_game_score(timestamp, &player_name, score, &game_hash);
        
        if result {
            println!("\x1b[38;5;213m========================================\x1b[0m");
            println!("\x1b[38;5;213m    VERIFICATION RESULT: \x1b[38;5;46mSUCCESS    \x1b[0m");
            println!("\x1b[38;5;213m========================================\x1b[0m");
            // Tambahkan string khusus untuk deteksi keberhasilan
            println!("VERIFICATION_SUCCESS=true");
        } else {
            println!("\x1b[38;5;213m========================================\x1b[0m");
            println!("\x1b[38;5;213m    VERIFICATION RESULT: \x1b[38;5;197mFAILED     \x1b[0m");
            println!("\x1b[38;5;213m========================================\x1b[0m");
            // Tambahkan string khusus untuk deteksi kegagalan
            println!("VERIFICATION_SUCCESS=false");
        }
        
        // Exit with appropriate status code
        std::process::exit(if result { 0 } else { 1 });
    } else {
        println!("\x1b[38;5;213mUsage: cargo run --bin game_verify -- --prove --timestamp <timestamp> --player <name> --score <score> --game-hash <hash>\x1b[0m");
        std::process::exit(1);
    }
} 