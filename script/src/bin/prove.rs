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
    /// Mode eksekusi program tanpa bukti
    #[arg(long)]
    execute: bool,

    /// Mode pembuatan bukti ZK
    #[arg(long)]
    prove: bool,

    /// Timestamp dari permainan
    #[arg(long, default_value = "0")]
    timestamp: u64,

    /// Nama pemain
    #[arg(long, default_value = "TestPlayer")]
    player: String,

    /// Skor permainan
    #[arg(long, default_value = "0")]
    score: u32,

    /// Hash data permainan
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
    let elf = GAME_SCORE_ELF; // Gunakan program skor game

    println!("=== GAME SCORE VERIFICATION ===");
    
    // Setup program
    println!("Setting up SP1 program...");
    let (pk, vk) = client.setup(elf);

    // Siapkan input untuk program
    let mut stdin = SP1Stdin::new();
    
    // Gunakan timestamp dari argumen atau timestamp saat ini
    let timestamp = if args.timestamp == 0 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    } else {
        args.timestamp
    };
    
    // Tulis input ke program
    stdin.write(&timestamp);
    stdin.write(&args.player.as_bytes().to_vec());
    stdin.write(&args.score);
    
    // Decode game hash hex ke bytes
    let game_hash_bytes = match hex::decode(&args.game_hash) {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error decoding game hash: {}", e);
            std::process::exit(1);
        }
    };
    stdin.write(&game_hash_bytes);
    
    // Gunakan timestamp saat ini untuk verifikasi
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

        // Tampilkan hasil verifikasi dengan format yang konsisten
        println!("===== GAME SCORE VERIFICATION REPORT =====");
        println!("Public Values: {:?}", public_values);
        println!("Instructions: {}", report.total_instruction_count());
        println!("=========================================");
    } else {
        // Generate proof dengan output yang lebih bersih
        println!("Generating proof...");
        let proof = match client.prove(&pk, &stdin).run() {
            Ok(proof) => proof,
            Err(e) => {
                println!("Failed to generate proof: {}", e);
                std::process::exit(1);
            }
        };
        println!("Proof generated successfully!");
        
        // Verifikasi proof
        println!("Verifying proof...");
        if let Err(e) = client.verify(&proof, &vk) {
            eprintln!("Failed to verify proof: {}", e);
            std::process::exit(1);
        }
        println!("Proof verified successfully!");
        
        // Simpan proof
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