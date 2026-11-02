/**
 * Application-level encryption for sensitive free-text fields (AES-256-GCM).
 *
 * Ciphertext format: "v1:<iv>:<authTag>:<ciphertext>" (base64url parts).
 * The owning user's id is bound as Additional Authenticated Data, so a ciphertext copied
 * into another user's row fails to decrypt. The version prefix enables key rotation.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const KEY = Buffer.from(env.FIELD_ENCRYPTION_KEY, "base64");
const VERSION = "v1";

export function encryptField(plaintext: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
}

export function decryptField(payload: string, aad: string): string {
  const [version, ivB64, tagB64, ctB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || ctB64 === undefined) {
    throw new Error("Unsupported ciphertext format");
  }
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64url"));
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
}

export function encryptNullable(value: string | null | undefined, aad: string): string | null {
  return value ? encryptField(value, aad) : null;
}

export function decryptNullable(value: string | null | undefined, aad: string): string | null {
  return value ? decryptField(value, aad) : null;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Keyed hash for IP addresses etc. — lets us correlate abuse without storing raw IPs. */
export function hmacHex(value: string): string {
  return createHmac("sha256", env.AUDIT_HASH_SECRET).update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
