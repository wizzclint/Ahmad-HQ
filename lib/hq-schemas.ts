// Tabs the app itself owns (as opposed to tabs that pre-date it). Each mirrors one sheet of the
// Edible Hackensack weekly-report workbook; the first column is the row's identity, so it must
// be unique per row (generic edit/delete find a row by its first column).
//
// Only raw inputs are stored. Everything derived (average ticket, labor %, status colours...)
// is computed by lib/hq-scorecard.ts, the same way the workbook's formulas did.

export const APP_SHEETS: Record<string, string[]> = {
  // One row per week. Mirrors "Weekly Store Operations" (inputs only).
  HQ_EDIBLE_WEEKLY: [
    "Week Ending", "Net Sales", "Sales Target", "Same Week LY Sales", "Orders",
    "Labor Hours", "Labor Cost", "Add-on Orders", "Refund Amount", "Void Amount",
    "Corporate / Online Sales", "Eligible Orders", "Completed Orders", "Notes",
    // Sales by channel. Type any two and the third is worked out. "Corporate / Online Sales" above is the older
    // single figure, still read for weeks entered that way.
    "Direct Store Sales", "Corporate Sales", "Online Sales",
  ],
  // Mirrors "Setup & Targets": what each KPI means, its target and its colour thresholds.
  HQ_EDIBLE_TARGETS: [
    "KPI", "Frequency", "Definition", "Calculation", "Primary Source", "Target",
    "Green Threshold", "Yellow Threshold", "Direction", "Owner", "Notes",
  ],
  // Mirrors "Monthly KSI Review": eight KSIs scored -10..+10 each month.
  HQ_EDIBLE_KSI_REVIEW: [
    "Review ID", "Month", "KSI", "Previous Score", "Current Score",
    "Evidence / Reason", "One Improvement Action", "Owner", "Due Date",
  ],
};
