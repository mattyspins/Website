import { getEncryptionService } from '../EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: ReturnType<typeof getEncryptionService>;

  beforeAll(() => {
    // Set up test environment variables
    process.env['ENCRYPTION_SALT'] = 'test-encryption-salt-32-chars-long';
    process.env['ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-long-key';
    process.env['ENCRYPTION_IV'] = 'test-encryption-iv-16-chars';

    encryptionService = getEncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'test-oauth-token-12345';

      const encrypted = encryptionService.encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test-oauth-token-12345';

      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'test-token-with-unicode-🔐-chars';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => {
        encryptionService.decrypt('invalid-ciphertext');
      }).toThrow('Decryption failed');
    });

    it('should throw error for malformed ciphertext', () => {
      expect(() => {
        encryptionService.decrypt('dGVzdA=='); // Valid base64 but too short
      }).toThrow('Decryption failed');
    });
  });

  describe('generateSecureState', () => {
    it('should generate secure state parameter', () => {
      const state = encryptionService.generateSecureState();

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(20);
    });

    it('should generate different state each time', () => {
      const state1 = encryptionService.generateSecureState();
      const state2 = encryptionService.generateSecureState();

      expect(state1).not.toBe(state2);
    });

    it('should generate URL-safe base64 string', () => {
      const state = encryptionService.generateSecureState();

      // URL-safe base64 should not contain +, /, or =
      expect(state).not.toMatch(/[+/=]/);
    });
  });

  describe('hashToken', () => {
    it('should hash token consistently', () => {
      const token = 'test-oauth-token-12345';

      const hash1 = encryptionService.hashToken(token);
      const hash2 = encryptionService.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex string
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'test-oauth-token-12345';
      const token2 = 'test-oauth-token-67890';

      const hash1 = encryptionService.hashToken(token1);
      const hash2 = encryptionService.hashToken(token2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string', () => {
      const token = 'test-oauth-token-12345';
      const hash = encryptionService.hashToken(token);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
