import { safeStorage } from "electron";
import type { SecretStore } from "./manager";

export const ENCRYPTED_PREFIX = "enc:";

export function createSecretStore(): SecretStore {
  return {
    encrypt(plainText: string): string {
      if (!safeStorage.isEncryptionAvailable()) return plainText;
      const buffer = safeStorage.encryptString(plainText);
      return ENCRYPTED_PREFIX + buffer.toString("base64");
    },

    decrypt(cipherText: string): string {
      if (!cipherText.startsWith(ENCRYPTED_PREFIX)) return cipherText;
      if (!safeStorage.isEncryptionAvailable()) return cipherText;
      const buffer = Buffer.from(cipherText.slice(ENCRYPTED_PREFIX.length), "base64");
      return safeStorage.decryptString(buffer);
    },
  };
}
