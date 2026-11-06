/** Keep the namespace separate from a provider's id, which may itself contain colons. */
export function placeExternalIdentity(externalId: string): {
  provider: 'google' | 'osm' | 'amap';
  id: string;
} | null {
  const separator = externalId.indexOf(':');
  const provider = externalId.slice(0, separator);
  if (provider !== 'google' && provider !== 'osm' && provider !== 'amap') return null;
  return { provider, id: externalId.slice(separator + 1) };
}
