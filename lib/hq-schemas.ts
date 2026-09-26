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
    // Optional. The report works direct store sales out as Net Sales less "Corporate / Online Sales"; type it only
    // when the channel report gives it (the other one is then worked out).
    "Direct Store Sales",
  ],
  // Finance & Office "Bills & payments": one row per item that arrives (a card statement, a vendor bill, a notice...).
  // The ID is the row's identity. Money owed is "Amount Due"; what has been paid is worked out from HQ_FINANCE_PAYMENTS.
  HQ_FINANCE_ITEMS: [
    "ID", "Received", "Type", "Entity", "Account / Vendor", "Last 4", "Reference", "Description",
    "Amount Due", "Due Date", "Owner", "Status", "Source / Email", "Notes", "Logged By",
  ],
  // One row per payment made against an item, so a bill paid in parts shows its progress.
  HQ_FINANCE_PAYMENTS: [
    "ID", "Item ID", "Paid On", "Amount", "Method", "Reference", "Paid By", "Notes",
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
