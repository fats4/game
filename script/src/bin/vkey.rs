use sp1_sdk::{include_elf, HashableKey, ProverClient};

/// RISC-V ELF file for the Image Generator program.
pub const IMAGE_GEN_ELF: &[u8] = include_elf!("image_gen_program");

fn main() {
    // Setup prover client
    let client = ProverClient::from_env();
    
    // Get verification key for the program
    let (_, vk) = client.setup(IMAGE_GEN_ELF);
    
    // Print verification key
    println!("Program VKey: {}", vk.bytes32());
}