// Encryption utilities for LocalStorage
import { STORAGE_ENCRYPTION_KEY } from "../config/envConfig";

// Simple XOR-based encryption with Base64 encoding
// For production, consider using Web Crypto API with AES-GCM

function getKey(): string {
  return STORAGE_ENCRYPTION_KEY;
}

function stringToHex(str: string): string {
  return Array.from(str)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

function hexToString(hex: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return String.fromCharCode(...bytes);
}

function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// Encrypt data before storing in LocalStorage
export function encryptData(data: string): string {
  const key = getKey();
  const encrypted = xorEncrypt(data, key);
  return stringToHex(encrypted);
}

// Decrypt data from LocalStorage
export function decryptData(encryptedData: string): string {
  try {
    const key = getKey();
    const hexDecoded = hexToString(encryptedData);
    return xorEncrypt(hexDecoded, key);
  } catch {
    console.error("Decryption failed - data may be corrupted or tampered");
    return "";
  }
}

// Secure LocalStorage wrapper
export const secureStorage = {
  setItem(key: string, value: unknown): void {
    try {
      const jsonString = JSON.stringify(value);
      const encrypted = encryptData(jsonString);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      console.error(`Failed to encrypt and save ${key}:`, e);
    }
  },

  getItem<T>(key: string, defaultValue: T): T {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return defaultValue;
      const decrypted = decryptData(encrypted);
      if (!decrypted) return defaultValue;
      const parsed = JSON.parse(decrypted);
      return parsed as T;
    } catch (e) {
      console.error(`Failed to decrypt ${key}:`, e);
      return defaultValue;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },
};
