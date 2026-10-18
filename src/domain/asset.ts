/**
 * Asset classification and presentation helpers.
 * Maps asset prefixes (WTG, INV, PMP) to glyphs and descriptive labels.
 */

export function getAssetGlyph(assetId: string): string {
  const prefix = assetId?.split('-')[0]?.toUpperCase() ?? '';
  if (prefix === 'WTG') return '✇'; // Turbine
  if (prefix === 'INV') return '⚡'; // Inverter
  if (prefix === 'PMP') return '💧'; // Pump
  return '⚙'; // Gear / default
}

export function getAssetLabel(assetId: string): string {
  if (!assetId) return 'Unknown Asset';
  const prefix = assetId.split('-')[0]?.toUpperCase() ?? '';
  if (prefix === 'WTG') return `Wind Turbine ${assetId}`;
  if (prefix === 'INV') return `Inverter ${assetId}`;
  if (prefix === 'PMP') return `Pump ${assetId}`;
  return `Equipment ${assetId}`;
}

