//! SP1 proof program for the Focus app.

#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_sol_types::{SolType, private::FixedBytes};
use image_gen_lib::{verify_image_generation, PublicValuesStruct};

pub fn main() {
    // Baca input data
    let timestamp = sp1_zkvm::io::read::<u32>();
    let image_size = sp1_zkvm::io::read::<u32>();
    let width = sp1_zkvm::io::read::<u32>();
    let height = sp1_zkvm::io::read::<u32>(); 
    let image_hash = sp1_zkvm::io::read::<[u8; 32]>();
    
    // Konstanta
    const MAX_IMAGE_SIZE: u32 = 10 * 1024 * 1024; // 10MB
    
    // Verifikasi
    let is_valid = verify_image_generation(
        image_size,
        width,
        height,
        MAX_IMAGE_SIZE
    );
    
    // Buat public values
    let public_values = PublicValuesStruct {
        timestamp,
        imageSize: image_size,
        width,
        height,
        imageHash: FixedBytes(image_hash),
        verified: if is_valid { 1 } else { 0 }
    };
    
    // Debug output
    println!("Image Generation Verification:");
    println!("Timestamp: {}", timestamp);
    println!("Size: {} bytes", image_size);
    println!("Dimensions: {}x{}", width, height);
    println!("Verification Result: {}", if is_valid { "SUCCESS" } else { "FAILED" });
    
    // Encode hasil
    let bytes = PublicValuesStruct::abi_encode(&public_values);
    sp1_zkvm::io::commit_slice(&bytes);
}