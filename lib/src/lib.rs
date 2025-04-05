use alloy_sol_types::sol;

sol! {
    /// Structure untuk menyimpan data gambar dan hasil verifikasi
    struct PublicValuesStruct {
        uint32 timestamp;     // Waktu pembuatan
        uint32 imageSize;     // Ukuran gambar dalam bytes
        uint32 width;         // Lebar gambar
        uint32 height;       // Tinggi gambar
        bytes32 imageHash;   // Hash dari gambar
        uint32 verified;     // Status verifikasi (1=valid, 0=invalid)
    }
}

/// Verifikasi gambar yang dibuat
pub fn verify_image_generation(
    image_size: u32,
    width: u32, 
    height: u32,
    max_size: u32
) -> bool {
    // Verifikasi ukuran dan dimensi
    if image_size == 0 || width == 0 || height == 0 {
        return false;
    }
    
    // Verifikasi ukuran maksimum
    if image_size > max_size {
        return false;
    }
    
    // Verifikasi rasio aspek yang masuk akal
    if width > 8192 || height > 8192 {
        return false;
    }

    true
}