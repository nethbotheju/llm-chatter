import * as crypto from "node:crypto";
import { app } from "electron";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let masterKey: Buffer | null = null;

function ensureMasterSecret(): string {
  const dataDir = join(app.getPath("userData"), "llm-chatter");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const secretFile = join(dataDir, "master_secret");
  if (existsSync(secretFile)) {
    return readFileSync(secretFile, "utf8").trim();
  }
  const generated = crypto.randomUUID();
  writeFileSync(secretFile, generated, "utf8");
  return generated;
}

function getMasterKey(): Buffer {
  if (!masterKey) {
    const secret = ensureMasterSecret();
    masterKey = crypto.createHash("sha256").update(secret).digest();
  }
  return masterKey;
}

export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

export function decrypt(encryptedData: string): string {
  const key = getMasterKey();
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
    "hex",
  );
  const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
