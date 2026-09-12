export type SheetRow = Record<string, string>;

export type HqBootstrap = {
  work: SheetRow[];
  controls: SheetRow[];
  user: string;
  generatedAt: string;
  source: "sheets" | "demo";
  // Extended sheets
  targets: SheetRow[];
  budgets: SheetRow[];
  customers: SheetRow[];
  customerIssues: SheetRow[];
  customerFollowup: SheetRow[];
  reviews: SheetRow[];
  decisions: SheetRow[];
  exceptions: SheetRow[];
  plans: SheetRow[];
  people: SheetRow[];
  ksi: SheetRow[];
  gardeniaPipeline: SheetRow[];
  gardeniaProduct: SheetRow[];
  checklistDefs: SheetRow[];
  checklistRuns: SheetRow[];
  legacy: SheetRow[];
  alerts: SheetRow[];
  property: SheetRow[];
  financeReg: SheetRow[];
  podcast: SheetRow[];
  personalReg: SheetRow[];
  requests: SheetRow[];
  training: SheetRow[];
  systemAccess: SheetRow[];
  periods: SheetRow[];
  notes: SheetRow[];
  activity: SheetRow[];
  techBacklog: SheetRow[];
};

export type HqUser = {
  email: string;
  name: string;
  role: string;
  area: string;
  canSeeAll: boolean;
  authorized: boolean;
};

export const functions = [
  "Edible Operations",

  "Gardenia's Fire",
  "Finance & Office",
  "People / Systems",
  "Podcast / Legacy",
  "Ahmad Personal Finance / Life",
];