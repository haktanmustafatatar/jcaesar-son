import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCODING = "hex";
const IV_LENGTH = 16;
const KEY = crypto.scryptSync(process.env.APP_SECRET || "default-secret-key", "salt", 32);

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);
  return `${iv.toString(ENCODING)}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!text || !text.includes(":")) return text;
  try {
    const [ivPart, encryptedPart] = text.split(":");
    const iv = Buffer.from(ivPart, ENCODING);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedPart, ENCODING, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[Crypto] Decryption failed:", error);
    return text; // Return as-is if decryption fails (e.g. not encrypted)
  }
}
