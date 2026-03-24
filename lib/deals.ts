export type Deal = {
  title: string;
  serviceName: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  validDays: string;
  description: string;
  finePrint: string;
  whyThisWorks: string;
  highlightTag?: string;
};

export function generateMockDeals({
  services,
  location
}: {
  services: string[];
  location: string;
}): Deal[] {
  const primary = services[0] ?? "Signature Service";
  const secondary = services[1] ?? primary;
  const tertiary = services[2] ?? secondary;

  return [
    {
      title: `${primary} Quick Refresh`,
      serviceName: primary,
      originalPrice: 80,
      discountedPrice: 48,
      discountPercent: 40,
      validDays: "Valid Tue-Wed only",
      description: "Simple first-visit offer designed for strong redemption.",
      finePrint: "Limit 1 per customer. New customers only. Appointment required.",
      whyThisWorks: `A focused entry offer for ${primary.toLowerCase()} that is easy to redeem and simple to promote, while targeting weekday demand in ${location} with a low-friction first-visit incentive.`,
      highlightTag: "Best for slow days"
    },
    {
      title: `${primary} + ${secondary} Bundle`,
      serviceName: `${primary} + ${secondary}`,
      originalPrice: 140,
      discountedPrice: 70,
      discountPercent: 50,
      validDays: "Valid Mon-Thu",
      description: "Bundle offer crafted to increase basket size.",
      finePrint: "May buy 2 additional as gifts. 24-hour cancellation policy applies.",
      whyThisWorks: `A value-forward bundle combining two popular services into one higher-ticket package, designed to increase average ticket size for local demand in ${location}.`
    },
    {
      title: `${tertiary} Premium Intro Deal`,
      serviceName: tertiary,
      originalPrice: 150,
      discountedPrice: 60,
      discountPercent: 60,
      validDays: "Valid Sun-Thu",
      description: "Premium trial offer for new customer acquisition.",
      finePrint: "Valid for first-time clients only. Not valid with other promotions.",
      whyThisWorks: `A premium intro offer that creates urgency and drives trial for your higher-value service, using a stronger discount to improve first-time conversion in ${location}.`
    }
  ];
}
