use sp1_sdk::{SP1Stdin, ProverClient, include_elf};
use std::time::{SystemTime, UNIX_EPOCH};
use clap::Parser;
use hex;

/// RISC-V ELF file for the Image Generator program.
pub const GAME_VERIFICATION_ELF: &[u8] = include_elf!("game_verification_program");
pub const GAME_SCORE_ELF: &[u8] = include_elf!("game_score_program");

/// Command line arguments
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Execute program without generating proof
    #[arg(long)]
    execute: bool,

    /// Generate ZK proof
    #[arg(long)]
    prove: bool,

    /// Game timestamp
    #[arg(long, default_value = "0")]
    timestamp: u64,

    /// Player name
    #[arg(long, default_value = "TestPlayer")]
    player: String,

    /// Game score
    #[arg(long, default_value = "0")]
    score: u32,

    /// Game data hash
    #[arg(long, default_value = "0000000000000000000000000000000000000000000000000000000000000000")]
    game_hash: String,
}

fn main() {
    // Setup logger
    sp1_sdk::utils::setup_logger();
    dotenv::dotenv().ok();

    // Parse command line arguments
    let args = Args::parse();

    if args.execute == args.prove {
        eprintln!("Error: You must specify either --execute or --prove");
        std::process::exit(1);
    }

    // Setup prover client
    let client = ProverClient::from_env();
    let elf = GAME_SCORE_ELF; 

    println!("=== GAME SCORE VERIFICATION ===");
    
    // Setup program
    println!("Setting up SP1 program...");
    let (pk, vk) = client.setup(elf);

    // Prepare program input
    let mut stdin = SP1Stdin::new();
    
    // Use timestamp from argument or current time
    let timestamp = if args.timestamp == 0 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    } else {
        args.timestamp
    };
    
    // Write input to program
    stdin.write(&timestamp);
    stdin.write(&args.player.as_bytes().to_vec());
    stdin.write(&args.score);
    
    // Decode game hash hex to bytes
    let game_hash_bytes = match hex::decode(&args.game_hash) {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error decoding game hash: {}", e);
            std::process::exit(1);
        }
    };
    stdin.write(&game_hash_bytes);
    
    // Use current time for verification
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    stdin.write(&current_time);
    
    if args.execute {
        // Run program without generating proof
        let (public_values, report) = match client.execute(elf, &stdin).run() {
            Ok(result) => result,
            Err(e) => {
                println!("Error executing program: {}", e);
                std::process::exit(1);
            }
        };
        println!("Program executed successfully.");

        // Display verification result with consistent format
        println!("===== GAME SCORE VERIFICATION REPORT =====");
        println!("Public Values: {:?}", public_values);
        println!("Instructions: {}", report.total_instruction_count());
        println!("=========================================");
    } else {
        // Generate proof with cleaner output
        println!("Generating proof...");
        let proof = match client.prove(&pk, &stdin).run() {
            Ok(proof) => proof,
            Err(e) => {
                println!("Failed to generate proof: {}", e);
                std::process::exit(1);
            }
        };
        println!("Proof generated successfully!");
        
        // Verify proof
        println!("Verifying proof...");
        if let Err(e) = client.verify(&proof, &vk) {
            eprintln!("Failed to verify proof: {}", e);
            std::process::exit(1);
        }
        println!("Proof verified successfully!");
        
        // Save proof
        let proof_path = format!("game_score_proof_{}.bin", args.timestamp);
        if let Err(e) = proof.save(&proof_path) {
            eprintln!("Failed to save proof: {}", e);
            std::process::exit(1);
        }
        println!("Proof saved to: {}", proof_path);
        
        println!("VERIFICATION_SUCCESS=true");
        println!("=== VERIFICATION COMPLETED SUCCESSFULLY ===");
    }
}