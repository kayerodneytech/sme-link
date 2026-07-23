export const POS_SECTORS = ["retail", "wholesale", "hospitality"] as const;

export type PosSector = (typeof POS_SECTORS)[number];

export function isPosEligible(
  business:
    | {
        sector?: string | null;
        tracks_inventory?: boolean | null;
      }
    | null
    | undefined,
) {
  if (!business?.tracks_inventory || !business.sector) {
    return false;
  }

  return (POS_SECTORS as readonly string[]).includes(business.sector);
}
