use std::env;
use sp1_sdk::{include_elf, ProverClient};
use serde_json;

/// RISC-V ELF file for the Image Generator program.
pub const GAME_VERIFICATION_ELF: &[u8] = include_elf!("game_verification_program");
pub const GAME_SCORE_ELF: &[u8] = include_elf!("game_score_program");

fn main() {
    // Setup logger
    sp1_sdk::utils::setup_logger();

    // Parse command line arguments untuk menentukan program mana yang digunakan
    let args: Vec<String> = env::args().collect();
    let program_name = if args.len() > 1 { &args[1] } else { "game_score" };

    // Pilih program ELF berdasarkan argumen
    let elf = match program_name {
        "verification" => GAME_VERIFICATION_ELF,
        _ => GAME_SCORE_ELF,
    };

    // Buat client SP1
    let client = ProverClient::from_env();

    // Setup program dan simpan verification key
    println!("Generating verification key for {}...", program_name);
    let (_, vk) = client.setup(elf);
    
    // Simpan vk ke file - gunakan to_json() dan fs::write() karena save() tidak tersedia
    let vk_path = format!("{}_vkey.json", program_name);
    let vk_json = serde_json::to_string_pretty(&vk).expect("Failed to serialize verification key");
    std::fs::write(&vk_path, vk_json).expect("Failed to save verification key");
    println!("Verification key saved to: {}", vk_path);
}