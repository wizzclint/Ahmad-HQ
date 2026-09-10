// AHMAD HQ — TWO-FILE DEPLOY BUILD — RELEASE 1.4.9 — ROLL-UP CONSISTENCY FIX
// Compiled from modular source. Deploy with this Code.gs + Index.html only.

// ===== BEGIN HQ_Config.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.0
// Shared configuration, schema, and checklist definitions.
const HQ = {
  spreadsheetId: "1_zaAT-zqEQhwTW2ZNRLSnH8Peed7zZTzi3kd0RUHQRQ",
  workSheet: "WORK DESK — UPDATE",
  closeSheet: "WEEK CLOSE — UPDATE",
  tz: "America/New_York",
  sheets: {
    access: "HQ_ACCESS",
    checklistDefs: "HQ_CHECKLIST_DEFS",
    checklistItems: "HQ_CHECKLIST_ITEMS",
    checklistRuns: "HQ_CHECKLIST_RUNS",
    targets: "HQ_TARGETS",
    budgets: "HQ_BUDGETS",
    customers: "HQ_CUSTOMERS",
    reviews: "HQ_REVIEWS",
    decisions: "HQ_DECISIONS",
    exceptions: "HQ_EXCEPTIONS",
    notes: "HQ_NOTES",
    alerts: "HQ_ALERTS",
    activity: "HQ_ACTIVITY",
    legacy: "HQ_LEGACY_CLOSEOUT",
    property: "HQ_PROPERTY",
    readiness: "HQ_READINESS",
    periods: "HQ_PERIODS",
    plans: "HQ_PLANS",
    registries: "HQ_REGISTRIES",
    people: "HQ_PEOPLE",
    requests: "HQ_REQUESTS",
    sourceMap: "HQ_SOURCE_MAP",
    reference: "HQ_REFERENCE_LIBRARY",
    training: "HQ_TRAINING",
    financeReg: "HQ_FINANCE_REGISTER",
    podcast: "HQ_PODCAST",
    personal: "HQ_PERSONAL_REGISTER",
    customerFollowup: "HQ_CUSTOMER_FOLLOWUP",
    notificationRules: "HQ_NOTIFICATION_RULES",
    ksi: "HQ_KSI",
    gardeniaPipeline: "HQ_GARDENIA_PIPELINE",
    systemAccess: "HQ_SYSTEM_ACCESS",
    gardeniaProduct: "HQ_GARDENIA_PRODUCT",
    customerIssues: "HQ_CUSTOMER_ISSUES",
  },
};

const SCHEMA = {
  HQ_ACCESS: [
    "Email",
    "Name",
    "Role",
    "Area",
    "Active?",
    "Can See All?",
    "Notes",
  ],
  HQ_CHECKLIST_DEFS: [
    "Checklist ID",
    "Business",
    "Area",
    "Checklist Name",
    "Cadence",
    "Owner Role",
    "Required?",
    "Evidence Required?",
    "Active?",
    "Sort",
  ],
  HQ_CHECKLIST_ITEMS: [
    "Checklist ID",
    "Item ID",
    "Item",
    "Required?",
    "Evidence Required?",
    "Escalate On Fail?",
    "Sort",
  ],
  HQ_CHECKLIST_RUNS: [
    "Run ID",
    "Checklist ID",
    "Business",
    "Area",
    "Checklist Name",
    "Period Key",
    "Period Type",
    "Scheduled Date",
    "Owner",
    "Status",
    "Required Items",
    "Completed Items",
    "Completion %",
    "On Time?",
    "Exceptions",
    "Evidence Complete?",
    "Started At",
    "Completed At",
    "Last Update",
  ],
  HQ_TARGETS: [
    "Year",
    "Week",
    "Month",
    "Business",
    "Metric",
    "Last Year",
    "Target",
    "Actual",
    "Variance",
    "Variance %",
    "YoY %",
    "Forecast",
    "4W Trend",
    "YTD Actual",
    "YTD Last Year",
    "YTD Target",
    "Next Move",
    "Owner",
    "Source",
  ],
  HQ_BUDGETS: [
    "Year",
    "Month",
    "Business",
    "Revenue Budget",
    "Gross Profit Budget",
    "Net Profit Budget",
    "Labor Budget",
    "COGS Budget",
    "Marketing Budget",
    "Other Budget",
    "Money Required",
    "Expected Return",
    "Forecast Revenue",
    "Forecast Net Profit",
    "Owner",
    "Notes",
  ],
  HQ_CUSTOMERS: [
    "Date",
    "Week",
    "Year",
    "Business",
    "Customer",
    "Type",
    "Revenue",
    "Orders",
    "New / Repeat",
    "Recipient?",
    "Recipient Name",
    "Recipient Contactable?",
    "Business Opportunity?",
    "Top Customer?",
    "Relationship Stage",
    "Last Order",
    "Next Action",
    "Owner",
    "Due",
    "Source / Evidence",
  ],
  HQ_REVIEWS: [
    "Date",
    "Week",
    "Business",
    "Platform",
    "Rating",
    "Review / Issue",
    "Theme",
    "Severity",
    "Response Status",
    "Recovery",
    "Owner",
    "Next Action",
    "Source / Evidence",
  ],
  HQ_DECISIONS: [
    "Decision ID",
    "Date",
    "Business / Area",
    "Decision",
    "Why",
    "Owner",
    "Due",
    "Status",
    "Result / Follow-up",
    "Evidence",
  ],
  HQ_EXCEPTIONS: [
    "Exception ID",
    "Date",
    "Business / Area",
    "Source Type",
    "Source ID",
    "Exception",
    "Severity",
    "Financial Exposure",
    "Owner",
    "Status",
    "Next Action",
    "Due",
    "Age Days",
    "Recurring?",
    "Evidence",
    "Closed Date",
  ],
  HQ_NOTES: [
    "Timestamp",
    "Business / Area",
    "Source Type",
    "Source ID",
    "Note",
    "Author",
  ],
  HQ_ALERTS: [
    "Alert ID",
    "Created",
    "Business / Area",
    "Type",
    "Message",
    "Severity",
    "Owner",
    "Status",
    "Source Type",
    "Source ID",
    "Due",
    "Resolved At",
  ],
  HQ_ACTIVITY: [
    "Timestamp",
    "User",
    "Action Type",
    "Business / Area",
    "Source Type",
    "Source ID",
    "Old Value",
    "New Value",
    "Detail",
  ],
  HQ_LEGACY_CLOSEOUT: [
    "Item ID",
    "Old Company / Entity",
    "Creditor / Issue",
    "Amount / Exposure",
    "Stage",
    "Risk",
    "Owner",
    "Next Action",
    "Due",
    "Evidence / Drive Link",
    "Last Update",
    "Closed Date",
  ],
  HQ_PROPERTY: [
    "Property",
    "Category",
    "Item",
    "Status",
    "Amount",
    "Due / Renewal",
    "Owner",
    "Next Action",
    "Source / Evidence",
    "Notes",
  ],
  HQ_READINESS: [
    "Area",
    "System / Source",
    "Status",
    "Authoritative?",
    "Owner",
    "Drive / Source Link",
    "Last Verified",
    "Issue / Next Action",
  ],
  HQ_PERIODS: [
    "Period Key",
    "Period Type",
    "Year",
    "Week",
    "Month",
    "Start Date",
    "End Date",
    "Status",
    "Completion %",
    "Result Review Complete?",
    "Decision Review Complete?",
    "Next Period Plan Complete?",
    "Closed At",
    "Closed By",
  ],
  HQ_PLANS: [
    "Plan ID",
    "Period Type",
    "Period Key",
    "Business / Area",
    "Objective / Priority",
    "Critical Move?",
    "Lead Behavior",
    "Lead Behavior Actual",
    "Expected Outcome",
    "Owner",
    "Due",
    "Status",
    "Result",
    "Evidence / Source",
  ],
  HQ_REGISTRIES: [
    "Registry Type",
    "Business / Area",
    "Name",
    "Purpose / Responsibility",
    "Owner",
    "Cadence / Stage",
    "Status",
    "Backup / Contact",
    "Source / Evidence",
    "Notes",
  ],
  HQ_PEOPLE: [
    "Name",
    "Email",
    "Role",
    "Function / Area",
    "Availability",
    "Responsibilities",
    "Backup",
    "Priority Load",
    "Coverage Status",
    "Training Status",
    "Active?",
    "Notes",
  ],
  HQ_REQUESTS: [
    "Request ID",
    "Date",
    "Business / Area",
    "Request Type",
    "Request / Issue",
    "Severity / Urgency",
    "Owner",
    "Approval Status",
    "Status",
    "Due",
    "Evidence / Photo",
    "Resolution",
  ],
  HQ_SOURCE_MAP: [
    "Business / Area",
    "Metric / Control",
    "Input Owner",
    "Authoritative Source",
    "Frequency",
    "Evidence Location",
    "Calculation / Rule",
    "Destination Screen",
    "Status",
    "Last Verified",
  ],
  HQ_REFERENCE_LIBRARY: [
    "Business / Area",
    "Reference Type",
    "Title",
    "Current?",
    "Audience / Role",
    "Owner",
    "Source / Drive Link",
    "Supersedes / Replaces",
    "Status",
    "Notes",
  ],
  HQ_TRAINING: [
    "Business / Area",
    "Role / Person",
    "Capability / Training",
    "Required?",
    "Status",
    "Evidence / Guide",
    "Owner",
    "Due",
    "Last Verified",
    "Notes",
  ],
  HQ_FINANCE_REGISTER: [
    "Register Type",
    "Entity / Property",
    "Account / Policy / Vendor / Tax",
    "Status",
    "Amount / Balance",
    "Effective / Filing / Renewal",
    "Due / Next Date",
    "Owner",
    "Source / Evidence",
    "Next Action",
    "Notes",
  ],
  HQ_PODCAST: [
    "Item ID",
    "Episode / Asset",
    "Stage",
    "Item Type",
    "Owner",
    "Due",
    "Status",
    "Source / Drive Link",
    "Current / Future Use",
    "Publish Target / Platform",
    "Next Action",
    "Notes",
  ],
  HQ_PERSONAL_REGISTER: [
    "Register Type",
    "Item / Account / Policy",
    "Status",
    "Amount",
    "Expected / Renewal / Due",
    "Owner",
    "Source / Evidence",
    "Next Action",
    "Exception?",
    "Notes",
  ],
  HQ_CUSTOMER_FOLLOWUP: [
    "Follow-up ID",
    "Date",
    "Business",
    "Customer / Recipient",
    "Trigger / Segment",
    "Priority",
    "Owner",
    "Due",
    "Status",
    "Next Action",
    "Result",
    "Source / Evidence",
  ],
  HQ_NOTIFICATION_RULES: [
    "Rule ID",
    "Area",
    "Trigger",
    "Severity",
    "Delivery",
    "Recipient / Role",
    "Active?",
    "Last Fired",
    "Notes",
  ],
  HQ_KSI: [
    "Business / Area",
    "Metric / Indicator",
    "Owner",
    "Cadence",
    "Authoritative Source",
    "Threshold / Target",
    "Direction",
    "Current",
    "Status",
    "Last Updated",
    "Next Move",
  ],
  HQ_GARDENIA_PIPELINE: [
    "Account / Prospect",
    "Stage",
    "Contact / Company",
    "Last Contact",
    "Next Follow-up",
    "Tasting / Sample",
    "Standing Cadence",
    "Revenue / Value",
    "Risk",
    "Owner",
    "Source / Evidence",
    "Notes",
  ],
  HQ_SYSTEM_ACCESS: [
    "System / Account",
    "User / Role",
    "Business / Area",
    "Access Level",
    "Owner / Admin",
    "Status",
    "Last Verified",
    "Source / Login Page",
    "Notes",
  ],
  HQ_GARDENIA_PRODUCT: [
    "Product / Test",
    "Standard / Specification",
    "Test Status",
    "Unit Cost",
    "Price",
    "Target Margin",
    "Actual Margin",
    "Open Assumption / Issue",
    "Owner",
    "Source / Evidence",
    "Last Updated",
  ],
  HQ_CUSTOMER_ISSUES: [
    "Date",
    "Week",
    "Year",
    "Business",
    "Issue Type",
    "Customer",
    "Reason / Theme",
    "Amount / Value",
    "Severity",
    "Recovery / Action",
    "Owner",
    "Status",
    "Source / Evidence",
  ],
};

const CHECKLIST_SEEDS = [
  [
    "ED-OPEN",
    "Edible",
    "Store",
    "Opening Checklist",
    "DAILY",
    "Store Lead",
    "Yes",
    "No",
    "Yes",
    10,
    [
      "Front/store opening condition|Y|N|Y",
      "Phones / tablets / POS ready|Y|N|Y",
      "Fruit / ingredients readiness|Y|N|Y",
      "Production plan reviewed|Y|N|Y",
      "Delivery / pickup schedule reviewed|Y|N|Y",
      "Staff coverage confirmed|Y|N|Y",
      "Cleaning / sanitation opening check|Y|N|Y",
      "Critical supplies available|Y|N|Y",
    ],
  ],
  [
    "ED-PROD",
    "Edible",
    "Store",
    "Production Readiness",
    "DAILY",
    "Store Lead",
    "Yes",
    "No",
    "Yes",
    20,
    [
      "Orders prioritized by promise time|Y|N|Y",
      "Fruit prep plan ready|Y|N|Y",
      "Chocolate / ingredients ready|Y|N|Y",
      "Packaging / containers ready|Y|N|Y",
      "Delivery orders staged|Y|N|Y",
      "Special instructions reviewed|Y|N|Y",
    ],
  ],
  [
    "ED-QA",
    "Edible",
    "Store",
    "Food Safety / Quality",
    "DAILY",
    "Store Lead",
    "Yes",
    "Yes",
    "Yes",
    30,
    [
      "Refrigeration / cold holding acceptable|Y|Y|Y",
      "Fruit quality acceptable|Y|N|Y",
      "Chocolate / product quality acceptable|Y|N|Y",
      "Sanitation standard met|Y|Y|Y",
      "Finished product presentation acceptable|Y|Y|Y",
    ],
  ],
  [
    "ED-CLEAN",
    "Edible",
    "Store",
    "Cleaning / Sanitation",
    "DAILY",
    "Store Team",
    "Yes",
    "No",
    "Yes",
    40,
    [
      "Production surfaces cleaned|Y|N|Y",
      "Sinks / tools sanitized|Y|N|Y",
      "Floors / visible areas clean|Y|N|Y",
      "Trash removed|Y|N|Y",
      "Restroom / customer area checked|Y|N|Y",
    ],
  ],
  [
    "ED-INV",
    "Edible",
    "Store",
    "Inventory / Supplies",
    "DAILY",
    "Store Lead",
    "Yes",
    "No",
    "Yes",
    50,
    [
      "Fruit shortages identified|Y|N|Y",
      "Packaging shortages identified|Y|N|Y",
      "Chocolate / ingredient shortages identified|Y|N|Y",
      "Supply purchase request submitted if needed|N|N|N",
    ],
  ],
  [
    "ED-CUST",
    "Edible",
    "Store",
    "Customer Issues / Guest Connect",
    "DAILY",
    "Store Lead",
    "Yes",
    "Yes",
    "Yes",
    60,
    [
      "Open customer complaints reviewed|Y|Y|Y",
      "Refunds / credits / voids reviewed|Y|Y|Y",
      "Recovery actions assigned|Y|Y|Y",
      "Negative reviews / guest connects checked|Y|Y|Y",
    ],
  ],
  [
    "ED-CLOSE",
    "Edible",
    "Store",
    "Closing Checklist",
    "DAILY",
    "Store Lead",
    "Yes",
    "Yes",
    "Yes",
    70,
    [
      "All same-day orders completed / accounted for|Y|Y|Y",
      "Tomorrow priority orders reviewed|Y|N|Y",
      "Production area cleaned / sanitized|Y|Y|Y",
      "Waste / spoilage recorded|Y|Y|Y",
      "Refund / complaint issues recorded|Y|Y|Y",
      "Cash / POS close completed if applicable|Y|Y|Y",
      "Store secured / close complete|Y|N|Y",
    ],
  ],
  [
    "ED-WEEK",
    "Edible",
    "Management",
    "Edible Weekly Management Review",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    100,
    [
      "Week number and comparable LY week verified|Y|Y|Y",
      "Sales / orders / avg ticket actuals entered|Y|Y|Y",
      "Labor / COGS / refund metrics entered|Y|Y|Y",
      "Targets / variance / YoY reviewed|Y|Y|Y",
      "Customers this week reviewed|Y|Y|Y",
      "Top customer / recipient opportunities reviewed|Y|Y|Y",
      "Reviews / complaints / recoveries reviewed|Y|Y|Y",
      "Critical Moves reviewed / reset|Y|Y|Y",
      "Exceptions assigned|Y|Y|Y",
      "Next week targets and moves confirmed|Y|Y|Y",
    ],
  ],
  [
    "FI-WEEK",
    "Finance & Office",
    "Management",
    "Finance Week Close",
    "WEEKLY",
    "Finance",
    "Yes",
    "Yes",
    "Yes",
    110,
    [
      "Books current through required date|Y|Y|Y",
      "Bank / card reconciliation status reviewed|Y|Y|Y",
      "AP / AR reviewed|Y|Y|Y",
      "Cash position updated|Y|Y|Y",
      "Open creditor / legacy issues reviewed|Y|Y|Y",
      "Required finance evidence linked|Y|Y|Y",
      "Exceptions / next actions assigned|Y|Y|Y",
    ],
  ],
  [
    "HQ-WEEK",
    "Shared Management",
    "Management",
    "HQ Week Close",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    120,
    [
      "Critical Moves results reviewed|Y|Y|Y",
      "All required weekly checklists reviewed|Y|Y|Y",
      "KPI / KSI / YoY results reviewed|Y|Y|Y",
      "Budget / forecast variance reviewed|Y|Y|Y",
      "Exceptions reviewed and owned|Y|Y|Y",
      "Waiting / blocked items reviewed|Y|Y|Y",
      "Decisions captured|Y|Y|Y",
      "Evidence gaps identified|Y|Y|Y",
      "Next week plan created|Y|Y|Y",
      "Owners / due dates confirmed|Y|Y|Y",
    ],
  ],
  [
    "HQ-MONTH",
    "Shared Management",
    "Management",
    "HQ Month Close",
    "MONTHLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    130,
    [
      "Financial month close complete|Y|Y|Y",
      "Business monthly results entered|Y|Y|Y",
      "Monthly YoY reviewed|Y|Y|Y",
      "YTD vs LY and YTD target reviewed|Y|Y|Y",
      "Budget vs actual reviewed|Y|Y|Y",
      "Forecast updated|Y|Y|Y",
      "Customer / reputation review complete|Y|Y|Y",
      "People / capacity review complete|Y|Y|Y",
      "Recurring exceptions reviewed|Y|Y|Y",
      "Major decisions captured|Y|Y|Y",
      "Next month priorities / targets set|Y|Y|Y",
      "Month evidence / history retained|Y|Y|Y",
    ],
  ],
  [
    "GF-WEEK",
    "Gardenia's Fire",
    "Management",
    "Gardenia Weekly Review",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    140,
    [
      "Product / quality status reviewed|Y|Y|Y",
      "Costing / margin current|Y|Y|Y",
      "Prospects / contacts / tastings entered|Y|Y|Y",
      "Standing accounts updated|Y|Y|Y",
      "Revenue / target / forecast reviewed|Y|Y|Y",
      "Budget / money required reviewed|Y|Y|Y",
      "Next moves assigned|Y|Y|Y",
    ],
  ],
  [
    "LC-WEEK",
    "Legacy Closeout",
    "Management",
    "Legacy Closeout Weekly Review",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    150,
    [
      "Open obligations reviewed|Y|Y|Y",
      "Exposure values updated where known|Y|Y|Y",
      "Stage / owner / next action current|Y|Y|Y",
      "Waiting / negotiating items reviewed|Y|Y|Y",
      "Closure evidence preserved|Y|Y|Y",
      "Closed items marked closed|Y|Y|Y",
    ],
  ],
  [
    "FI-RECORDS",
    "Finance & Office",
    "Office",
    "Finance Records Maintenance",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    160,
    [
      "Mail / scans / statements intake cleared|Y|Y|Y",
      "Expected statements / documents checked|Y|Y|Y",
      "Files routed to authoritative folders|Y|Y|Y",
      "Missing records escalated|Y|Y|Y",
      "Finance source map / evidence links verified|Y|Y|Y",
    ],
  ],
  [
    "LC-ENTITY",
    "Legacy Closeout",
    "Management",
    "Old Entity Closeout Control",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    170,
    [
      "Tax status checked for open entities|Y|Y|Y",
      "Accounting closeout status checked|Y|Y|Y",
      "Legal / creditor obligations checked|Y|Y|Y",
      "Administrative accounts / registrations checked|Y|Y|Y",
      "Next action / owner / due current|Y|Y|Y",
    ],
  ],
  [
    "PR-MONTH",
    "Buyahka / Property",
    "Management",
    "Property Monthly Review",
    "MONTHLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    180,
    [
      "Rent / receipts reviewed|Y|Y|Y",
      "Property expenses reviewed|Y|Y|Y",
      "Insurance / renewal issues reviewed|Y|Y|Y",
      "Maintenance / facilities issues reviewed|Y|Y|Y",
      "Legal / compliance deadlines reviewed|Y|Y|Y",
      "Next moves / decisions assigned|Y|Y|Y",
    ],
  ],
  [
    "PA-RECORDS",
    "Personal / Ahmad",
    "Office",
    "Personal Records Maintenance",
    "WEEKLY",
    "Coordinator",
    "Yes",
    "Yes",
    "Yes",
    190,
    [
      "Personal document intake queue reviewed|Y|Y|Y",
      "Bills / obligations due reviewed|Y|Y|Y",
      "Subscriptions / recurring charges reviewed|Y|Y|Y",
      "Missing records / statements identified|Y|Y|Y",
      "Money / deadline exceptions escalated|Y|Y|Y",
    ],
  ],
];

// ===== END HQ_Config.gs =====

// ===== BEGIN HQ_Data.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.0
function readWork_(ss) {
  const sh = ss.getSheetByName(HQ.workSheet);
  if (!sh || sh.getLastRow() < 6) return [];
  const vals = sh
      .getRange(5, 1, sh.getLastRow() - 4, sh.getLastColumn())
      .getDisplayValues(),
    headers = vals.shift();
  return vals
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
function readLegacyCloseSheet_(ss) {
  const sh = ss.getSheetByName(HQ.closeSheet);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh
      .getRange(1, 1, sh.getLastRow(), sh.getLastColumn())
      .getDisplayValues(),
    headers = vals.shift();
  return vals
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
function readSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh
      .getRange(1, 1, sh.getLastRow(), sh.getLastColumn())
      .getDisplayValues(),
    headers = vals.shift();
  return vals
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
function appendRowObj_(ss, name, obj) {
  const sh = ss.getSheetByName(name),
    headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  sh.appendRow(headers.map((h) => (obj[h] !== undefined ? obj[h] : "")));
}
function findRowBy_(sh, header, value) {
  const headers = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0],
    idx = headers.indexOf(header);
  if (idx < 0 || sh.getLastRow() < 2) return 0;
  const vals = sh
      .getRange(2, idx + 1, sh.getLastRow() - 1, 1)
      .getDisplayValues()
      .flat(),
    pos = vals.indexOf(value);
  return pos < 0 ? 0 : pos + 2;
}
function setByHeader_(sh, row, header, value) {
  const headers = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0],
    idx = headers.indexOf(header);
  if (idx >= 0) sh.getRange(row, idx + 1).setValue(value);
}
function headerMap_(headers) {
  return Object.fromEntries(headers.map((h, i) => [h, i]));
}
function log_(
  ss,
  action,
  area,
  sourceType,
  sourceId,
  oldValue,
  newValue,
  detail,
) {
  appendRowObj_(ss, HQ.sheets.activity, {
    Timestamp: new Date(),
    User: Session.getActiveUser().getEmail(),
    "Action Type": action,
    "Business / Area": area,
    "Source Type": sourceType,
    "Source ID": sourceId,
    "Old Value": oldValue,
    "New Value": newValue,
    Detail: detail,
  });
}

// ===== END HQ_Data.gs =====

// ===== BEGIN HQ_Core.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.9 ROLL-UP CONSISTENCY FIX
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
function doGet() {
  // Index is a fully compiled static two-file build; no template evaluation is needed.
  // Serving the file directly avoids an unnecessary templating pass over client JavaScript.
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Ahmad HQ")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
function getBootstrap() {
  // FAST STARTUP: read-only bootstrap. Heavy maintenance/writes are not allowed here.
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const email =
    Session.getActiveUser().getEmail() ||
    Session.getEffectiveUser().getEmail() ||
    "";
  const user = getUser_(ss, email);
  if (!user.authorized)
    throw new Error(
      "This Google account is not authorized for Ahmad HQ. Add it to HQ_ACCESS first.",
    );
  const p = periodInfo_(new Date());
  const raw = {
    user,
    period: p,
    release: {
      version: "1.4.9",
      name: "Phase 1 — Roll-Up Consistency Fix",
      schemaVersion: 4,
    },
    work: readWork_(ss),
    closeLegacy: readLegacyCloseSheet_(ss),
    checklistDefs: readSheet_(ss, HQ.sheets.checklistDefs),
    checklistRuns: readSheet_(ss, HQ.sheets.checklistRuns),
    checklistItems: readSheet_(ss, HQ.sheets.checklistItems),
    targets: readSheet_(ss, HQ.sheets.targets),
    budgets: readSheet_(ss, HQ.sheets.budgets),
    customers: readSheet_(ss, HQ.sheets.customers),
    reviews: readSheet_(ss, HQ.sheets.reviews),
    decisions: readSheet_(ss, HQ.sheets.decisions),
    exceptions: readSheet_(ss, HQ.sheets.exceptions),
    alerts: readSheet_(ss, HQ.sheets.alerts),
    legacy: readSheet_(ss, HQ.sheets.legacy),
    property: readSheet_(ss, HQ.sheets.property),
    readiness: readSheet_(ss, HQ.sheets.readiness),
    periods: readSheet_(ss, HQ.sheets.periods),
    access: readSheet_(ss, HQ.sheets.access),
    activity: readSheet_(ss, HQ.sheets.activity),
    plans: readSheet_(ss, HQ.sheets.plans),
    registries: readSheet_(ss, HQ.sheets.registries),
    people: readSheet_(ss, HQ.sheets.people),
    requests: readSheet_(ss, HQ.sheets.requests),
    sourceMap: readSheet_(ss, HQ.sheets.sourceMap),
    reference: readSheet_(ss, HQ.sheets.reference),
    training: readSheet_(ss, HQ.sheets.training),
    financeReg: readSheet_(ss, HQ.sheets.financeReg),
    podcast: readSheet_(ss, HQ.sheets.podcast),
    personalReg: readSheet_(ss, HQ.sheets.personal),
    customerFollowup: readSheet_(ss, HQ.sheets.customerFollowup),
    notificationRules: readSheet_(ss, HQ.sheets.notificationRules),
    ksi: readSheet_(ss, HQ.sheets.ksi),
    gardeniaPipeline: readSheet_(ss, HQ.sheets.gardeniaPipeline),
    systemAccess: readSheet_(ss, HQ.sheets.systemAccess),
    gardeniaProduct: readSheet_(ss, HQ.sheets.gardeniaProduct),
    customerIssues: readSheet_(ss, HQ.sheets.customerIssues),
  };
  raw.intelligence = buildIntelligence_(ss, p);
  raw.briefs = buildBriefs_(ss, p, raw.intelligence);
  return filterBootstrapForUser_(raw, user);
}

/** Run this manually after schema/checklist changes, not from web-page startup. */
function runMaintenance() {
  ensureInfrastructure_();
  generateExpectedRuns_();
  refreshIntelligence_();
  return { ok: true, release: "1.4.9", message: "Maintenance completed" };
}
function ensureInfrastructure_() {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  Object.keys(SCHEMA).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = SCHEMA[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      ensureHeaders_(sh, headers);
    }
    sh.getRange(1, 1, 1, sh.getLastColumn())
      .setBackground("#173B5B")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sh.setFrozenRows(1);
  });
  seedAccess_(ss);
  seedChecklists_(ss);
}
function seedAccess_(ss) {
  const sh = ss.getSheetByName(HQ.sheets.access);
  if (sh.getLastRow() > 1) return;
  const owner = Session.getEffectiveUser().getEmail();
  if (owner)
    sh.appendRow([
      owner,
      "Ahmad",
      "Executive Owner",
      "All",
      "Yes",
      "Yes",
      "Full owner visibility",
    ]);
}
function seedChecklists_(ss) {
  const defs = ss.getSheetByName(HQ.sheets.checklistDefs);
  const items = ss.getSheetByName(HQ.sheets.checklistItems);
  if (defs.getLastRow() > 1) return;
  CHECKLIST_SEEDS.forEach((seed) => {
    defs.appendRow(seed.slice(0, 10));
    seed[10].forEach((raw, i) => {
      const parts = raw.split("|");
      items.appendRow([
        seed[0],
        seed[0] + "-" + String(i + 1).padStart(2, "0"),
        parts[0],
        parts[1] === "Y" ? "Yes" : "No",
        parts[2] === "Y" ? "Yes" : "No",
        parts[3] === "Y" ? "Yes" : "No",
        (i + 1) * 10,
      ]);
    });
  });
}
function getUser_(ss, email) {
  const rows = readSheet_(ss, HQ.sheets.access);
  const hit = rows.find(
    (r) =>
      String(r.Email || "").toLowerCase() ===
        String(email || "").toLowerCase() && !/^no$/i.test(r["Active?"] || ""),
  );
  if (hit)
    return {
      email,
      name: hit.Name || email,
      role: hit.Role || "Team Member",
      area: hit.Area || "My Work",
      canSeeAll: /yes/i.test(hit["Can See All?"] || ""),
      authorized: true,
    };
  return {
    email,
    name: email || "User",
    role: "Unauthorized",
    area: "",
    canSeeAll: false,
    authorized: false,
  };
}
function periodInfo_(d) {
  const iso = isoWeek_(d);
  const month = d.getMonth() + 1,
    year = d.getFullYear();
  const monthName = Utilities.formatDate(d, HQ.tz, "MMMM");
  return {
    year,
    month,
    monthName,
    week: iso.week,
    weekYear: iso.year,
    weekKey: iso.year + "-W" + String(iso.week).padStart(2, "0"),
    monthKey: year + "-M" + String(month).padStart(2, "0"),
  };
}
function isoWeek_(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}
function accessAreas_(user) {
  return String(user.area || "")
    .split(/[;,|]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}
function filterBootstrapForUser_(raw, user) {
  if (user.canSeeAll) return raw;
  const areas = accessAreas_(user),
    email = String(user.email || "").toLowerCase(),
    name = String(user.name || "").toLowerCase();
  const own = (x) =>
    String(x.Owner || x.owner || "")
      .toLowerCase()
      .includes(name) ||
    String(x.Owner || x.owner || "")
      .toLowerCase()
      .includes(email);
  const inArea = (x) => {
    const hay = [
      x.Business,
      x.Area,
      x["Business / Area"],
      x["Project / Function"],
    ]
      .join(" ")
      .toLowerCase();
    return (
      !areas.length ||
      areas.includes("my work") ||
      areas.some((a) => hay.includes(a) || a.includes(hay))
    );
  };
  raw.work = raw.work.filter((x) => own(x) || inArea(x));
  raw.checklistRuns = raw.checklistRuns.filter((x) => own(x) || inArea(x));
  raw.checklistDefs = raw.checklistDefs.filter(inArea);
  const allowedIds = new Set(raw.checklistDefs.map((x) => x["Checklist ID"]));
  raw.checklistItems = raw.checklistItems.filter((x) =>
    allowedIds.has(x["Checklist ID"]),
  );
  [
    "targets",
    "budgets",
    "customers",
    "reviews",
    "decisions",
    "exceptions",
    "alerts",
    "readiness",
    "plans",
    "registries",
    "people",
    "requests",
    "sourceMap",
    "reference",
    "training",
    "customerFollowup",
    "ksi",
    "gardeniaPipeline",
    "systemAccess",
    "gardeniaProduct",
    "customerIssues",
  ].forEach((k) => (raw[k] = raw[k].filter(inArea)));
  raw.financeReg = areas.some((a) => /finance|office/i.test(a))
    ? raw.financeReg
    : [];
  raw.podcast = areas.some((a) => /podcast|legacy/i.test(a)) ? raw.podcast : [];
  raw.personalReg = areas.some((a) => /personal|ahmad/i.test(a))
    ? raw.personalReg
    : [];
  raw.notificationRules = [];
  raw.legacy = [];
  raw.property = [];
  raw.access = [];
  raw.activity = [];
  raw.closeLegacy = [];
  return raw;
}

function currentUser_() {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const email =
    Session.getActiveUser().getEmail() ||
    Session.getEffectiveUser().getEmail() ||
    "";
  return getUser_(ss, email);
}
function assertWriteAccess_(area, owner) {
  const u = currentUser_();
  if (u.canSeeAll) return u;
  const a = String(area || "").toLowerCase(),
    uas = accessAreas_(u),
    own = String(owner || "").toLowerCase();
  const identity = [
    String(u.name || "").toLowerCase(),
    String(u.email || "").toLowerCase(),
  ].filter(Boolean);
  const ownerOk = !!own && identity.some((x) => own.includes(x));
  const areaOk =
    !a ||
    !uas.length ||
    uas.includes("my work") ||
    uas.some((ua) => a.includes(ua) || ua.includes(a));
  if (!areaOk && !ownerOk)
    throw new Error("You are not authorized to update this area.");
  return u;
}
function canSeeSensitive_(u) {
  return (
    !!(u && u.canSeeAll) ||
    /finance|executive|owner|coordinator/i.test(String(u?.role || ""))
  );
}

function ensureHeaders_(sh, headers) {
  const existing = sh
    .getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1))
    .getDisplayValues()[0];
  const missing = headers.filter((h) => !existing.includes(h));
  if (missing.length) {
    const start = existing.filter(Boolean).length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
  }
}

// ===== END HQ_Core.gs =====

// ===== BEGIN HQ_Checklists.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.0
function generateExpectedRuns_() {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const defs = readSheet_(ss, HQ.sheets.checklistDefs).filter(
    (x) => !/no/i.test(x["Active?"] || ""),
  );
  const runs = readSheet_(ss, HQ.sheets.checklistRuns);
  const now = new Date(),
    p = periodInfo_(now),
    today = Utilities.formatDate(now, HQ.tz, "yyyy-MM-dd");
  defs.forEach((d) => {
    let key = "",
      type = String(d.Cadence || "").toUpperCase(),
      scheduled = today;
    if (type === "DAILY") key = today;
    else if (type === "WEEKLY") key = p.weekKey;
    else if (type === "MONTHLY") key = p.monthKey;
    else return;
    if (
      runs.some(
        (r) =>
          r["Checklist ID"] === d["Checklist ID"] && r["Period Key"] === key,
      )
    )
      return;
    const items = readSheet_(ss, HQ.sheets.checklistItems).filter(
      (i) => i["Checklist ID"] === d["Checklist ID"],
    );
    appendRowObj_(ss, HQ.sheets.checklistRuns, {
      "Run ID": d["Checklist ID"] + "-" + key,
      "Checklist ID": d["Checklist ID"],
      Business: d.Business,
      Area: d.Area,
      "Checklist Name": d["Checklist Name"],
      "Period Key": key,
      "Period Type": type,
      "Scheduled Date": scheduled,
      Owner: d["Owner Role"],
      Status: "Not Started",
      "Required Items": items.filter((i) => /yes/i.test(i["Required?"] || ""))
        .length,
      "Completed Items": 0,
      "Completion %": 0,
      "On Time?": "",
      Exceptions: 0,
      "Evidence Complete?": "No",
      "Started At": "",
      "Completed At": "",
      "Last Update": new Date(),
    });
  });
}
function startChecklist(runId) {
  assertWriteAccess_(
    readSheet_(
      SpreadsheetApp.openById(HQ.spreadsheetId),
      HQ.sheets.checklistRuns,
    ).find((x) => x["Run ID"] === runId)?.Business || "",
    "",
  );
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId),
    sh = ss.getSheetByName(HQ.sheets.checklistRuns);
  const row = findRowBy_(sh, "Run ID", runId);
  if (!row) throw new Error("Run not found");
  setByHeader_(sh, row, "Status", "In Progress");
  setByHeader_(sh, row, "Started At", new Date());
  setByHeader_(sh, row, "Last Update", new Date());
  log_(
    ss,
    "CHECKLIST START",
    "",
    "Checklist Run",
    runId,
    "",
    "In Progress",
    "",
  );
  return getChecklistRun(runId);
}
function getChecklistRun(runId) {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const run = readSheet_(ss, HQ.sheets.checklistRuns).find(
    (x) => x["Run ID"] === runId,
  );
  if (!run) throw new Error("Run not found");
  const defs = readSheet_(ss, HQ.sheets.checklistItems)
    .filter((i) => i["Checklist ID"] === run["Checklist ID"])
    .sort((a, b) => Number(a.Sort) - Number(b.Sort));
  const state = getRunState_(ss, runId);
  return {
    run,
    items: defs.map((i) => ({
      ...i,
      state: state[i["Item ID"]] || { status: "", note: "", evidence: "" },
    })),
  };
}
function getRunState_(ss, runId) {
  const notes = readSheet_(ss, HQ.sheets.notes).filter(
    (n) =>
      n["Source Type"] === "Checklist Item" &&
      String(n["Source ID"] || "").startsWith(runId + "|"),
  );
  const state = {};
  notes.forEach((n) => {
    const parts = String(n["Source ID"]).split("|");
    const itemId = parts[1];
    try {
      state[itemId] = JSON.parse(n.Note);
    } catch (e) {}
  });
  return state;
}
function saveChecklistItem(payload) {
  assertWriteAccess_(
    readSheet_(
      SpreadsheetApp.openById(HQ.spreadsheetId),
      HQ.sheets.checklistRuns,
    ).find((x) => x["Run ID"] === payload.runId)?.Business || "",
    "",
  );
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const runId = payload.runId,
    itemId = payload.itemId;
  const allNotes = readSheet_(ss, HQ.sheets.notes);
  const sourceId = runId + "|" + itemId;
  const existingRow = findRowBy_(
    ss.getSheetByName(HQ.sheets.notes),
    "Source ID",
    sourceId,
  );
  const state = {
    status: payload.status || "",
    note: payload.note || "",
    evidence: payload.evidence || "",
    updated: new Date().toISOString(),
    user: Session.getActiveUser().getEmail(),
  };
  if (existingRow) {
    setByHeader_(
      ss.getSheetByName(HQ.sheets.notes),
      existingRow,
      "Timestamp",
      new Date(),
    );
    setByHeader_(
      ss.getSheetByName(HQ.sheets.notes),
      existingRow,
      "Note",
      JSON.stringify(state),
    );
    setByHeader_(
      ss.getSheetByName(HQ.sheets.notes),
      existingRow,
      "Author",
      Session.getActiveUser().getEmail(),
    );
  } else {
    appendRowObj_(ss, HQ.sheets.notes, {
      Timestamp: new Date(),
      "Business / Area": payload.area || "",
      "Source Type": "Checklist Item",
      "Source ID": sourceId,
      Note: JSON.stringify(state),
      Author: Session.getActiveUser().getEmail(),
    });
  }
  recalcRun_(ss, runId);
  log_(
    ss,
    "CHECKLIST ITEM UPDATE",
    payload.area || "",
    "Checklist Item",
    sourceId,
    "",
    payload.status || "",
    payload.note || "",
  );
  return getChecklistRun(runId);
}
function completeChecklist(runId) {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  recalcRun_(ss, runId, true);
  refreshIntelligence_();
  return getChecklistRun(runId);
}
function recalcRun_(ss, runId, attemptComplete) {
  const sh = ss.getSheetByName(HQ.sheets.checklistRuns),
    row = findRowBy_(sh, "Run ID", runId);
  if (!row) return;
  const run = readSheet_(ss, HQ.sheets.checklistRuns).find(
    (x) => x["Run ID"] === runId,
  );
  const items = readSheet_(ss, HQ.sheets.checklistItems).filter(
    (i) => i["Checklist ID"] === run["Checklist ID"],
  );
  const state = getRunState_(ss, runId);
  const required = items.filter((i) => /yes/i.test(i["Required?"] || ""));
  const completed = required.filter((i) =>
    ["PASS", "FAIL", "N/A"].includes(
      String((state[i["Item ID"]] || {}).status || "").toUpperCase(),
    ),
  );
  const failed = items.filter(
    (i) =>
      String((state[i["Item ID"]] || {}).status || "").toUpperCase() === "FAIL",
  );
  const evidenceReq = items.filter((i) =>
    /yes/i.test(i["Evidence Required?"] || ""),
  );
  const evComplete = evidenceReq.every((i) =>
    String((state[i["Item ID"]] || {}).evidence || "").trim(),
  );
  const pct = required.length
    ? Math.round((completed.length / required.length) * 100)
    : 100;
  setByHeader_(sh, row, "Required Items", required.length);
  setByHeader_(sh, row, "Completed Items", completed.length);
  setByHeader_(sh, row, "Completion %", pct);
  setByHeader_(sh, row, "Exceptions", failed.length);
  setByHeader_(sh, row, "Evidence Complete?", evComplete ? "Yes" : "No");
  setByHeader_(sh, row, "Last Update", new Date());
  if (attemptComplete) {
    if (pct < 100) throw new Error("Checklist is only " + pct + "% complete.");
    if (evidenceReq.length && !evComplete)
      throw new Error("Required evidence is missing.");
    setByHeader_(
      sh,
      row,
      "Status",
      failed.length ? "Completed with Exceptions" : "Completed",
    );
    setByHeader_(sh, row, "Completed At", new Date());
    setByHeader_(sh, row, "On Time?", isChecklistOnTime_(run) ? "Yes" : "No");
    failed.forEach((i) =>
      upsertExceptionFromChecklist_(ss, run, i, state[i["Item ID"]]),
    );
    log_(
      ss,
      "CHECKLIST COMPLETE",
      run.Business || run.Area,
      "Checklist Run",
      runId,
      "",
      failed.length ? "Completed with Exceptions" : "Completed",
      "",
    );
  } else if (pct > 0) {
    setByHeader_(sh, row, "Status", "In Progress");
  }
}
function upsertExceptionFromChecklist_(ss, run, item, state) {
  const sourceId = run["Run ID"] + "|" + item["Item ID"];
  const existing = readSheet_(ss, HQ.sheets.exceptions).find(
    (x) => x["Source ID"] === sourceId && !/closed/i.test(x.Status || ""),
  );
  if (existing) return;
  appendRowObj_(ss, HQ.sheets.exceptions, {
    "Exception ID": "EX-" + Utilities.getUuid().slice(0, 8),
    Date: new Date(),
    "Business / Area": run.Business || run.Area,
    "Source Type": "Checklist Item",
    "Source ID": sourceId,
    Exception: item.Item + (state && state.note ? " — " + state.note : ""),
    Severity: /yes/i.test(item["Escalate On Fail?"] || "") ? "High" : "Medium",
    "Financial Exposure": "",
    Owner: run.Owner,
    Status: "Open",
    "Next Action": "Resolve failed checklist item",
    Due: "",
    "Age Days": 0,
    "Recurring?": "",
    Evidence: state ? state.evidence : "",
    "Closed Date": "",
  });
}

function isChecklistOnTime_(run) {
  const now = new Date(),
    key = String(run["Period Key"] || "");
  if (run["Period Type"] === "DAILY")
    return Utilities.formatDate(now, HQ.tz, "yyyy-MM-dd") <= key;
  if (run["Period Type"] === "WEEKLY") {
    const p = periodInfo_(now);
    return p.weekKey <= key;
  }
  if (run["Period Type"] === "MONTHLY") {
    const p = periodInfo_(now);
    return p.monthKey <= key;
  }
  return true;
}

// ===== END HQ_Checklists.gs =====

// ===== BEGIN HQ_WorkRecords.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.0
function addWork(item) {
  assertWriteAccess_(item.function || "", item.owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId),
    sh = ss.getSheetByName(HQ.workSheet);
  const headers = sh.getRange(5, 1, 1, 21).getDisplayValues()[0];
  const ids =
    sh.getLastRow() > 5
      ? sh
          .getRange(6, 1, sh.getLastRow() - 5, 1)
          .getDisplayValues()
          .flat()
      : [];
  const max = ids.reduce(
    (m, id) => Math.max(m, Number(String(id).replace(/\D/g, "")) || 0),
    0,
  );
  const id = "W-" + String(max + 1).padStart(3, "0"),
    now = new Date();
  sh.appendRow([
    id,
    item.function || "",
    item.action || "",
    item.owner || "",
    item.type || "Action",
    item.priority || "PUSH",
    item.critical ? "Yes" : "No",
    item.resultProducing ? "Yes" : "No",
    item.due || "",
    item.status || "Open",
    item.waitingOn || "",
    item.blocked ? "Yes" : "No",
    "",
    item.evidence || "",
    now,
    now,
    item.escalate ? "Yes" : "No",
    item.plannedDay || "",
    item.why || "",
    "",
    "0d",
  ]);
  log_(
    ss,
    "WORK CREATED",
    item.function || "",
    "Work",
    id,
    "",
    item.status || "Open",
    item.action || "",
  );
  return { ok: true, id };
}
function updateWork(payload) {
  const ss0 = SpreadsheetApp.openById(HQ.spreadsheetId),
    sh0 = ss0.getSheetByName(HQ.workSheet);
  if (sh0 && sh0.getLastRow() >= 6) {
    const hs = sh0.getRange(5, 1, 1, 21).getDisplayValues()[0],
      m = headerMap_(hs),
      ids0 = sh0
        .getRange(6, 1, Math.max(sh0.getLastRow() - 5, 1), 1)
        .getDisplayValues()
        .flat(),
      ix = ids0.indexOf(payload.id);
    if (ix >= 0) {
      const rr = ix + 6;
      assertWriteAccess_(
        sh0.getRange(rr, m["Project / Function"] + 1).getDisplayValue(),
        sh0.getRange(rr, m.Owner + 1).getDisplayValue(),
      );
    }
  }
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId),
    sh = ss.getSheetByName(HQ.workSheet);
  const headers = sh.getRange(5, 1, 1, 21).getDisplayValues()[0],
    map = headerMap_(headers);
  const ids = sh
    .getRange(6, 1, Math.max(sh.getLastRow() - 5, 1), 1)
    .getDisplayValues()
    .flat();
  const idx = ids.indexOf(payload.id);
  if (idx < 0) throw new Error("Work item not found");
  const row = idx + 6;
  const fields = {
    Status: payload.status,
    "Waiting On": payload.waitingOn,
    "Blocked?": payload.blocked,
    "Result / Completion Note": payload.result,
    "Evidence / Drive Link": payload.evidence,
    "PLANNED DAY": payload.plannedDay,
    "WHY / OUTCOME SUPPORTED": payload.why,
  };
  Object.keys(fields).forEach((h) => {
    if (fields[h] !== undefined && map[h] !== undefined)
      sh.getRange(row, map[h] + 1).setValue(fields[h]);
  });
  if (map["Last Update"] !== undefined)
    sh.getRange(row, map["Last Update"] + 1).setValue(new Date());
  if (
    /done|complete/i.test(payload.status || "") &&
    map["COMPLETED AT"] !== undefined
  )
    sh.getRange(row, map["COMPLETED AT"] + 1).setValue(new Date());
  log_(
    ss,
    "WORK UPDATE",
    "",
    "Work",
    payload.id,
    "",
    payload.status || "",
    payload.result || "",
  );
  refreshIntelligence_();
  return { ok: true };
}
function addDecision(obj) {
  validateNextAction_({
    Status: obj.Status || "Open",
    Owner: obj.Owner,
    Due: obj.Due,
    Decision: obj.Decision,
  });
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Decision ID"] =
    obj["Decision ID"] || "D-" + Utilities.getUuid().slice(0, 8);
  obj.Date = obj.Date || new Date();
  appendRowObj_(ss, HQ.sheets.decisions, obj);
  log_(
    ss,
    "DECISION CREATED",
    obj["Business / Area"] || "",
    "Decision",
    obj["Decision ID"],
    "",
    obj.Status || "Open",
    obj.Decision || "",
  );
  return { ok: true };
}
function addTarget(obj) {
  assertWriteAccess_(obj.Business || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.targets, obj);
  return { ok: true };
}
function addBudget(obj) {
  assertWriteAccess_(obj.Business || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.budgets, obj);
  return { ok: true };
}
function addCustomer(obj) {
  assertWriteAccess_(obj.Business || "Edible", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.customers, obj);
  return { ok: true };
}
function addReview(obj) {
  assertWriteAccess_(obj.Business || "Edible", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.reviews, obj);
  return { ok: true };
}
function addLegacy(obj) {
  assertWriteAccess_("Legacy Closeout", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.legacy, obj);
  return { ok: true };
}
function addProperty(obj) {
  assertWriteAccess_("Buyahka / Property", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.property, obj);
  return { ok: true };
}
function addNote(obj) {
  assertWriteAccess_(obj.area || "", "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.notes, {
    Timestamp: new Date(),
    "Business / Area": obj.area || "",
    "Source Type": obj.sourceType || "General",
    "Source ID": obj.sourceId || "",
    Note: obj.note || "",
    Author: Session.getActiveUser().getEmail(),
  });
  log_(
    ss,
    "NOTE ADDED",
    obj.area || "",
    obj.sourceType || "General",
    obj.sourceId || "",
    "",
    obj.note || "",
    "",
  );
  return { ok: true };
}

// ===== END HQ_WorkRecords.gs =====

// ===== BEGIN HQ_Management.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.0
// Shared planning, registries, people/capacity, requests, and source/evidence management.
function addPlan(obj) {
  validateNextAction_({
    Status: obj.Status || "Open",
    Owner: obj.Owner,
    Due: obj.Due,
    "Objective / Priority": obj["Objective / Priority"],
  });
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Plan ID"] = obj["Plan ID"] || "P-" + Utilities.getUuid().slice(0, 8);
  appendRowObj_(ss, HQ.sheets.plans, obj);
  log_(
    ss,
    "PLAN CREATED",
    obj["Business / Area"] || "",
    "Plan",
    obj["Plan ID"],
    "",
    obj.Status || "Open",
    obj["Objective / Priority"] || "",
  );
  return { ok: true, id: obj["Plan ID"] };
}
function addRegistry(obj) {
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.registries, obj);
  log_(
    ss,
    "REGISTRY UPDATE",
    obj["Business / Area"] || "",
    obj["Registry Type"] || "Registry",
    obj.Name || "",
    "",
    obj.Status || "",
    obj["Purpose / Responsibility"] || "",
  );
  return { ok: true };
}
function addPerson(obj) {
  assertWriteAccess_(obj["Function / Area"] || "", obj.Name || obj.Email || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.people, obj);
  log_(
    ss,
    "PEOPLE UPDATE",
    obj["Function / Area"] || "",
    "Person",
    obj.Email || obj.Name || "",
    "",
    obj["Coverage Status"] || "",
    obj.Responsibilities || "",
  );
  return { ok: true };
}
function addRequest(obj) {
  validateNextAction_({
    Status: obj.Status || "Open",
    Owner: obj.Owner,
    Due: obj.Due,
    "Request / Issue": obj["Request / Issue"],
  });
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Request ID"] =
    obj["Request ID"] || "R-" + Utilities.getUuid().slice(0, 8);
  obj.Date = obj.Date || new Date();
  appendRowObj_(ss, HQ.sheets.requests, obj);
  if (/critical|high/i.test(obj["Severity / Urgency"] || ""))
    upsertAlert_(
      ss,
      obj["Business / Area"] || "Request",
      "Operational Request",
      obj["Request / Issue"] || "Request needs attention",
      obj["Severity / Urgency"] || "High",
      obj.Owner || "",
      "Request",
      obj["Request ID"],
    );
  log_(
    ss,
    "REQUEST CREATED",
    obj["Business / Area"] || "",
    "Request",
    obj["Request ID"],
    "",
    obj.Status || "Open",
    obj["Request / Issue"] || "",
  );
  return { ok: true, id: obj["Request ID"] };
}
function addSourceMap(obj) {
  assertWriteAccess_(obj["Business / Area"] || "", obj["Input Owner"] || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.sourceMap, obj);
  log_(
    ss,
    "SOURCE MAP UPDATE",
    obj["Business / Area"] || "",
    "Source Map",
    obj["Metric / Control"] || "",
    "",
    obj.Status || "",
    obj["Authoritative Source"] || "",
  );
  return { ok: true };
}
function savePeriodReview(obj) {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId),
    sh = ss.getSheetByName(HQ.sheets.periods);
  let row = findRowBy_(sh, "Period Key", obj.periodKey);
  if (!row) {
    appendRowObj_(ss, HQ.sheets.periods, {
      "Period Key": obj.periodKey,
      "Period Type": obj.periodType,
      Year: obj.year || "",
      Week: obj.week || "",
      Month: obj.month || "",
      Status: "Open",
    });
    row = sh.getLastRow();
  }
  [
    "Status",
    "Completion %",
    "Result Review Complete?",
    "Decision Review Complete?",
    "Next Period Plan Complete?",
    "Closed At",
    "Closed By",
  ].forEach((h) => {
    if (obj[h] !== undefined) setByHeader_(sh, row, h, obj[h]);
  });
  log_(
    ss,
    "PERIOD REVIEW",
    obj.area || "Shared Management",
    "Period",
    obj.periodKey,
    "",
    obj.Status || "Updated",
    "",
  );
  return { ok: true };
}
function saveReadiness(obj) {
  assertWriteAccess_(obj.Area || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.readiness, obj);
  log_(
    ss,
    "READINESS UPDATE",
    obj.Area || "",
    "Readiness",
    obj["System / Source"] || "",
    "",
    obj.Status || "",
    obj["Issue / Next Action"] || "",
  );
  return { ok: true };
}

function addReference(obj) {
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.reference, obj);
  log_(
    ss,
    "REFERENCE UPDATE",
    obj["Business / Area"] || "",
    "Reference",
    obj.Title || "",
    "",
    obj.Status || "",
    obj["Source / Drive Link"] || "",
  );
  return { ok: true };
}
function addTraining(obj) {
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.training, obj);
  log_(
    ss,
    "TRAINING UPDATE",
    obj["Business / Area"] || "",
    "Training",
    obj["Capability / Training"] || "",
    "",
    obj.Status || "",
    obj["Role / Person"] || "",
  );
  return { ok: true };
}
function addFinanceRegister(obj) {
  const u = assertWriteAccess_("Finance & Office", obj.Owner || "");
  if (!canSeeSensitive_(u))
    throw new Error("Finance register access is restricted.");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.financeReg, obj);
  log_(
    ss,
    "FINANCE REGISTER UPDATE",
    "Finance & Office",
    obj["Register Type"] || "Finance",
    obj["Account / Policy / Vendor / Tax"] || "",
    "",
    obj.Status || "",
    obj["Next Action"] || "",
  );
  return { ok: true };
}
function addPodcastItem(obj) {
  assertWriteAccess_("Podcast / Legacy", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Item ID"] = obj["Item ID"] || "PC-" + Utilities.getUuid().slice(0, 8);
  appendRowObj_(ss, HQ.sheets.podcast, obj);
  log_(
    ss,
    "PODCAST UPDATE",
    "Podcast / Legacy",
    obj["Item Type"] || "Podcast",
    obj["Item ID"],
    "",
    obj.Status || "",
    obj["Next Action"] || "",
  );
  return { ok: true, id: obj["Item ID"] };
}
function addPersonalRegister(obj) {
  const u = assertWriteAccess_("Personal / Ahmad", obj.Owner || "");
  if (
    !u.canSeeAll &&
    !/ahmad|owner|executive/i.test(
      String(u.name || "") + " " + String(u.role || ""),
    )
  )
    throw new Error("Personal register access is restricted.");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.personal, obj);
  log_(
    ss,
    "PERSONAL REGISTER UPDATE",
    "Personal / Ahmad",
    obj["Register Type"] || "Personal",
    obj["Item / Account / Policy"] || "",
    "",
    obj.Status || "",
    obj["Next Action"] || "",
  );
  return { ok: true };
}
function addCustomerFollowup(obj) {
  validateNextAction_({
    Status: obj.Status || "Open",
    Owner: obj.Owner,
    Due: obj.Due,
    "Next Action": obj["Next Action"],
  });
  assertWriteAccess_(obj.Business || "Edible", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Follow-up ID"] =
    obj["Follow-up ID"] || "CF-" + Utilities.getUuid().slice(0, 8);
  obj.Date = obj.Date || new Date();
  appendRowObj_(ss, HQ.sheets.customerFollowup, obj);
  log_(
    ss,
    "CUSTOMER FOLLOWUP",
    obj.Business || "Edible",
    "Customer Follow-up",
    obj["Follow-up ID"],
    "",
    obj.Status || "Open",
    obj["Next Action"] || "",
  );
  return { ok: true, id: obj["Follow-up ID"] };
}
function saveNotificationRule(obj) {
  const u = currentUser_();
  if (!u.canSeeAll)
    throw new Error("Only the owner/admin may change notification rules.");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Rule ID"] = obj["Rule ID"] || "NR-" + Utilities.getUuid().slice(0, 8);
  appendRowObj_(ss, HQ.sheets.notificationRules, obj);
  log_(
    ss,
    "NOTIFICATION RULE",
    "Shared Management",
    "Notification Rule",
    obj["Rule ID"],
    "",
    obj["Active?"] || "Yes",
    obj.Trigger || "",
  );
  return { ok: true, id: obj["Rule ID"] };
}

function addKsi(obj) {
  assertWriteAccess_(obj["Business / Area"] || "", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Last Updated"] = obj["Last Updated"] || new Date();
  appendRowObj_(ss, HQ.sheets.ksi, obj);
  log_(
    ss,
    "KSI UPDATE",
    obj["Business / Area"] || "",
    "KSI",
    obj["Metric / Indicator"] || "",
    "",
    obj.Status || "",
    obj["Next Move"] || "",
  );
  return { ok: true };
}
function addGardeniaPipeline(obj) {
  validateNextAction_({
    Status: "Open",
    Owner: obj.Owner,
    Due: obj["Next Follow-up"],
    "Next Action": obj["Next Follow-up"],
  });
  assertWriteAccess_("Gardenia's Fire", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.gardeniaPipeline, obj);
  log_(
    ss,
    "GARDENIA PIPELINE",
    "Gardenia's Fire",
    "Pipeline",
    obj["Account / Prospect"] || "",
    "",
    obj.Stage || "",
    obj["Next Follow-up"] || "",
  );
  return { ok: true };
}

function addSystemAccess(obj) {
  const u = currentUser_();
  if (
    !u.canSeeAll &&
    !/coordinator|finance|owner|executive/i.test(String(u.role || ""))
  )
    throw new Error("System access registry is restricted.");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  appendRowObj_(ss, HQ.sheets.systemAccess, obj);
  log_(
    ss,
    "SYSTEM ACCESS UPDATE",
    obj["Business / Area"] || "",
    "System Access",
    obj["System / Account"] || "",
    "",
    obj.Status || "",
    obj["User / Role"] || "",
  );
  return { ok: true };
}

function addGardeniaProduct(obj) {
  assertWriteAccess_("Gardenia's Fire", obj.Owner || "");
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj["Last Updated"] = obj["Last Updated"] || new Date();
  appendRowObj_(ss, HQ.sheets.gardeniaProduct, obj);
  log_(
    ss,
    "GARDENIA PRODUCT",
    "Gardenia's Fire",
    "Product / Costing",
    obj["Product / Test"] || "",
    "",
    obj["Test Status"] || "",
    obj["Open Assumption / Issue"] || "",
  );
  return { ok: true };
}
function captureInbox(obj) {
  const type = String(obj.captureType || "Work").toUpperCase(),
    area = obj.area || obj.function || "My Work";
  assertWriteAccess_(area, obj.owner || "");
  if (type === "NOTE" || type === "IDEA" || type === "PARK")
    return addNote({
      area,
      sourceType: type,
      sourceId: "CAPTURE",
      note: obj.text || obj.action || "",
    });
  if (type === "REQUEST" || type === "ISSUE")
    return addRequest({
      "Business / Area": area,
      "Request Type": type,
      "Request / Issue": obj.text || obj.action || "",
      "Severity / Urgency": obj.priority || "Medium",
      Owner: obj.owner || "",
      Status: "Open",
      Due: obj.due || "",
    });
  return addWork({
    function: area,
    owner: obj.owner || "",
    action: obj.text || obj.action || "",
    type: type === "WORK" ? "Action" : type,
    priority: obj.priority || "PUSH",
    critical: !!obj.critical,
    resultProducing: !!obj.resultProducing,
    due: obj.due || "",
    status: "Open",
    why: obj.why || "",
  });
}

function validateNextAction_(obj) {
  if (
    /done|closed|complete|resolved/i.test(
      String(obj.Status || obj.status || ""),
    )
  )
    return;
  const owner = obj.Owner || obj.owner || "",
    due = obj.Due || obj.due || "",
    next =
      obj["Next Action"] ||
      obj["Objective / Priority"] ||
      obj["Request / Issue"] ||
      obj.Decision ||
      obj.text ||
      "";
  if (!String(next).trim() || !String(owner).trim() || !String(due).trim())
    throw new Error(
      "Open management items require Next Action, Owner, and Due.",
    );
}
function addCustomerIssue(obj) {
  assertWriteAccess_(obj.Business || "Edible", obj.Owner || "");
  validateNextAction_({
    Status: obj.Status || "Open",
    Owner: obj.Owner,
    Due: obj.Due || obj.Date,
    "Next Action": obj["Recovery / Action"],
  });
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  obj.Date = obj.Date || new Date();
  const p = periodInfo_(new Date(obj.Date));
  obj.Week = obj.Week || p.week;
  obj.Year = obj.Year || p.weekYear;
  appendRowObj_(ss, HQ.sheets.customerIssues, obj);
  log_(
    ss,
    "CUSTOMER ISSUE",
    obj.Business || "Edible",
    obj["Issue Type"] || "Customer Issue",
    String(obj.Customer || ""),
    "",
    obj.Status || "Open",
    obj["Recovery / Action"] || "",
  );
  return { ok: true };
}

// ===== END HQ_Management.gs =====

// ===== BEGIN HQ_Intelligence.gs =====
// Ahmad HQ Phase 1 Reconciled — Release 1.4.0
function refreshIntelligence_() {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId),
    p = periodInfo_(new Date());
  const runs = readSheet_(ss, HQ.sheets.checklistRuns);
  const active = runs.filter(
    (r) =>
      r["Period Key"] ===
        Utilities.formatDate(new Date(), HQ.tz, "yyyy-MM-dd") ||
      r["Period Key"] === p.weekKey ||
      r["Period Key"] === p.monthKey,
  );
  active.forEach((r) => {
    const pct = Number(r["Completion %"] || 0);
    if (
      (r["Period Type"] === "WEEKLY" || r["Period Type"] === "MONTHLY") &&
      pct < 100
    ) {
      upsertAlert_(
        ss,
        r.Business || r.Area,
        "Incomplete Control",
        r["Checklist Name"] + " is " + pct + "% complete",
        "Medium",
        r.Owner,
        "Checklist Run",
        r["Run ID"],
      );
    }
    if (Number(r.Exceptions || 0) > 0) {
      upsertAlert_(
        ss,
        r.Business || r.Area,
        "Checklist Exception",
        r["Checklist Name"] + " has " + r.Exceptions + " exception(s)",
        "High",
        r.Owner,
        "Checklist Run",
        r["Run ID"],
      );
    }
  });
  const work = readWork_(ss);
  deteriorationAlerts_(ss);
  decisionCapacityAlerts_(ss);
  work
    .filter(
      (w) => w["Blocked?"] === "Yes" || w["Management Escalation?"] === "Yes",
    )
    .forEach((w) => {
      upsertAlert_(
        ss,
        w["Project / Function"] || "Work",
        "Work Exception",
        (w["Work Item / Next Action"] || "Work item") + " needs attention",
        "High",
        w.Owner,
        "Work",
        w.ID,
      );
    });
}
function buildIntelligence_(ss, p) {
  const runs = readSheet_(ss, HQ.sheets.checklistRuns),
    defs = readSheet_(ss, HQ.sheets.checklistDefs);
  const currentKeys = [
    Utilities.formatDate(new Date(), HQ.tz, "yyyy-MM-dd"),
    p.weekKey,
    p.monthKey,
  ];
  const current = runs.filter((r) => currentKeys.includes(r["Period Key"]));
  const req = current.filter((r) =>
    /yes/i.test(
      (defs.find((d) => d["Checklist ID"] === r["Checklist ID"]) || {})[
        "Required?"
      ] || "Yes",
    ),
  );
  const complete = req.filter((r) => /completed/i.test(r.Status || ""));
  const avg = req.length
    ? Math.round(
        req.reduce((a, r) => a + Number(r["Completion %"] || 0), 0) /
          req.length,
      )
    : 100;
  const exceptions = readSheet_(ss, HQ.sheets.exceptions).filter(
    (x) => !/closed/i.test(x.Status || ""),
  );
  exceptions.forEach((x) => (x["Attention Score"] = attentionScore_(x)));
  exceptions.sort(
    (a, b) => Number(b["Attention Score"]) - Number(a["Attention Score"]),
  );
  const alerts = readSheet_(ss, HQ.sheets.alerts).filter(
    (x) => !/resolved|closed/i.test(x.Status || ""),
  );
  const work = readWork_(ss),
    openWork = work.filter(
      (x) => !/done|complete|closed/i.test(x.Status || ""),
    );
  const blocked = openWork.filter((x) => /^yes$/i.test(x["Blocked?"] || ""));
  const escalated = openWork.filter((x) =>
    /^yes$/i.test(x["Management Escalation?"] || ""),
  );
  const waiting = openWork.filter((x) => String(x["Waiting On"] || "").trim());
  const critical = openWork.filter((x) => x["Critical Move?"] === "Yes");
  const activity = readSheet_(ss, HQ.sheets.activity),
    cutoff = new Date(Date.now() - 7 * 86400000);
  const activeUsers = [
    ...new Set(
      activity
        .filter((a) => new Date(a.Timestamp) >= cutoff)
        .map((a) => a.User)
        .filter(Boolean),
    ),
  ];
  const trend = completionTrend_(runs, 13);
  const cadence = cadenceAdherence_(runs, defs);
  const resultTrends = resultTrend_(readSheet_(ss, HQ.sheets.targets), 13);
  const evidence = evidenceIntelligence_(ss, current);
  const staleWork = staleWork_(openWork);
  const recurring = recurringExceptionIntelligence_(exceptions);
  const notificationRules = readSheet_(ss, HQ.sheets.notificationRules).filter(
    (r) => !/no/i.test(r["Active?"] || "Yes"),
  );
  const completionBreakdown = completionBreakdown_(runs);
  const customerIntel = customerIntelligence_(
    readSheet_(ss, HQ.sheets.customers),
    readSheet_(ss, HQ.sheets.customerFollowup),
  );
  const customerIssueIntel = customerIssueIntelligence_(
    readSheet_(ss, HQ.sheets.customerIssues),
    p,
  );
  const rollupGraph = rollupGraph_(ss, p);
  return {
    completionPct: avg,
    requiredRuns: req.length,
    completedRuns: complete.length,
    checklistExceptions: current.reduce(
      (a, r) => a + Number(r.Exceptions || 0),
      0,
    ),
    openExceptions: exceptions.length,
    openAlerts: alerts.length,
    openWork: openWork.length,
    blocked: blocked.length,
    escalated: escalated.length,
    waiting: waiting.length,
    critical: critical.length,
    activeUsers7d: activeUsers.length,
    recentAlerts: alerts.slice(-10).reverse(),
    criticalMoves: critical.slice(0, 10),
    exceptions: exceptions.slice(0, 15),
    completionTrend: trend,
    cadence,
    resultTrends,
    evidence,
    staleWork,
    recurringExceptions: recurring,
    notificationRules,
    completionBreakdown,
    customerIntel,
    customerIssueIntel,
    rollupGraph,
    missedRuns: req
      .filter((r) => Number(r["Completion %"] || 0) < 100)
      .map((r) => ({
        runId: r["Run ID"],
        name: r["Checklist Name"],
        owner: r.Owner,
        pct: Number(r["Completion %"] || 0),
        period: r["Period Key"],
      })),
  };
}
function attentionScore_(x) {
  const sev = { Critical: 40, High: 30, Medium: 20, Low: 10 }[x.Severity] || 10;
  const age = Math.min(Number(x["Age Days"] || 0), 30);
  const money = Math.min(
    Math.round(Number(x["Financial Exposure"] || 0) / 1000),
    20,
  );
  const recur = /yes/i.test(x["Recurring?"] || "") ? 15 : 0;
  return sev + age + money + recur;
}
function completionTrend_(runs, weeks) {
  const weekly = {};
  runs
    .filter((r) => r["Period Type"] === "WEEKLY")
    .forEach((r) => {
      const k = r["Period Key"];
      if (!weekly[k]) weekly[k] = [];
      weekly[k].push(Number(r["Completion %"] || 0));
    });
  return Object.keys(weekly)
    .sort()
    .slice(-weeks)
    .map((k) => ({
      period: k,
      completion: Math.round(
        weekly[k].reduce((a, b) => a + b, 0) / weekly[k].length,
      ),
    }));
}
function buildBriefs_(ss, p, I) {
  const targets = readSheet_(ss, HQ.sheets.targets),
    work = readWork_(ss),
    decisions = readSheet_(ss, HQ.sheets.decisions),
    exceptions = readSheet_(ss, HQ.sheets.exceptions);
  const weekTargets = targets.filter(
    (t) => String(t.Week || "") === String(p.week),
  );
  const monthTargets = targets.filter(
    (t) => String(t.Month || "") === String(p.month),
  );
  return {
    weekly: {
      period: p.weekKey,
      completion: I.completionPct,
      misses: I.missedRuns.length,
      exceptions: I.openExceptions,
      blocked: I.blocked,
      escalated: I.escalated || 0,
      criticalMoves: work
        .filter(
          (w) =>
            w["Critical Move?"] === "Yes" &&
            !/done|complete|closed/i.test(w.Status || ""),
        )
        .slice(0, 6),
      results: weekTargets.slice(-12),
      decisions: decisions
        .filter((d) => !/closed|done/i.test(d.Status || ""))
        .slice(-8),
    },
    monthly: {
      period: p.monthKey,
      completion: I.completionPct,
      exceptions: exceptions.filter((e) => !/closed/i.test(e.Status || ""))
        .length,
      results: monthTargets.slice(-20),
      decisions: decisions.slice(-12),
    },
  };
}
function upsertAlert_(
  ss,
  area,
  type,
  message,
  severity,
  owner,
  sourceType,
  sourceId,
) {
  const rows = readSheet_(ss, HQ.sheets.alerts);
  const hit = rows.find(
    (a) =>
      a["Source ID"] === sourceId &&
      a.Type === type &&
      !/resolved|closed/i.test(a.Status || ""),
  );
  if (hit) return;
  appendRowObj_(ss, HQ.sheets.alerts, {
    "Alert ID": "AL-" + Utilities.getUuid().slice(0, 8),
    Created: new Date(),
    "Business / Area": area,
    Type: type,
    Message: message,
    Severity: severity,
    Owner: owner,
    Status: "Open",
    "Source Type": sourceType,
    "Source ID": sourceId,
    Due: "",
    "Resolved At": "",
  });
}

function cadenceAdherence_(runs, defs) {
  const out = {
    DAILY: { expected: 0, complete: 0, late: 0, missed: 0 },
    WEEKLY: { expected: 0, complete: 0, late: 0, missed: 0 },
    MONTHLY: { expected: 0, complete: 0, late: 0, missed: 0 },
  };
  runs.forEach((r) => {
    const c = String(r["Period Type"] || "").toUpperCase();
    if (!out[c]) return;
    const d = defs.find((x) => x["Checklist ID"] === r["Checklist ID"]) || {};
    if (/^no$/i.test(d["Required?"] || "")) return;
    out[c].expected++;
    if (/completed/i.test(r.Status || "")) {
      out[c].complete++;
      if (/^no$/i.test(r["On Time?"] || "")) out[c].late++;
    } else if (Number(r["Completion %"] || 0) < 100) out[c].missed++;
  });
  return out;
}
function resultTrend_(targets, weeks) {
  const grouped = {};
  targets
    .filter((t) => t.Week)
    .forEach((t) => {
      const k =
          String(t.Year || "") + "-W" + String(t.Week || "").padStart(2, "0"),
        key = (t.Business || "") + "|" + (t.Metric || "");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        period: k,
        actual: Number(String(t.Actual || "").replace(/[$,% ,]/g, "")) || 0,
        target: Number(String(t.Target || "").replace(/[$,% ,]/g, "")) || 0,
        variance: Number(String(t.Variance || "").replace(/[$,% ,]/g, "")) || 0,
      });
    });
  Object.keys(grouped).forEach(
    (k) =>
      (grouped[k] = grouped[k]
        .sort((a, b) => a.period.localeCompare(b.period))
        .slice(-weeks)),
  );
  return grouped;
}
function evidenceIntelligence_(ss, currentRuns) {
  const notes = readSheet_(ss, HQ.sheets.notes),
    required = readSheet_(ss, HQ.sheets.checklistItems).filter((i) =>
      /yes/i.test(i["Evidence Required?"] || ""),
    );
  let expected = 0,
    present = 0,
    missing = [];
  currentRuns.forEach((r) =>
    required
      .filter((i) => i["Checklist ID"] === r["Checklist ID"])
      .forEach((i) => {
        expected++;
        const id = r["Run ID"] + "|" + i["Item ID"],
          n = notes.find((x) => x["Source ID"] === id);
        let ok = false;
        try {
          ok = !!JSON.parse(n?.Note || "{}").evidence;
        } catch (e) {}
        if (ok) present++;
        else
          missing.push({
            runId: r["Run ID"],
            item: i.Item,
            owner: r.Owner,
            period: r["Period Key"],
          });
      }),
  );
  return {
    expected,
    present,
    missing: missing.slice(0, 25),
    completionPct: expected ? Math.round((present / expected) * 100) : 100,
  };
}
function staleWork_(openWork) {
  const now = Date.now();
  return openWork
    .map((w) => {
      let d = new Date(w["Last Update"] || w["Created / Captured"] || "");
      let age = isNaN(d) ? 0 : Math.floor((now - d.getTime()) / 86400000);
      return { ...w, "Calculated Age Days": age };
    })
    .filter((w) => w["Calculated Age Days"] >= 7)
    .sort((a, b) => b["Calculated Age Days"] - a["Calculated Age Days"])
    .slice(0, 25);
}

function recurringExceptionIntelligence_(exceptions) {
  const g = {};
  exceptions.forEach((e) => {
    const key = [
      e["Business / Area"],
      e["Source Type"],
      String(e.Exception || "")
        .toLowerCase()
        .replace(/\d+/g, "#"),
    ].join("|");
    if (!g[key]) g[key] = [];
    g[key].push(e);
  });
  return Object.values(g)
    .filter((a) => a.length >= 2)
    .map((a) => ({
      area: a[0]["Business / Area"],
      exception: a[0].Exception,
      count: a.length,
      owner: a[0].Owner,
      severity: a[0].Severity,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function completionBreakdown_(runs) {
  const bucket = (field) => {
    const g = {};
    runs.forEach((r) => {
      const k = String(r[field] || "Unassigned");
      if (!g[k]) g[k] = [];
      g[k].push(Number(r["Completion %"] || 0));
    });
    return Object.keys(g)
      .map((k) => ({
        name: k,
        pct: Math.round(g[k].reduce((a, b) => a + b, 0) / g[k].length),
        runs: g[k].length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  return {
    business: bucket("Business"),
    area: bucket("Area"),
    owner: bucket("Owner"),
  };
}
function customerIntelligence_(customers, followups) {
  const now = Date.now();
  const scored = customers
    .map((c) => {
      const rev = Number(String(c.Revenue || "").replace(/[$,% ,]/g, "")) || 0,
        orders = Number(c.Orders || 0) || 0;
      let last = new Date(c["Last Order"] || c.Date || "");
      let days = isNaN(last)
        ? 999
        : Math.floor((now - last.getTime()) / 86400000);
      let score =
        rev +
        orders * 25 +
        (days <= 30 ? 200 : days <= 90 ? 100 : 0) +
        (/yes/i.test(c["Business Opportunity?"] || "") ? 100 : 0);
      return {
        ...c,
        "Relationship Score": Math.round(score),
        "Recency Days": days,
      };
    })
    .sort((a, b) => b["Relationship Score"] - a["Relationship Score"]);
  const lapsed = scored
    .filter((c) => c["Recency Days"] > 60 && c["Recency Days"] < 999)
    .slice(0, 50);
  const open = followups.filter(
    (f) => !/done|closed|complete/i.test(f.Status || ""),
  );
  const existing = new Set(
    open.map((f) => String(f["Customer / Recipient"] || "").toLowerCase()),
  );
  const suggestions = [];
  scored.slice(0, 30).forEach((c) => {
    const nm = String(c.Customer || "");
    if (
      nm &&
      !existing.has(nm.toLowerCase()) &&
      (/yes/i.test(c["Business Opportunity?"] || "") ||
        /yes/i.test(c["Recipient?"] || "") ||
        c["Recency Days"] > 60)
    ) {
      suggestions.push({
        customer: nm,
        trigger:
          c["Recency Days"] > 60
            ? "Lapsed / Reactivation"
            : /yes/i.test(c["Business Opportunity?"] || "")
              ? "Business Opportunity"
              : "Recipient Opportunity",
        priority: c["Relationship Score"] > 500 ? "High" : "Medium",
        nextAction: c["Next Action"] || "Review and assign follow-up",
        owner: c.Owner || "",
      });
    }
  });
  return {
    top: scored.slice(0, 200),
    lapsed,
    suggestions: suggestions.slice(0, 30),
    openFollowups: open.length,
    segments: {
      repeat: customers.filter((c) => /repeat/i.test(c["New / Repeat"] || ""))
        .length,
      new: customers.filter((c) => /new/i.test(c["New / Repeat"] || "")).length,
      business: customers.filter((c) =>
        /yes/i.test(c["Business Opportunity?"] || ""),
      ).length,
      recipients: customers.filter((c) => /yes/i.test(c["Recipient?"] || ""))
        .length,
    },
  };
}

function deteriorationAlerts_(ss) {
  const targets = readSheet_(ss, HQ.sheets.targets),
    g = {};
  targets
    .filter((t) => t.Week)
    .forEach((t) => {
      const k = (t.Business || "") + "|" + (t.Metric || "");
      if (!g[k]) g[k] = [];
      g[k].push(t);
    });
  Object.keys(g).forEach((k) => {
    const a = g[k]
      .sort((x, y) =>
        (String(x.Year) + String(x.Week).padStart(2, "0")).localeCompare(
          String(y.Year) + String(y.Week).padStart(2, "0"),
        ),
      )
      .slice(-3);
    if (a.length < 2) return;
    const bad = a.slice(-2).every((x) => {
      let v = Number(
        String(x["Variance %"] || x.Variance || "").replace(/[$,% ,]/g, ""),
      );
      return !isNaN(v) && v < 0;
    });
    if (bad) {
      const x = a[a.length - 1];
      upsertAlert_(
        ss,
        x.Business || "Results",
        "Deteriorating Result",
        (x.Metric || "Metric") + " has missed target for 2 consecutive periods",
        "High",
        x.Owner || "",
        "Target",
        k,
      );
    }
  });
}
function decisionCapacityAlerts_(ss) {
  const now = new Date(),
    decisions = readSheet_(ss, HQ.sheets.decisions),
    people = readSheet_(ss, HQ.sheets.people);
  decisions
    .filter(
      (d) =>
        !/closed|done|resolved/i.test(d.Status || "") &&
        d.Due &&
        new Date(d.Due) < now,
    )
    .forEach((d) =>
      upsertAlert_(
        ss,
        d["Business / Area"] || "Decision",
        "Decision Required",
        (d.Decision || "Decision") + " is overdue",
        "High",
        d.Owner || "",
        "Decision",
        d["Decision ID"] || d.Decision,
      ),
    );
  people
    .filter((p) =>
      /gap|conflict|overload|missing/i.test(p["Coverage Status"] || ""),
    )
    .forEach((p) =>
      upsertAlert_(
        ss,
        p["Function / Area"] || "People",
        "Capacity Contradiction",
        (p.Name || "Role") + " has a coverage/capacity issue",
        "Medium",
        p.Name || "",
        "Person",
        p.Email || p.Name,
      ),
    );
}

function customerIssueIntelligence_(issues, p) {
  const w = issues.filter(
    (x) =>
      String(x.Week || "") === String(p.week) &&
      String(x.Year || "") === String(p.weekYear),
  );
  const byType = {};
  w.forEach((x) => {
    const k = x["Issue Type"] || "Other";
    if (!byType[k]) byType[k] = { count: 0, value: 0, themes: {} };
    byType[k].count++;
    byType[k].value +=
      Number(String(x["Amount / Value"] || "").replace(/[$,% ,]/g, "")) || 0;
    const t = x["Reason / Theme"] || "Unspecified";
    byType[k].themes[t] = (byType[k].themes[t] || 0) + 1;
  });
  return {
    week: p.weekKey,
    total: w.length,
    totalValue: w.reduce(
      (a, x) =>
        a +
        (Number(String(x["Amount / Value"] || "").replace(/[$,% ,]/g, "")) ||
          0),
      0,
    ),
    byType,
    rows: w.slice(-100).reverse(),
  };
}
function canonicalArea_(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  if (s === "edible operations" || s === "edible" || s === "edible management")
    return "Edible";
  if (s === "gardenia's fire" || s === "gardenias fire" || s === "gardenia")
    return "Gardenia's Fire";
  if (s === "finance & office" || s === "finance and office" || s === "finance")
    return "Finance & Office";
  if (s === "podcast / legacy" || s === "podcast & legacy" || s === "podcast")
    return "Podcast / Legacy";
  if (s === "legacy closeout") return "Legacy Closeout";
  if (
    s === "ahmad personal finance / life" ||
    s === "personal / ahmad" ||
    s === "personal"
  )
    return "Personal / Ahmad";
  if (s === "people / systems" || s === "people & systems" || s === "people")
    return "People & Systems";
  if (s === "buyahka / property" || s === "property")
    return "Buyahka / Property";
  if (s === "iron marks") return "Iron Marks";
  return value || "Shared Management";
}
function rollupGraph_(ss, p) {
  const work = readWork_(ss),
    plans = readSheet_(ss, HQ.sheets.plans),
    targets = readSheet_(ss, HQ.sheets.targets),
    runs = readSheet_(ss, HQ.sheets.checklistRuns),
    areas = {};
  const add = (area, type, row) => {
    area = canonicalArea_(area);
    if (!areas[area])
      areas[area] = { work: [], plans: [], targets: [], controls: [] };
    areas[area][type].push(row);
  };
  work.forEach((x) => add(x["Project / Function"], "work", x));
  plans
    .filter(
      (x) => x["Period Key"] === p.weekKey || x["Period Key"] === p.monthKey,
    )
    .forEach((x) => add(x["Business / Area"], "plans", x));
  targets
    .filter(
      (x) =>
        String(x.Week || "") === String(p.week) ||
        String(x.Month || "") === String(p.month),
    )
    .forEach((x) => add(x.Business, "targets", x));
  runs
    .filter(
      (x) => x["Period Key"] === p.weekKey || x["Period Key"] === p.monthKey,
    )
    .forEach((x) => add(x.Business || x.Area, "controls", x));
  return Object.keys(areas)
    .sort()
    .map((area) => ({
      area,
      workOpen: areas[area].work.filter(
        (x) => !/done|closed|complete/i.test(x.Status || ""),
      ).length,
      plansOpen: areas[area].plans.filter(
        (x) => !/done|closed|complete/i.test(x.Status || ""),
      ).length,
      targetCount: areas[area].targets.length,
      controlCount: areas[area].controls.length,
      rows: areas[area],
    }));
}

// ===== END HQ_Intelligence.gs =====

// ===== RELEASE 1.4.2 — CHUNKED STARTUP PATCH =====
function getBootstrapLite() {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const email =
    Session.getActiveUser().getEmail() ||
    Session.getEffectiveUser().getEmail() ||
    "";
  const user = getUser_(ss, email);
  if (!user.authorized)
    throw new Error(
      "This Google account is not authorized for Ahmad HQ. Add it to HQ_ACCESS first.",
    );
  const p = periodInfo_(new Date());
  const work = readWork_(ss);
  const runs = readSheet_(ss, HQ.sheets.checklistRuns);
  const targets = readSheet_(ss, HQ.sheets.targets);
  const alerts = readSheet_(ss, HQ.sheets.alerts);
  const decisions = readSheet_(ss, HQ.sheets.decisions);
  const plans = readSheet_(ss, HQ.sheets.plans);
  const currentRuns = runs.filter((r) =>
    [p.weekKey, p.monthKey].includes(r["Period Key"]),
  );
  const requiredRuns = currentRuns.length;
  const completedRuns = currentRuns.filter((r) =>
    /completed/i.test(r.Status || ""),
  ).length;
  const openWork = work.filter(
    (w) => !/done|complete|closed/i.test(w.Status || ""),
  );
  const intel = {
    completionPct: requiredRuns
      ? Math.round((completedRuns / requiredRuns) * 100)
      : 100,
    completedRuns,
    requiredRuns,
    openExceptions: 0,
    blocked: openWork.filter((w) => /^yes$/i.test(w["Blocked?"] || "")).length,
    escalated: openWork.filter((w) =>
      /^yes$/i.test(w["Management Escalation?"] || ""),
    ).length,
    critical: openWork.filter((w) => /yes/i.test(w["Critical Move?"] || ""))
      .length,
    criticalMoves: openWork
      .filter((w) => /yes/i.test(w["Critical Move?"] || ""))
      .slice(0, 6),
    openAlerts: alerts.filter((a) => !/resolved|closed/i.test(a.Status || ""))
      .length,
    recentAlerts: alerts
      .filter((a) => !/resolved|closed/i.test(a.Status || ""))
      .slice(-6)
      .reverse(),
    checklistExceptions: currentRuns.reduce(
      (n, r) => n + (Number(r.Exceptions) || 0),
      0,
    ),
    activeUsers7d: 0,
    customerIntel: {
      top: [],
      lapsed: [],
      suggestions: [],
      openFollowups: 0,
      segments: {},
    },
    customerIssueIntel: {
      week: p.weekKey,
      total: 0,
      totalValue: 0,
      byType: {},
      rows: [],
    },
    cadence: {},
    completionTrend: [],
    evidence: {},
    staleWork: [],
    recurringExceptions: [],
    completionBreakdown: { business: [], area: [], owner: [] },
    rollupGraph: [],
  };
  const result = {
    user: user,
    period: p,
    release: { version: "1.4.10", name: "Permission Fix", schemaVersion: 4 },
    work: work,
    checklistRuns: runs,
    targets: targets,
    alerts: alerts,
    decisions: decisions,
    plans: plans,
    intelligence: intel,
  };
  return user.canSeeAll ? result : filterBootstrapForUser_(result, user);
}

function getBootstrapChunk(name) {
  const ss = SpreadsheetApp.openById(HQ.spreadsheetId);
  const email =
    Session.getActiveUser().getEmail() ||
    Session.getEffectiveUser().getEmail() ||
    "";
  const user = getUser_(ss, email);
  if (!user.authorized) throw new Error("Unauthorized");
  const p = periodInfo_(new Date());
  let out = {};
  if (name === "ops") {
    out = {
      checklistDefs: readSheet_(ss, HQ.sheets.checklistDefs),
      checklistItems: readSheet_(ss, HQ.sheets.checklistItems),
      budgets: readSheet_(ss, HQ.sheets.budgets),
      customers: readSheet_(ss, HQ.sheets.customers),
      reviews: readSheet_(ss, HQ.sheets.reviews),
      exceptions: readSheet_(ss, HQ.sheets.exceptions),
      customerFollowup: readSheet_(ss, HQ.sheets.customerFollowup),
      ksi: readSheet_(ss, HQ.sheets.ksi),
      gardeniaPipeline: readSheet_(ss, HQ.sheets.gardeniaPipeline),
      gardeniaProduct: readSheet_(ss, HQ.sheets.gardeniaProduct),
      customerIssues: readSheet_(ss, HQ.sheets.customerIssues),
    };
  } else if (name === "admin") {
    const accessRows = readSheet_(ss, HQ.sheets.access);
    const teamDirectory = accessRows
      .filter((x) => !/no/i.test(x["Active?"] || "Yes"))
      .map((x) => ({
        Name: x.Name,
        Role: x.Role,
        Area: x.Area,
        "Active?": x["Active?"],
      }));
    out = {
      teamDirectory: teamDirectory,
      legacy: readSheet_(ss, HQ.sheets.legacy),
      property: readSheet_(ss, HQ.sheets.property),
      readiness: readSheet_(ss, HQ.sheets.readiness),
      periods: readSheet_(ss, HQ.sheets.periods),
      registries: readSheet_(ss, HQ.sheets.registries),
      people: readSheet_(ss, HQ.sheets.people),
      requests: readSheet_(ss, HQ.sheets.requests),
      sourceMap: readSheet_(ss, HQ.sheets.sourceMap),
      reference: readSheet_(ss, HQ.sheets.reference),
      training: readSheet_(ss, HQ.sheets.training),
      financeReg: readSheet_(ss, HQ.sheets.financeReg),
      podcast: readSheet_(ss, HQ.sheets.podcast),
      personalReg: readSheet_(ss, HQ.sheets.personal),
      systemAccess: readSheet_(ss, HQ.sheets.systemAccess),
      notificationRules: readSheet_(ss, HQ.sheets.notificationRules),
    };
  } else if (name === "intel") {
    out.intelligence = buildIntelligence_(ss, p);
    out.briefs = buildBriefs_(ss, p, out.intelligence);
  }
  if (user.canSeeAll) return out;
  const shell = Object.assign(
    {
      user: user,
      period: p,
      work: [],
      checklistRuns: [],
      checklistDefs: [],
      checklistItems: [],
      targets: [],
      budgets: [],
      customers: [],
      reviews: [],
      decisions: [],
      exceptions: [],
      alerts: [],
      legacy: [],
      property: [],
      readiness: [],
      periods: [],
      access: [],
      activity: [],
      plans: [],
      registries: [],
      people: [],
      requests: [],
      sourceMap: [],
      reference: [],
      training: [],
      financeReg: [],
      podcast: [],
      personalReg: [],
      customerFollowup: [],
      notificationRules: [],
      teamDirectory: [],
      ksi: [],
      gardeniaPipeline: [],
      systemAccess: [],
      gardeniaProduct: [],
      customerIssues: [],
      closeLegacy: [],
    },
    out,
  );
  const filtered = filterBootstrapForUser_(shell, user);
  const picked = {};
  Object.keys(out).forEach((k) => (picked[k] = filtered[k]));
  return picked;
}

// ===== Release 1.4.5 — transport-safe JSON bridge =====
function getBootstrapLiteJson() {
  return JSON.stringify(getBootstrapLite());
}
function getBootstrapChunkJson(name) {
  return JSON.stringify(getBootstrapChunk(name));
}
