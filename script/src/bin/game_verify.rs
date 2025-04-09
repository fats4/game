use game_verification_script::verify_game_score;
use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(long)]
    prove: bool,

    #[arg(long, default_value = "0")]
    timestamp: u64,

    #[arg(long, default_value = "Anonymous")]
    player: String,

    #[arg(long, default_value = "0")]
    score: u32,

    #[arg(long, default_value = "0000000000000000000000000000000000000000000000000000000000000000")]
    game_hash: String,
}

fn main() {
    // Setup logger
    sp1_sdk::utils::setup_logger();

    // Parse command line arguments
    let args = Args::parse();
    
    // Display header with pink theme
    println!("\x1b[38;5;213m========================================\x1b[0m");
    println!("\x1b[38;5;213m    SP1 BLADE WARRIOR VERIFICATION     \x1b[0m");
    println!("\x1b[38;5;213m========================================\x1b[0m");
    
    let result = verify_game_score(
        args.timestamp,
        &args.player,
        args.score,
        &args.game_hash
    );
    
    if result {
        println!("\x1b[38;5;213m========================================\x1b[0m");
        println!("\x1b[38;5;213m    VERIFICATION RESULT: \x1b[38;5;46mSUCCESS    \x1b[0m");
        println!("\x1b[38;5;213m========================================\x1b[0m");
        println!("VERIFICATION_SUCCESS=true");
    } else {
        println!("\x1b[38;5;213m========================================\x1b[0m");
        println!("\x1b[38;5;213m    VERIFICATION RESULT: \x1b[38;5;197mFAILED     \x1b[0m");
        println!("\x1b[38;5;213m========================================\x1b[0m");
        println!("VERIFICATION_SUCCESS=false");
    }
    
    // Exit with appropriate status code
    std::process::exit(if result { 0 } else { 1 });
} 