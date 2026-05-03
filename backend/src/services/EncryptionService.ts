import crypto from 'crypto';
import { validateEnv } from '../config/env';

export interface EncryptionService {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
  generateSecureState(): string;
  hashToken(token: string): string;
}

class EncryptionServiceImpl implements EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 32;

  private readonly encryptionKey: Buffer;

  constructor() {
    const env = validateEnv();

    // Derive encryption key from environment salt
    this.encryptionKey = crypto.pbkdf2Sync(
      env.ENCRYPTION_SALT,
      'kick-oauth-encryption',
      100000,
      this.keyLength,
      'sha512'
    );
  }

  /**
   * Encrypts plaintext using AES-256-CBC
   * Returns base64 encoded string with format: iv:ciphertext
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Combine iv and ciphertext
      const combined = Buffer.concat([iv, Buffer.from(ciphertext, 'base64')]);

      return combined.toString('base64');
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypts ciphertext encrypted with encrypt method
   */
  decrypt(ciphertext: string): string {
    try {
      const combined = Buffer.from(ciphertext, 'base64');

      if (combined.length < this.ivLength) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = combined.subarray(0, this.ivLength);
      const encrypted = combined.subarray(this.ivLength);

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      let plaintext = decipher.update(encrypted, undefined, 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generates a cryptographically secure random state parameter for OAuth
   */
  generateSecureState(): string {
    return crypto.randomBytes(this.saltLength).toString('base64url');
  }

  /**
   * Creates a secure hash of a token for comparison purposes
   */
  hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .update(this.encryptionKey)
      .digest('hex');
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionServiceImpl();
  }
  return encryptionServiceInstance;
}

export default getEncryptionService;
