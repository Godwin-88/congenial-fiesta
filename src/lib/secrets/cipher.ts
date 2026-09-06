import crypto from 'node:crypto'

/**
 * AES-256-GCM symmetric encryption for app secrets.
 *
 * The key is derived from PAYLOAD_SECRET via scrypt with a unique per-value
 * salt, so each stored value is encrypted under a distinct key even when the
 * same secret is re-stored. Even a full database leak yields AES ciphertext —
 * not usable credentials — unless the attacker also has PAYLOAD_SECRET.
 */

const KEY_LEN = 32       // AES-256
const IV_LEN = 12        // GCM recommended IV length
const TAG_LEN = 16

function masterKey(salt: Buffer): Buffer {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET is required to encrypt app secrets')
  }
  return crypto.scryptSync(secret, salt, KEY_LEN)
}

export interface EncryptedSecret {
  value: string   // base64 ciphertext + auth tag
  salt: string    // base64 salt (used to derive the key)
  iv: string      // base64 IV
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(IV_LEN)
  const key = masterKey(salt)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    value: Buffer.concat([enc, tag]).toString('base64'),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decryptSecret(fields: { value: string; salt: string; iv: string }): string {
  const salt = Buffer.from(fields.salt, 'base64')
  const iv = Buffer.from(fields.iv, 'base64')
  const key = masterKey(salt)
  const buf = Buffer.from(fields.value, 'base64')
  const data = buf.subarray(0, buf.length - TAG_LEN)
  const tag = buf.subarray(buf.length - TAG_LEN)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Mask a secret for display in the UI. Only ever the first 4 + last 4 chars
 * round-trip to the browser (or 2+2 for very short values); the rest is dots.
 */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length <= 8) return `${value.slice(0, 2)}••••${value.slice(-2)}`
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`
}