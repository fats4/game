use alloy_sol_types::SolType;
use clap::Parser;
use image_gen_lib::PublicValuesStruct;
use sp1_sdk::{include_elf, ProverClient, SP1Stdin};

/// RISC-V ELF file for the Image Generator program.
pub const IMAGE_GEN_ELF: &[u8] = include_elf!("image_gen_program");

/// Command line arguments
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    #[clap(long)]
    execute: bool,

    #[clap(long)]
    prove: bool,

    #[clap(long, default_value = "0")]
    timestamp: u32,

    #[clap(long, default_value = "0")]
    image_size: u32,

    #[clap(long, default_value = "0")]
    width: u32,

    #[clap(long, default_value = "0")]
    height: u32,

    #[clap(long, default_value = "0000000000000000000000000000000000000000000000000000000000000000")]
    image_hash: String,
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

    // Parse image hash
    let image_hash_bytes: [u8; 32] = hex::decode(&args.image_hash)
        .expect("Invalid image hash hex string")
        .try_into()
        .expect("Invalid image hash length");

    // Prepare inputs
    let mut stdin = SP1Stdin::new();
    stdin.write(&args.timestamp);
    stdin.write(&args.image_size);
    stdin.write(&args.width);
    stdin.write(&args.height);
    stdin.write(&image_hash_bytes);

    if args.execute {
        // Run program without generating proof
        let (output, report) = client.execute(IMAGE_GEN_ELF, &stdin).run().unwrap();
        println!("Program executed successfully.");

        // Read output
        let decoded = PublicValuesStruct::abi_decode(output.as_slice(), true).unwrap();
        println!("Image Generation Result:");
        println!("Timestamp: {}", decoded.timestamp);
        println!("Image Size: {} bytes", decoded.imageSize);
        println!("Dimensions: {}x{}", decoded.width, decoded.height);
        println!("Verification Status: {}", if decoded.verified == 1 { "SUCCESS" } else { "FAILED" });
        println!("Image Hash: 0x{}", hex::encode(decoded.imageHash.0));
        println!("Instructions executed: {}", report.total_instruction_count());
    } else {
        // Generate and verify proof
        let (pk, vk) = client.setup(IMAGE_GEN_ELF);
        let proof = client.prove(&pk, &stdin).run().expect("proof generation failed");
        println!("Proof generated successfully!");
        
        client.verify(&proof, &vk).expect("proof verification failed");
        println!("Proof verified successfully!");
        
        let proof_path = "image_gen_proof.bin";
        proof.save(proof_path).expect("failed to save proof");
        println!("Proof saved to: {}", proof_path);
    }
}