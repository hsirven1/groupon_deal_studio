"use client";

import { useEffect, useMemo, useState } from "react";
import { Deal, generateMockDeals } from "@/lib/deals";
import type { DealRefinement } from "@/lib/refinement";
import {
  defaultRefinement,
  REFINEMENT_DAYS,
  REFINEMENT_DISCOUNT,
  REFINEMENT_GOALS,
  REFINEMENT_OFFER_STYLES,
  REFINEMENT_TIMES
} from "@/lib/refinement";
import { augmentWhyThisWorks, getLocalMarketInsight } from "@/lib/marketBenchmarks";

const serviceSuggestions = [
  "Haircut",
  "Hair Color",
  "Waxing",
  "Lash Lift",
  "Facial",
  "Massage",
  "Nails",
  "Photography",
  "Fitness Class",
  "Teeth Whitening"
];

const locationSuggestions = [
  "Chicago, IL",
  "New York, NY",
  "Los Angeles, CA",
  "Miami, FL",
  "Dallas, TX",
  "Atlanta, GA"
];

export default function Home() {
  const [uiMode, setUiMode] = useState<"input" | "loading" | "results">("input");
  const [serviceInput, setServiceInput] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isLocationFinalized, setIsLocationFinalized] = useState(false);
  const [generatedDeals, setGeneratedDeals] = useState<Deal[]>([]);
  const [refinement, setRefinement] = useState<DealRefinement>(() => defaultRefinement([]));
  const [refineDrawerOpen, setRefineDrawerOpen] = useState(false);

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  const filteredSuggestions = useMemo(() => {
    return serviceSuggestions.filter((service) => {
      const matchesInput = service.toLowerCase().includes(serviceInput.toLowerCase().trim());
      const isSelected = selectedServices.includes(service);
      return matchesInput && !isSelected;
    });
  }, [serviceInput, selectedServices]);

  const addService = (service: string) => {
    if (selectedServices.includes(service)) {
      return;
    }

    setSelectedServices((current) => [...current, service]);
    setServiceInput("");
  };

  const removeService = (service: string) => {
    setSelectedServices((current) => current.filter((item) => item !== service));
  };

  const filteredLocations = useMemo(() => {
    const query = locationInput.toLowerCase().trim();
    return locationSuggestions.filter((location) => location.toLowerCase().includes(query));
  }, [locationInput]);

  const selectLocation = (location: string) => {
    setLocationInput(location);
    setSelectedLocation(location);
    setIsLocationFinalized(true);
  };

  async function executeDealGeneration(payload: {
    services: string[];
    location: string;
    refinement: DealRefinement;
  }) {
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/generate-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: payload.services,
          location: payload.location,
          goals: payload.refinement.goals,
          daysToPromote: payload.refinement.daysToPromote,
          timeOfDay: payload.refinement.timeOfDay,
          offerStyle: payload.refinement.offerStyle,
          discountComfort: payload.refinement.discountComfort,
          refinement: payload.refinement
        })
      });
      const data = (await response.json()) as { deals?: Deal[] };
      if (response.ok && Array.isArray(data.deals) && data.deals.length === 3) {
        setGeneratedDeals(data.deals);
      } else {
        setGeneratedDeals(
          generateMockDeals({ services: payload.services, location: payload.location })
        );
      }
    } catch {
      setGeneratedDeals(
        generateMockDeals({ services: payload.services, location: payload.location })
      );
    } finally {
      const elapsedMs = Date.now() - startedAt;
      const minLoadingMs = 1500;
      if (elapsedMs < minLoadingMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsedMs));
      }
    }
  }

  const canGenerateDeals = selectedServices.length > 0 && locationInput.trim().length > 0;

  async function handleGenerateDeals() {
    const loc = locationInput.trim();
    if (selectedServices.length === 0 || !loc) return;
    const refPayload: DealRefinement = { ...refinement, services: [...selectedServices] };
    setRefinement(refPayload);
    setUiMode("loading");
    await executeDealGeneration({
      services: selectedServices,
      location: loc,
      refinement: refPayload
    });
    setUiMode("results");
  }

  const chipOptionClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-left text-sm transition ${
      active
        ? "border-emerald-200 bg-emerald-50 font-medium text-emerald-800"
        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
    }`;

  useEffect(() => {
    if (!refineDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRefineDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refineDrawerOpen]);

  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <div>
            <p className="text-lg font-semibold tracking-tight text-gray-900">Groupon Deal Studio</p>
            <p className="text-sm text-gray-500">AI-assisted deal creation</p>
          </div>
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Sign in
          </button>
        </div>
      </nav>

      <section className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8 lg:py-14">
        {uiMode === "input" && (
          <div className="fade-in">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
                Create your first deal in minutes
              </h1>
              <p className="mt-3 text-base leading-relaxed text-gray-600 md:text-lg">
                Tell us what you offer and where you&apos;re located. We&apos;ll generate ready-to-publish
                deal ideas for you.
              </p>
            </div>

            <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">Services</h2>
              <p className="mt-1 text-sm text-gray-600">Select one or more services to generate deals</p>

              <div className="mt-5">
                <label htmlFor="service-input" className="sr-only">
                  Service input
                </label>
                <input
                  id="service-input"
                  type="text"
                  value={serviceInput}
                  onChange={(event) => setServiceInput(event.target.value)}
                  placeholder="Type a service, e.g. Massage"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {serviceInput.trim() !== "" && filteredSuggestions.length > 0 && (
                  <div className="mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                      {filteredSuggestions.map((service) => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => addService(service)}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedServices.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Selected services
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                      >
                        {service}
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          aria-label={`Remove ${service}`}
                          className="rounded-full p-0.5 text-emerald-700 transition hover:bg-emerald-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Popular suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {serviceSuggestions.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => addService(service)}
                      disabled={selectedServices.includes(service)}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">Location</h2>
              <p className="mt-1 text-sm text-gray-600">We&apos;ll tailor deal ideas to your area</p>

              <div className="mt-5">
                <label htmlFor="location-input" className="sr-only">
                  Location input
                </label>
                <input
                  id="location-input"
                  type="text"
                  value={locationInput}
                  onChange={(event) => {
                    setLocationInput(event.target.value);
                    setSelectedLocation(null);
                    setIsLocationFinalized(false);
                  }}
                  placeholder="Type your city, e.g. Chicago, IL"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {!isLocationFinalized && locationInput.trim() !== "" && filteredLocations.length > 0 && (
                  <div className="mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                      {filteredLocations.map((location) => (
                        <button
                          key={location}
                          type="button"
                          onClick={() => selectLocation(location)}
                          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Quick-select locations
                </p>
                <div className="flex flex-wrap gap-2">
                  {locationSuggestions.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => selectLocation(location)}
                      className={`rounded-full px-3 py-1.5 text-sm transition ${
                        selectedLocation === location && isLocationFinalized
                          ? "border border-emerald-200 bg-emerald-50 font-medium text-emerald-800"
                          : "border border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center border-t border-gray-100 pt-8">
            <button
              type="button"
              onClick={() => void handleGenerateDeals()}
              disabled={!canGenerateDeals}
              className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              Generate deals
            </button>
          </div>
        </div>
          </div>
        )}

        {uiMode === "loading" && (
          <div className="fade-in mx-auto flex min-h-[68vh] w-full max-w-6xl flex-col justify-center py-8">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
              <p className="mt-4 text-lg font-semibold text-gray-900">Generating your deal ideas...</p>
              <p className="mt-1 text-sm text-gray-500">Preparing optimized offers for your selection.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 h-4 w-1/2 rounded bg-gray-200" />
                  <div className="mb-4 h-8 w-1/3 rounded bg-gray-200" />
                  <div className="mb-3 h-3 w-2/3 rounded bg-gray-200" />
                  <div className="mb-3 h-3 w-3/4 rounded bg-gray-200" />
                  <div className="mb-4 h-3 w-1/2 rounded bg-gray-200" />
                  <div className="h-20 rounded-xl bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        )}

        {uiMode === "results" && generatedDeals.length > 0 && (
          <div className="fade-in mx-auto max-w-6xl">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Your AI-generated deals</h2>
              <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-semibold text-gray-900 md:text-lg">
                  Based on {selectedServices.join(", ")} in {locationInput}.
                </p>
                <button
                  type="button"
                  onClick={() => setUiMode("input")}
                  className="w-fit shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  Edit inputs
                </button>
              </div>
              <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-gray-900 md:text-lg">Goals</span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {refinement.goals.join(", ")}
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {refinement.daysToPromote.join(", ")}
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {refinement.timeOfDay}
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {refinement.offerStyle}
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {refinement.discountComfort}
                  </span>
                  {selectedServices.map((service) => (
                    <span
                      key={service}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                    >
                      {service}
                    </span>
                  ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefineDrawerOpen(true)}
                    className="w-fit shrink-0 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                  >
                    Refine goals
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {generatedDeals.map((deal, idx) => {
                const marketLocation = locationInput.trim() || "your area";
                const insight = getLocalMarketInsight(deal, marketLocation);
                const whyWithBenchmark = augmentWhyThisWorks(deal.whyThisWorks, insight);
                const insightTagClass =
                  insight.tag === "More aggressive than typical"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : insight.tag === "Premium positioning"
                      ? "border-slate-200 bg-slate-50 text-slate-700"
                      : "border-gray-200 bg-gray-50 text-gray-600";

                const listingBadges = ["Entry offer", "Best for slow days", "Bundle"] as const;
                const imageBadge = deal.highlightTag ?? listingBadges[idx % listingBadges.length];

                return (
                  <article
                    key={`${idx}-${deal.title}`}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_4px_24px_rgba(16,24,40,0.08)]"
                  >
                    <div className="relative h-44 shrink-0 bg-gradient-to-br from-gray-100 via-slate-50 to-emerald-50/40">
                      <div
                        className="absolute inset-0 opacity-[0.35]"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 1px 1px, rgb(203 213 225) 1px, transparent 0)",
                          backgroundSize: "12px 12px"
                        }}
                      />
                      <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
                        {imageBadge}
                      </span>
                      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Image preview
                      </span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
                      <div className="flex min-h-0 flex-1 flex-col">
                        <h3 className="line-clamp-2 min-h-[2.75rem] text-[17px] font-semibold leading-snug tracking-tight text-gray-900">
                          {deal.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                            {deal.serviceName}
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3 border-b border-gray-100 pb-4">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-400 line-through">
                              {currencyFormatter.format(deal.originalPrice)}
                            </p>
                            <p className="text-[1.65rem] font-bold leading-none tracking-tight text-emerald-600">
                              {currencyFormatter.format(deal.discountedPrice)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                            {deal.discountPercent}% OFF
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-gray-600">
                          {deal.description}
                        </p>
                        <span className="mt-2 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          {deal.validDays}
                        </span>

                        <p className="mt-3 line-clamp-2 min-h-[2rem] text-[11px] leading-relaxed text-gray-400">
                          {deal.finePrint}
                        </p>
                      </div>

                      <div className="mt-5 flex shrink-0 gap-2 border-t border-gray-100 pt-4">
                        <button
                          type="button"
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Use this deal
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="mt-3 rounded-lg bg-gray-50/80 px-2.5 py-2">
                        <p className="text-[10px] leading-snug text-gray-500">{insight.typicalLine}</p>
                        <span
                          className={`mt-1.5 inline-flex max-w-full rounded-full border px-2 py-0.5 text-[10px] font-medium ${insightTagClass}`}
                        >
                          {insight.tag}
                        </span>
                      </div>

                      <div className="mt-4 shrink-0 rounded-xl border border-blue-200/80 bg-blue-50 px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                          Why this works
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-gray-700">{whyWithBenchmark}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {refineDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <button
              type="button"
              aria-label="Close refine panel"
              className="absolute inset-0 z-0 bg-black/20"
              onClick={() => setRefineDrawerOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="refine-drawer-title"
              className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 id="refine-drawer-title" className="text-base font-semibold text-gray-900">
                  Refine deals
                </h3>
                <button
                  type="button"
                  onClick={() => setRefineDrawerOpen(false)}
                  className="rounded-lg px-2 py-1 text-lg leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <p className="text-xs text-gray-500">
                  Adjust guidance below, then regenerate. Your choices are saved when you close the panel.
                </p>

                <div className="mt-6 space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Goal</p>
                    <div className="flex flex-wrap gap-2">
                      {REFINEMENT_GOALS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setRefinement((r) => ({
                              ...r,
                              goals: r.goals.includes(opt)
                                ? r.goals.filter((g) => g !== opt)
                                : [...r.goals, opt]
                            }))
                          }
                          className={chipOptionClass(refinement.goals.includes(opt))}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Days to promote
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REFINEMENT_DAYS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setRefinement((r) => ({
                              ...r,
                              daysToPromote: r.daysToPromote.includes(opt)
                                ? r.daysToPromote.filter((d) => d !== opt)
                                : [...r.daysToPromote, opt]
                            }))
                          }
                          className={chipOptionClass(refinement.daysToPromote.includes(opt))}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Time of day</p>
                    <div className="flex flex-wrap gap-2">
                      {REFINEMENT_TIMES.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRefinement((r) => ({ ...r, timeOfDay: opt }))}
                          className={chipOptionClass(refinement.timeOfDay === opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Offer style</p>
                    <div className="flex flex-wrap gap-2">
                      {REFINEMENT_OFFER_STYLES.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRefinement((r) => ({ ...r, offerStyle: opt }))}
                          className={chipOptionClass(refinement.offerStyle === opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Discount comfort
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REFINEMENT_DISCOUNT.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRefinement((r) => ({ ...r, discountComfort: opt }))}
                          className={chipOptionClass(refinement.discountComfort === opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                <button
                  type="button"
                  disabled={selectedServices.length === 0 || !locationInput.trim()}
                  onClick={async () => {
                    if (selectedServices.length === 0 || !locationInput.trim()) return;
                    setRefineDrawerOpen(false);
                    setUiMode("loading");
                    await executeDealGeneration({
                      services: selectedServices,
                      location: locationInput.trim(),
                      refinement
                    });
                    setUiMode("results");
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  Regenerate deals
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefinement(defaultRefinement(selectedServices));
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
        <p className="text-sm text-gray-500">Prototype interface for internal concept validation.</p>
      </footer>
    </main>
  );
}
