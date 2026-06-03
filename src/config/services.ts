export type ServiceQuestionType =
  | "number"
  | "text"
  | "time"
  | "select"
  | "textarea";

export type ServiceQuestion = {
  id: string;
  label: string;
  type: ServiceQuestionType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type ServiceAddon = {
  id: string;
  dbId?: string;
  label: string;
  price: number;
  active?: boolean;
};

export type ServicePricingRule = {
  id: string;
  name: string;
  ruleType: string;
  adjustmentType: "flat" | "percentage";
  adjustmentValue: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  notes: string;
};

export type ServiceFeeType = "flat" | "percentage";

export type ServiceConfig = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  roomPrice: number;
  bathroomPrice: number;
  serviceFeeType: ServiceFeeType;
  serviceFeeAmount: number;
  durationMinutes: number;
  active: boolean;
  questions: ServiceQuestion[];
  addons: ServiceAddon[];
  pricingRules: ServicePricingRule[];
  benefits: string[];
  included: string[];
  pricingRuleNotes: string;
  createdAt: string;
  updatedAt: string;
};
