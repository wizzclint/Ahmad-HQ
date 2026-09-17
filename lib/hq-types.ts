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
  gardeniaTasks: SheetRow[];
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
  firefliesLegacy: SheetRow[];
  ironTasks: SheetRow[];
  // Sheets created at runtime via "+ New Register" — not known at compile
  // time, so their data lives in a lookup keyed by sheet name instead of a
  // fixed field here.
  customSheetDefs: { name: string; label: string; columns: string[] }[];
  customSheets: Record<string, SheetRow[]>;
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