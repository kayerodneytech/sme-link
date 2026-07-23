export const SECTOR_LABELS: Record<string, string> = {
  retail: "Shop or retail",
  wholesale: "Wholesale or distribution",
  services: "Services",
  manufacturing: "Manufacturing",
  hospitality: "Hospitality",
  other: "Other",
};

export function sectorLabel(sector?: string | null) {
  if (!sector) return "Not set";
  return SECTOR_LABELS[sector] ?? sector;
}
