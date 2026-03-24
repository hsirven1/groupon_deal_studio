/**
 * Static local-market-style benchmarks for Groupon-like deals (no external APIs).
 * TODO: Replace with real market data or merchant-specific baselines when available.
 */

export type ServiceBenchmark = {
  /** Display category used for matching */
  key: string;
  priceMin: number;
  priceMax: number;
  discountMin: number;
  discountMax: number;
};

const BENCHMARKS: ServiceBenchmark[] = [
  { key: "haircut", priceMin: 50, priceMax: 80, discountMin: 40, discountMax: 60 },
  { key: "hair color", priceMin: 85, priceMax: 180, discountMin: 35, discountMax: 55 },
  { key: "waxing", priceMin: 60, priceMax: 90, discountMin: 40, discountMax: 60 },
  { key: "lash lift", priceMin: 80, priceMax: 120, discountMin: 30, discountMax: 50 },
  { key: "facial", priceMin: 75, priceMax: 140, discountMin: 35, discountMax: 55 },
  { key: "massage", priceMin: 70, priceMax: 130, discountMin: 40, discountMax: 60 },
  { key: "nails", priceMin: 35, priceMax: 75, discountMin: 35, discountMax: 55 },
  { key: "photography", priceMin: 150, priceMax: 400, discountMin: 25, discountMax: 45 },
  { key: "fitness", priceMin: 20, priceMax: 45, discountMin: 40, discountMax: 65 },
  { key: "teeth whitening", priceMin: 120, priceMax: 350, discountMin: 30, discountMax: 50 }
];

const DEFAULT_BENCHMARK: ServiceBenchmark = {
  key: "local services",
  priceMin: 45,
  priceMax: 120,
  discountMin: 35,
  discountMax: 55
};

export function resolveBenchmark(serviceName: string): ServiceBenchmark {
  const lower = serviceName.toLowerCase();
  for (const b of BENCHMARKS) {
    if (lower.includes(b.key)) {
      return b;
    }
  }
  return DEFAULT_BENCHMARK;
}

export type LocalDealInsightTag =
  | "In line with local deals"
  | "More aggressive than typical"
  | "Premium positioning";

export type LocalMarketInsight = {
  benchmark: ServiceBenchmark;
  priceVsRange: "below" | "within" | "above";
  discountVsRange: "conservative" | "typical" | "aggressive";
  typicalLine: string;
  tag: LocalDealInsightTag;
  benchmarkNote: string;
};

function classifyPrice(discountedPrice: number, b: ServiceBenchmark): LocalMarketInsight["priceVsRange"] {
  if (discountedPrice < b.priceMin) return "below";
  if (discountedPrice > b.priceMax) return "above";
  return "within";
}

function classifyDiscount(discountPercent: number, b: ServiceBenchmark): LocalMarketInsight["discountVsRange"] {
  if (discountPercent < b.discountMin) return "conservative";
  if (discountPercent > b.discountMax) return "aggressive";
  return "typical";
}

function pickTag(
  priceVs: LocalMarketInsight["priceVsRange"],
  discountVs: LocalMarketInsight["discountVsRange"]
): LocalDealInsightTag {
  if (discountVs === "aggressive" || priceVs === "below") {
    return "More aggressive than typical";
  }
  if (priceVs === "above" || discountVs === "conservative") {
    return "Premium positioning";
  }
  return "In line with local deals";
}

function formatBenchmarkNote(
  location: string,
  priceVs: LocalMarketInsight["priceVsRange"],
  discountVs: LocalMarketInsight["discountVsRange"]
): string {
  const place = location.trim() || "your area";

  if (priceVs === "below" && discountVs === "typical") {
    return `Priced below the typical local paid range for this category, with a discount in line with strong-performing deals in ${place}.`;
  }
  if (priceVs === "below" && discountVs === "aggressive") {
    return `Sits below typical local pricing with a deeper discount than most peer offers in ${place}—high visibility, watch margin.`;
  }
  if (priceVs === "within" && discountVs === "typical") {
    return `Priced and discounted in a band that matches what tends to convert well for similar services in ${place}.`;
  }
  if (priceVs === "within" && discountVs === "aggressive") {
    return `Deal price is within the usual local range, but the discount is steeper than typical—good for filling slow slots in ${place}.`;
  }
  if (priceVs === "above" && discountVs === "conservative") {
    return `Higher ticket than many local comparables, with a modest discount—signals premium positioning in ${place}.`;
  }
  if (priceVs === "above") {
    return `Above the typical paid range for this category in ${place}; pair clear value in the title and description.`;
  }
  if (discountVs === "conservative") {
    return `Discount is softer than typical Groupon-style depth in ${place}; relies more on offer structure than deep % off.`;
  }
  return `Benchmarked against typical deal patterns for this service type in ${place}.`;
}

export function getLocalMarketInsight(
  deal: { discountedPrice: number; discountPercent: number; serviceName: string },
  location: string
): LocalMarketInsight {
  const benchmark = resolveBenchmark(deal.serviceName);
  const priceVsRange = classifyPrice(deal.discountedPrice, benchmark);
  const discountVsRange = classifyDiscount(deal.discountPercent, benchmark);
  const tag = pickTag(priceVsRange, discountVsRange);
  const loc = location.trim() || "your area";

  const typicalLine = `Typical in ${loc}: $${benchmark.priceMin}–${benchmark.priceMax} • ${benchmark.discountMin}–${benchmark.discountMax}% off`;

  const benchmarkNote = formatBenchmarkNote(loc, priceVsRange, discountVsRange);

  return {
    benchmark,
    priceVsRange,
    discountVsRange,
    typicalLine,
    tag,
    benchmarkNote
  };
}

export function augmentWhyThisWorks(baseWhy: string, insight: LocalMarketInsight): string {
  const trimmed = baseWhy.trim();
  if (!trimmed) return insight.benchmarkNote;
  return `${trimmed} ${insight.benchmarkNote}`;
}
