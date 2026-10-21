/**
 * Sealed scores. Everyone locks their score with the host's PUBLIC key; only the host's PRIVATE key (kept on the host's device)
 * can open them. Nobody else can read a sealed score, even from the database, until the host reveals.
 * RSA-OAEP is randomized, so two people sealing the same score produce different ciphertext.
 */

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
const RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const

/** A fresh key pair as text: the public half goes in the shared database, the private half stays with the host. */
export async function newSealKeys() {
  const pair = await crypto.subtle.generateKey({ ...RSA, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ["encrypt", "decrypt"])
  return {
    publicKey: b64(await crypto.subtle.exportKey("spki", pair.publicKey)),
    privateKey: b64(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
  }
}

export async function sealScore(publicKey: string, score: number): Promise<string> {
  const key = await crypto.subtle.importKey("spki", unb64(publicKey), RSA, false, ["encrypt"])
  return b64(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, new TextEncoder().encode(String(score))))
}

/** The score inside a sealed value, or null when the key is wrong or what's inside isn't a half-star rating from 0.5 to 5. */
export async function openScore(privateKey: string, cipher: string): Promise<number | null> {
  try {
    const key = await crypto.subtle.importKey("pkcs8", unb64(privateKey), RSA, false, ["decrypt"])
    const v = parseFloat(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, unb64(cipher))))
    return v >= 0.5 && v <= 5 && v * 2 === Math.round(v * 2) ? v : null
  } catch {
    return null
  }
}

/**
 * The host's private key locked with a PIN, safe to keep in the shared database so any device can unlock it with the PIN.
 * ponytail: a short PIN can be guessed offline by anyone who copies this row; the slow key derivation only makes that costly. Use a longer PIN to harden.
 */
const pinKey = async (pin: string, salt: Uint8Array) =>
  crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 300_000, hash: "SHA-256" },
    await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]),
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])

export async function lockKey(privateKey: string, pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await pinKey(pin, salt), new TextEncoder().encode(privateKey))
  return [salt, iv, new Uint8Array(ct)].map(a => b64(a.buffer as ArrayBuffer)).join(".")
}

/** The private key inside, or null for a wrong PIN or damaged value. */
export async function unlockKey(locked: string, pin: string): Promise<string | null> {
  try {
    const [salt, iv, ct] = locked.split(".").map(unb64)
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, await pinKey(pin, salt), ct as BufferSource))
  } catch {
    return null
  }
}
