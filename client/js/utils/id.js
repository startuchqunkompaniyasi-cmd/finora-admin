/**
 * utils/id.js
 * UUID v4. Client-generated ids keep local data importable into the database without collisions.
 */

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback for insecure contexts (plain http on a LAN address).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
