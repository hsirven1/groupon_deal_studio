import { NextResponse } from "next/server";
import { Deal, generateMockDeals } from "@/lib/deals";
import { generateDealsWithLLM } from "@/lib/llm";
import type { DealRefinement } from "@/lib/refinement";
import {
  REFINEMENT_DAYS,
  REFINEMENT_DISCOUNT,
  REFINEMENT_GOALS,
  REFINEMENT_OFFER_STYLES,
  REFINEMENT_TIMES
} from "@/lib/refinement";

type DealsResponse = {
  deals: Deal[];
};

function isDeal(value: unknown): value is Deal {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.serviceName === "string" &&
    typeof candidate.originalPrice === "number" &&
    typeof candidate.discountedPrice === "number" &&
    typeof candidate.discountPercent === "number" &&
    typeof candidate.validDays === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.finePrint === "string" &&
    typeof candidate.whyThisWorks === "string"
  );
}

function safeParseDeals(raw: string): Deal[] | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DealsResponse>;
    if (!Array.isArray(parsed.deals) || parsed.deals.length !== 3) {
      return null;
    }

    if (!parsed.deals.every((deal) => isDeal(deal))) {
      return null;
    }

    return parsed.deals;
  } catch {
    return null;
  }
}

const GOAL_SET = new Set<string>(REFINEMENT_GOALS);
const DAYS_SET = new Set<string>(REFINEMENT_DAYS);
const TIME_SET = new Set<string>(REFINEMENT_TIMES);
const OFFER_SET = new Set<string>(REFINEMENT_OFFER_STYLES);
const DISCOUNT_SET = new Set<string>(REFINEMENT_DISCOUNT);

function safeRefinement(value: unknown): DealRefinement | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "object") {
    return undefined;
  }

  const r = value as Record<string, unknown>;
  const goals = r.goals;
  const daysToPromote = r.daysToPromote;
  const timeOfDay = r.timeOfDay;
  const offerStyle = r.offerStyle;
  const discountComfort = r.discountComfort;

  if (
    !Array.isArray(goals) ||
    !Array.isArray(daysToPromote) ||
    typeof timeOfDay !== "string" ||
    typeof offerStyle !== "string" ||
    typeof discountComfort !== "string"
  ) {
    return undefined;
  }

  const normalizedGoals = goals.filter((item): item is string => typeof item === "string");
  const normalizedDays = daysToPromote.filter((item): item is string => typeof item === "string");
  if (normalizedGoals.length === 0 || normalizedDays.length === 0) {
    return undefined;
  }
  if (
    !normalizedGoals.every((g) => GOAL_SET.has(g)) ||
    !normalizedDays.every((d) => DAYS_SET.has(d)) ||
    !TIME_SET.has(timeOfDay)
  ) {
    return undefined;
  }
  if (!OFFER_SET.has(offerStyle) || !DISCOUNT_SET.has(discountComfort)) {
    return undefined;
  }

  return {
    goals: normalizedGoals,
    daysToPromote: normalizedDays,
    timeOfDay,
    offerStyle,
    discountComfort
  };
}

function safeRefinementFromFlatFields(value: unknown): DealRefinement | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  const flat = {
    goals: candidate.goals,
    daysToPromote: candidate.daysToPromote,
    timeOfDay: candidate.timeOfDay,
    offerStyle: candidate.offerStyle,
    discountComfort: candidate.discountComfort
  };
  return safeRefinement(flat);
}

export type GenerateDealsRequestBody = {
  services: string[];
  location: string;
  refinement?: DealRefinement;
};

function safeRequestBody(body: unknown): GenerateDealsRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as { services?: unknown; location?: unknown; refinement?: unknown };
  if (!Array.isArray(candidate.services) || typeof candidate.location !== "string") {
    return null;
  }

  const services = candidate.services.filter((item): item is string => typeof item === "string");
  const location = candidate.location.trim();
  if (services.length === 0 || location.length === 0) {
    return null;
  }

  const refinement = safeRefinement(candidate.refinement) ?? safeRefinementFromFlatFields(candidate);

  return { services, location, refinement };
}

function validateDaysToPromote(deals: Deal[], daysToPromote: string[]): boolean {
  const allDaysText = deals.map((d) => d.validDays.toLowerCase()).join(" | ");

  const hasWeekendSelected = daysToPromote.includes("Weekend");
  const weekendMentioned = /(sat|sun|weekend)/.test(allDaysText);
  if (hasWeekendSelected && !weekendMentioned) {
    return false;
  }

  const tueWedOnlySelection =
    daysToPromote.length > 0 && daysToPromote.every((d) => d === "Tuesday" || d === "Wednesday");
  if (tueWedOnlySelection && weekendMentioned) {
    return false;
  }

  if (hasWeekendSelected) {
    const hasWeekend = /(sat|sun|weekend)/.test(allDaysText);
    const weekdayOnly = /(tue|wed|thu|mon|fri)/.test(allDaysText) && !hasWeekend;
    return hasWeekend && !weekdayOnly;
  }
  if (daysToPromote.includes("Any weekday")) {
    return !/(sat|sun|weekend)/.test(allDaysText);
  }
  return true;
}

function validateRefinementConstraints(deals: Deal[], refinement?: DealRefinement): boolean {
  if (!refinement) {
    return true;
  }
  return validateDaysToPromote(deals, refinement.daysToPromote);
}

function buildRefinedFallbackDeals({
  services,
  location,
  refinement
}: {
  services: string[];
  location: string;
  refinement?: DealRefinement;
}): Deal[] {
  const base = generateMockDeals({ services, location });
  if (!refinement) {
    return base;
  }
  const validDaysByPreference: Record<string, string> = {
    "Weekend": "Valid Sat-Sun",
    "Tuesday": "Valid Tuesday only",
    "Wednesday": "Valid Wednesday only",
    "Monday": "Valid Monday only",
    "Thursday": "Valid Thursday only",
    "Friday": "Valid Friday only",
    "Saturday": "Valid Saturday only",
    "Sunday": "Valid Sunday only",
    "Any weekday": "Valid Mon-Fri"
  };
  const firstDay = refinement.daysToPromote[0] ?? "Any weekday";
  const forcedValidDays = validDaysByPreference[firstDay] ?? "Valid Mon-Fri";
  return base.map((deal) => ({
    ...deal,
    validDays: forcedValidDays,
    whyThisWorks: `${deal.whyThisWorks} Optimized for ${refinement.daysToPromote.join(", ").toLowerCase()} and aligned to goals: ${refinement.goals.join(", ")}.`
  }));
}

export async function POST(request: Request) {
  console.log("API HIT - /api/generate-deals");

  const body = safeRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { services, location, refinement } = body;
  console.log("INPUT:", { services, location, refinement });

  const fallbackDeals = buildRefinedFallbackDeals({ services, location, refinement });
  console.log("REFINEMENT PAYLOAD:", refinement);

  try {
    console.log("Calling LLM...");
    const rawTextResponse = await generateDealsWithLLM({ services, location, refinement });
    console.log("RAW LLM RESPONSE:", rawTextResponse);

    const parsedDeals = safeParseDeals(rawTextResponse);
    if (!parsedDeals) {
      console.log("FALLBACK: Using mock deals");
      return NextResponse.json({ deals: fallbackDeals, source: "fallback" });
    }

    const acceptedFirstPass = validateRefinementConstraints(parsedDeals, refinement);
    if (!acceptedFirstPass) {
      console.log("GENERATION REJECTED BY VALIDATION (first pass), retrying strict...");
      const strictRawResponse = await generateDealsWithLLM(
        { services, location, refinement },
        { strictMode: true }
      );
      console.log("RAW LLM RESPONSE (strict retry):", strictRawResponse);
      const strictParsedDeals = safeParseDeals(strictRawResponse);
      if (!strictParsedDeals || !validateRefinementConstraints(strictParsedDeals, refinement)) {
        console.log("GENERATION REJECTED BY VALIDATION (strict retry).");
        console.log("FALLBACK: Using mock deals");
        return NextResponse.json({ deals: fallbackDeals, source: "fallback" });
      }
      console.log("GENERATION ACCEPTED (strict retry).");
      console.log("PARSED DEALS:", strictParsedDeals);
      return NextResponse.json({ deals: strictParsedDeals, source: "llm" });
    }
    console.log("GENERATION ACCEPTED (first pass).");

    console.log("PARSED DEALS:", parsedDeals);

    // TODO: Add price sanity checks (e.g., reject impossible price ranges).
    // TODO: Add discount cap rules per category and campaign policy.
    // TODO: Add category/city grounding so outputs match local market reality.
    // TODO: Add merchant profitability checks before suggesting final deals.
    return NextResponse.json({ deals: parsedDeals, source: "llm" });
  } catch (error) {
    console.error("LLM ERROR OR PARSE FAILURE:", error);
    console.log("FALLBACK: Using mock deals");
    return NextResponse.json({ deals: fallbackDeals, source: "fallback" });
  }
}
