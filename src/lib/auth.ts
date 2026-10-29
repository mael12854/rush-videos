// Mots de passe : PBKDF2-SHA256, jamais stockés en clair.
const ITER = 150000;

const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
  return { salt: toHex(salt.buffer as ArrayBuffer), hash: toHex(bits) };
}

export async function checkPassword(password: string, salt: string, hash: string) {
  const r = await hashPassword(password, salt);
  return r.hash === hash;
}

// Compte du propriétaire, créé au premier lancement dans chaque navigateur.
export const OWNER_ACCOUNT = {
  name: 'Maël Domenech',
  email: 'mael.domenech@gmail.com',
  salt: 'b4c60f971d0ea197872284b9f875dee8',
  hash: 'fed7ede4edbe8f5ad88742c2af815a5be8814c01a784beb64b8360bec52c6532',
};
