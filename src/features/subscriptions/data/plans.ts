export type SubscriptionPlan = {
  name: string;
  price: string;
  description: string;
  cta: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: "Free",
    price: "₱0",
    description: "Start with a simple digital presence for your business.",
    cta: "Get started",
    features: [
      "Basic listing",
      "Address and contact details",
      "Up to 3 photos and services",
      "1 business location",
    ],
  },
  {
    name: "Basic",
    price: "₱499",
    description: "Build a complete profile and start receiving requests.",
    cta: "Choose Basic",
    features: [
      "Everything in Free",
      "Up to 15 photos and services",
      "Promotions",
      "Appointment requests",
    ],
  },
  {
    name: "Professional",
    price: "₱999",
    description: "Manage appointments and grow your visibility.",
    cta: "Choose Professional",
    badge: "Recommended",
    highlighted: true,
    features: [
      "Everything in Basic",
      "Appointment management",
      "Standard analytics",
      "Up to 5 staff accounts",
      "Improved visibility",
    ],
  },
  {
    name: "Enterprise",
    price: "₱1,999+",
    description: "Flexible tools for multi-location businesses.",
    cta: "Talk to sales",
    features: [
      "Everything in Professional",
      "Multiple branches",
      "Advanced analytics",
      "Multiple schedules",
      "Priority support",
    ],
  },
];
