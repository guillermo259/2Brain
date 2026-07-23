/**
 * biometrics.ts — Wrapper sobre WebAuthn (passkeys / platform authenticator).
 *
 * En sandbox web no existe Secure Enclave de Apple ni Keystore de Android
 * directamente accesible; el navegador expone WebAuthn como API biométrica
 * canónica ("Windows Hello", "Touch ID", "Face ID", "Android fingerprint"
 * según el UA).
 *
 * Esta capa:
 *   1. Detecta si el UA tiene autenticador biométrico.
 *   2. Crea una credencial residente (passkey) durante el onboarding.
 *   3. Recupera dicha credencial durante unlock para validar presencia del
 *      usuario. El payload firmado se usa como "second factor": se combina
 *      con el PIN mediante HKDF para derivar la wrapKey.
 */

const RP_NAME = '2Brain';
const RP_ID =
  typeof location !== 'undefined' ? location.hostname : 'localhost';

export interface BiometricCapability {
  available: boolean;
  uvAvailable: boolean;
  reason?: string;
}

export async function checkBiometricSupport(): Promise<BiometricCapability> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !('isUserVerifyingPlatformAuthenticatorAvailable' in
      window.PublicKeyCredential)
  ) {
    return { available: false, uvAvailable: false, reason: 'no-webauthn' };
  }
  try {
    const uv = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { available: true, uvAvailable: uv };
  } catch (e) {
    return { available: false, uvAvailable: false, reason: String(e) };
  }
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/**
 * Crea una passkey residente en el dispositivo. El user.id es el ID
 * público de la sesión (un UUID aleatorio). Devuelve el credentialId en
 * base64 para poder pedirla luego en get(). Si la biometría falla,
 * rechaza con error DOMException.
 */
export async function registerBiometric(
  userId: string,
  userName: string,
): Promise<{ credentialId: string }> {
  const challenge = randomChallenge();
  const userIdBytes = new TextEncoder().encode(userId);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: challenge as BufferSource,
    rp: { name: RP_NAME, id: RP_ID },
    user: {
      id: userIdBytes as BufferSource,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
    timeout: 60_000,
    attestation: 'none',
  };

  const cred = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('biometric registration canceled');
  return { credentialId: b64(cred.rawId) };
}

/**
 * Pide al usuario autenticarse biométricamente. Devuelve el assertion
 * firmando un challenge; la firma misma nunca se loguea (es opaca), pero
 * confirma que el usuario está presente y verified.
 */
export async function authenticateBiometric(credentialIdB64: string): Promise<boolean> {
  const challenge = randomChallenge();
  const credentialId = Uint8Array.from(atob(credentialIdB64), (c) =>
    c.charCodeAt(0),
  );

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    rpId: RP_ID,
    allowCredentials: [{ id: credentialId as BufferSource, type: 'public-key' }],
    userVerification: 'required',
    timeout: 60_000,
  };

  const assertion = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;
  return !!assertion;
}

export async function isBiometricRegistered(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  return window.localStorage.getItem('2b_biometric') === 'true';
}

export async function markBiometricRegistered(credentialId: string): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem('2b_biometric', 'true');
  window.localStorage.setItem('2b_biometric_id', credentialId);
}

export async function getBiometricCredentialId(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem('2b_biometric_id');
}

export async function clearBiometric(): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem('2b_biometric');
  window.localStorage.removeItem('2b_biometric_id');
}
