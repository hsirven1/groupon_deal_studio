export type DealRefinement = {
  goals: string[];
  daysToPromote: string[];
  timeOfDay: string;
  offerStyle: string;
  discountComfort: string;
};

export const REFINEMENT_GOALS = [
  "Get more traffic",
  "Fill slow days",
  "Increase average ticket",
  "Attract new customers"
] as const;

export const REFINEMENT_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Weekend",
  "Any weekday",
] as const;

export const REFINEMENT_TIMES = ["Anytime", "Morning", "Afternoon", "Evening"] as const;

export const REFINEMENT_OFFER_STYLES = ["Entry offer", "Bundle", "Premium", "Mixed"] as const;

export const REFINEMENT_DISCOUNT = ["Conservative", "Balanced", "Aggressive"] as const;

export function defaultRefinement(_services: string[]): DealRefinement {
  return {
    goals: ["Fill slow days", "Attract new customers"],
    daysToPromote: ["Tuesday", "Wednesday"],
    timeOfDay: "Anytime",
    offerStyle: "Mixed",
    discountComfort: "Balanced"
  };
}
