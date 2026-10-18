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

export interface PlantAsset {
  id: string;
  name: string;
  category: 'Turbine' | 'Inverter' | 'Pump';
}

export const PLANT_ASSETS: readonly PlantAsset[] = [
  { id: 'WTG-101', name: 'Wind Turbine WTG-101', category: 'Turbine' },
  { id: 'WTG-102', name: 'Wind Turbine WTG-102', category: 'Turbine' },
  { id: 'WTG-103', name: 'Wind Turbine WTG-103', category: 'Turbine' },
  { id: 'WTG-104', name: 'Wind Turbine WTG-104', category: 'Turbine' },
  { id: 'WTG-105', name: 'Wind Turbine WTG-105', category: 'Turbine' },
  { id: 'WTG-106', name: 'Wind Turbine WTG-106', category: 'Turbine' },
  { id: 'INV-201', name: 'Inverter INV-201', category: 'Inverter' },
  { id: 'INV-202', name: 'Inverter INV-202', category: 'Inverter' },
  { id: 'INV-203', name: 'Inverter INV-203', category: 'Inverter' },
  { id: 'INV-204', name: 'Inverter INV-204', category: 'Inverter' },
  { id: 'PMP-301', name: 'Pump PMP-301', category: 'Pump' },
  { id: 'PMP-302', name: 'Pump PMP-302', category: 'Pump' },
  { id: 'PMP-303', name: 'Pump PMP-303', category: 'Pump' },
  { id: 'PMP-304', name: 'Pump PMP-304', category: 'Pump' },
] as const;

export const TECHNICIANS = [
  'Technician A',
  'Technician B',
  'Technician C',
  'Technician D',
] as const;

/**
 * Formats a YYYY-MM-DD date into "DD MMM YYYY" (e.g. "22 Oct 2026").
 */
export function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return dateStr;
}

