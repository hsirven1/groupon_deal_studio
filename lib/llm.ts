import type { DealRefinement } from "@/lib/refinement";

export type GenerateDealsInput = {
  services: string[];
  location: string;
  refinement?: DealRefinement;
};

function buildPrompts({ services, location, refinement }: GenerateDealsInput, strictMode = false) {
  const systemPrompt = [
    "You are a senior Groupon deals strategist advising small local service businesses.",
"Your goal is to help the merchant attract new customers and drive bookings with realistic, high-converting deals tailored to their services and location.",
"Return strict JSON only: no markdown fences, no code blocks, no comments, no text before or after the JSON object.",
"Every field must be concrete and specific to the services and location given.",
"Avoid generic filler."
  ].join(" ");

  const userPrompt = `
You are generating deal ideas for a small local service business.

MERCHANT CONTEXT:
- Services offered: ${services.join(", ")}
- Location (use this exact string everywhere you name the place—do not abbreviate, substitute, or broaden it, e.g. do not turn a city into "NYC" or "the metro area" unless the input already says that): ${location}
- Business goal: attract new customers and drive bookings for the selected services.
${
  refinement
    ? `
MERCHANT REFINEMENT PREFERENCES (follow these closely; they override generic defaults):
- Primary goals: ${refinement.goals.join(", ")}
- Days to promote: ${refinement.daysToPromote.join(", ")}
- Time of day focus: ${refinement.timeOfDay}
- Offer style direction: ${refinement.offerStyle} (if "Mixed", vary the three deals in execution without forcing predefined patterns)
- Discount comfort: ${refinement.discountComfort} (Conservative = shallower discounts; Balanced = moderate; Aggressive = stronger discounts while staying plausible)
`
    : ""
}

${strictMode ? "STRICT CONSTRAINT PASS: You must prioritize refinement values over default weekday strategy. If constraints conflict with realism, keep realistic pricing but still honor the selected targeting fields." : ""}

Return strict JSON in this exact shape (no extra keys):
{
  "deals": [
    {
      "title": string,
      "serviceName": string,
      "originalPrice": number,
      "discountedPrice": number,
      "discountPercent": number,
      "validDays": string,
      "description": string,
      "finePrint": string,
      "whyThisWorks": string
    }
  ]
}

STRATEGY GENERATION LOGIC:

If NO refinement values are provided:

GENERATE EXACTLY 3 DEALS—each must use a DISTINCT strategy (no repeating the same hook or logic):

1) LOW-FRICTION ENTRY OFFER
   - Easy first visit, minimal commitment, strong clarity for someone who has never booked before.
   - Priced to feel like a safe trial for this service type in ${location}.

2) WEEKDAY-TARGETED OFFER (TUE/WED FOCUS)
   - Explicitly designed to steer demand into Tuesday and/or Wednesday.
   - validDays must reflect that focus (e.g. "Valid Tue-Wed only" or similar)—do not say "any day" unless you briefly justify a strategic exception in whyThisWorks.

3) BUNDLE OR PREMIUM TICKET-BUILDER
   - Either combine two complementary services from the list OR a stepped "premium" version that raises average ticket size.
   - Only use premium/consultation framing if it fits the service naturally; avoid vague luxury language.

If refinement values ARE provided:

REFINEMENT OVERRIDES ALL DEFAULT BEHAVIOR.

- Generate EXACTLY 3 deal variations that strictly align with the selected strategy.
- Do NOT use predefined patterns like entry offer, weekday offer, or bundle unless they naturally fit the selected refinement.
- Do NOT default to weekday logic unless explicitly selected.

VARIATION RULE:
- The 3 deals should vary in execution (pricing, messaging, service combination),
  but must NOT vary in top-level intent or targeting.

STRICT RULES WHEN REFINEMENT IS PRESENT:
- All deals must strictly match the selected daysToPromote.
- Do NOT introduce any days outside the selected set.
- Do not force "entry", "bundle", or "premium" patterns unless they naturally fit the selected strategy
- Do not introduce "first-time" positioning unless it aligns with selected goals
- Do not generate conflicting strategies


REALISM & PLACE:
- originalPrice and discountedPrice must be plausible USD for this category of service in ${location} (research-consistent ballpark, not fantasy).
- discountPercent must be a whole number and align with the two prices (approximately consistent with (original - discounted) / original).
- Mention ${location} by name where geography matters in copy or strategy, using the exact string provided.

COPY STRUCTURE (STRICT ROLES):
- title: concise, customer-facing, scannable (what they get).
- description: short, polished coupon body copy—benefit-led, specific, not a strategy essay.
- whyThisWorks: merchant-facing strategic explanation only—why this deal fills Tue/Wed or wins new customers; must be clearly different from description (no pasting description).
- finePrint: short, realistic redemption rules (limits, appointments, new clients, expiry-style wording without inventing a fake legal entity).

DISCOURAGED (avoid these patterns):
- Repetitive deal logic across the three offers.
- Generic lines like "quality service at a reduced price," "great value," "pamper yourself," or empty superlatives.
- Broad strategy notes with no tie to weekdays, new customer acquisition, or the listed services.
- Unrealistic "consultation" or luxury upsell unless the service list supports it.

DISCOUNTS:
- Use three meaningfully different discountPercent values (e.g. around 40, 50, and 60)—assign them to match each strategy.

Bundle rule:
- Only generate a bundle if there are at least 2 distinct selected services, or if a realistic related add-on can be inferred.
- Do not create bundles by repeating the same service twice (for example, "Waxing + Waxing Bundle").
- If only one service is available and no natural add-on exists, generate a premium or weekday-targeted variant instead of a bundle.

HARD REFINEMENT CONSTRAINTS (DO NOT IGNORE):
${refinement ? `- goals are "${refinement.goals.join(", ")}". All 3 deals should align with these goals collectively.
- daysToPromote are "${refinement.daysToPromote.join(", ")}". validDays must respect these selected days.
  - If Tuesday and/or Wednesday are selected, target Tuesday and/or Wednesday.
  - If Weekend is selected, target Saturday and/or Sunday.
  - If Any weekday is selected, stay within Monday-Friday.
  - Do not generate conflicting timing.
- timeOfDay is "${refinement.timeOfDay}". If not Anytime, include time framing in description or validDays.
- offerStyle is "${refinement.offerStyle}". If not Mixed, at least 2 of 3 deals must clearly follow this style.
- discountComfort is "${refinement.discountComfort}".
  - Conservative: keep discounts generally lower (about 20-40%).
  - Balanced: moderate (about 35-55%).
  - Aggressive: stronger (about 50-70%).
- Do not output deals that contradict these refinement controls.` : "If refinement is provided, it MUST override all default behavior."}

Output: the JSON object only, with exactly 3 items in "deals".
`.trim();

  return { systemPrompt, userPrompt };
}

export async function generateDealsWithLLM(
  input: GenerateDealsInput,
  options?: { strictMode?: boolean }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const { systemPrompt, userPrompt } = buildPrompts(input, options?.strictMode ?? false);
  console.log("Final prompt inputs:", {
    services: input.services,
    location: input.location,
    refinement: input.refinement,
    strictMode: options?.strictMode ?? false
  });
  console.log("Sending request to OpenAI...");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  console.log("OpenAI response status:", response.status);

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty model response");
  }

  const text = content;
  console.log("OpenAI raw output:", text);

  return text;
}
