// Use Intl.supportedValuesOf when available (Node 18+, modern browsers).
// Falls back to a curated list of common zones if unsupported.
const FALLBACK_ZONES = [
  'UTC',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota',
  'America/Chicago', 'America/Denver', 'America/Halifax', 'America/Lima',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Phoenix', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Bangkok', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Jakarta',
  'Asia/Jerusalem', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kuala_Lumpur',
  'Asia/Manila', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai',
  'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo',
  'Atlantic/Azores', 'Atlantic/Reykjavik',
  'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Melbourne',
  'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels',
  'Europe/Bucharest', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki',
  'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London', 'Europe/Madrid',
  'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Prague',
  'Europe/Rome', 'Europe/Sofia', 'Europe/Stockholm', 'Europe/Vienna',
  'Europe/Warsaw', 'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
];

export function getTimezones(): string[] {
  const fn = (Intl as any).supportedValuesOf;
  if (typeof fn === 'function') {
    try {
      const list = fn('timeZone');
      if (Array.isArray(list) && list.length > 0) return list;
    } catch { /* fall through */ }
  }
  return FALLBACK_ZONES;
}

export interface TimezoneGroup {
  region: string;
  zones: string[];
}

export function getGroupedTimezones(): TimezoneGroup[] {
  const all = getTimezones();
  const groups = new Map<string, string[]>();
  for (const z of all) {
    const region = z.includes('/') ? z.split('/')[0] : 'Other';
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region)!.push(z);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, zones]) => ({ region, zones: zones.sort() }));
}

export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && getTimezones().includes(tz)) return tz;
  } catch { /* ignore */ }
  return 'UTC';
}
