export function pushContextAllowed(production: boolean, hostname: string, framed: boolean, secure: boolean): boolean {
  const host = hostname.toLowerCase();
  if (!production || framed || !secure) return false;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host)) return false;
  if (/(^|\.)(lovableproject(?:-dev)?\.com|beta\.lovable\.dev)$/.test(host)) return false;
  if (/(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) &&
    /^(?:(?:id-preview|preview)(?:-[a-z0-9]+)?--|project--.+-dev$)/.test(host.split('.')[0])) return false;
  return true;
}

export function decodeVapidKey(key: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4));
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}
