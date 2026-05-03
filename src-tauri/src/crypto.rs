use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::sync::OnceLock;

const NONCE_SIZE: usize = 12;

static MASTER_KEY: OnceLock<Vec<u8>> = OnceLock::new();
static MASTER_SECRET_OVERRIDE: OnceLock<String> = OnceLock::new();

pub fn init_master_secret(secret: String) {
    let _ = MASTER_SECRET_OVERRIDE.set(secret);
}

fn get_or_create_master_key() -> &'static [u8] {
    MASTER_KEY.get_or_init(|| {
        let secret = MASTER_SECRET_OVERRIDE
            .get()
            .cloned()
            .or_else(|| std::env::var("MASTER_SECRET").ok())
            .unwrap_or_else(|| "llm-chatter-fallback-master-secret".to_string());
        let mut hasher = Sha256::new();
        hasher.update(secret.as_bytes());
        hasher.finalize().to_vec()
    })
}

pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let key_bytes = get_or_create_master_key();
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&result))
}

pub fn decrypt(encrypted: &str) -> Result<String, String> {
    let key_bytes = get_or_create_master_key();
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let bytes = BASE64
        .decode(encrypted)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if bytes.len() < NONCE_SIZE {
        return Err("Invalid encrypted data".to_string());
    }

    let (nonce_bytes, ciphertext) = bytes.split_at(NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode failed: {}", e))
}
