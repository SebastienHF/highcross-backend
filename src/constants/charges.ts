export const PLATFORM_CHARGE_TIERS = [
  { upTo: 25000, rate: 0.0050 },
  { upTo: 100000, rate: 0.0023 },
  { upTo: 250000, rate: 0.0018 },
  { upTo: 500000, rate: 0.0013 },
  { upTo: Infinity, rate: 0.0005 },
];

export const FUND_CHARGES = {
  vanguardLifestrategy: 0.0022,
  fidelityWorldTracker: 0.0012,
  fidelityCashFund: 0.0010,
};

export const ADVISER_CHARGE = 0.006;

export function calculatePlatformCharge(totalValue: number): number {
  let remainingValue = totalValue;
  let totalCharge = 0;
  let previousTier = 0;

  for (const tier of PLATFORM_CHARGE_TIERS) {
    const tierAmount = Math.min(remainingValue, tier.upTo - previousTier);
    if (tierAmount <= 0) break;
    totalCharge += tierAmount * tier.rate;
    remainingValue -= tierAmount;
    previousTier = tier.upTo;
  }

  return totalValue > 0 ? totalCharge / totalValue : 0;
}
