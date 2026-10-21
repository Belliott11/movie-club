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
