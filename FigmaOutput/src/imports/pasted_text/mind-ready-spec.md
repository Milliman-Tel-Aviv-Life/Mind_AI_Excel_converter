## Role and goal

You are designing **Mind Ready** -- a desktop web application actuaries use to make an Excel model ready for upload into **Milliman Mind** (an actuarial modelling platform that imports Excel workbooks; in Mind, a *grid* is a block of cells named by a `#Title /Flag` cell above it, *loops* are dimensions created with `MM_LOOP`, and the `MM_` functions come from the MMForExcel add-in). The app analyzes a workbook against 94 readiness rules mined from the Mind knowledge base, applies the corrections the user approves through Excel itself, offers an assistant that answers questions about the workbook and makes changes on request, runs a real Excel recalculation, and produces verified reports.

The audience for the result is the **creators of Milliman Mind**. The interface must feel like a native companion to their platform: precise, calm, trustworthy, and visibly fluent in Mind's own concepts (grids, titles, flags, loops, MM_ functions, instances, readiness). Impress with clarity and rigour, not decoration. Build it as a production-quality **React + TypeScript** web app (Tailwind or CSS variables, no UI kit lock-in), with a strictly separated data layer and realistic mock data so it runs standalone; a Python backend will be connected afterwards.

## Design principles (non-negotiable)

1. **Honesty over reassurance.** Statuses are exactly the engine's: `PASS`, `WARNING`, `ERROR`, `REQUIRES_USER_INPUT`, `NOT_SUPPORTED`. The overall status is the worst finding. `PASS` is only ever shown after a real recalculation; never show a "ready" badge, score, or progress ring that implies readiness without it.
2. **The original file is never modified.** Every action produces a new, versioned copy written by Excel and verified to open. Show this lineage.
3. **Every change is reviewable before it happens.** Cell-by-cell before/after, per-action approval, an append-only change log afterwards.
4. **One thing at a time.** Low clutter, generous whitespace, plain language, short sentences. No dashboards of vanity metrics.
5. **Mind fluency.** Use Mind vocabulary consistently: workbook › sheet › grid; `#Title /Flag`; loop; `MM_RESULT`; instance; readiness rule `RES-002`.

## Information architecture

Left rail (persistent, collapsible): **Workbook** (upload / current file), **Findings**, **Prep**, **Assistant**, **Recalculate**, **Reports**, **History**. Top bar: file name, version chip (`v3 -- written by Excel, verified`), overall status pill, "Re-analyze" button. Content area per section below.

### 1. Start / Workbook

- Empty state: drop zone for `.xlsx / .xlsm / .xlsb`, a mode selector (Plan -- analyze everything; Prep Mind Loops; Fix Incompatible Formulas; Structure Fix), a primary **Run analysis** button, and three quiet trust statements: "Original never modified", "Outputs written by Excel and verified", "94 rules from the Mind knowledge base".
- Converting state (for `.xlsb`): "Converting to .xlsm through Excel" inline progress.
- Analyzing state: indeterminate progress with the three engine phases (Inventory · Rules · Plan). Typical run: 4-25 s.
- After analysis: a **current file card** -- file name, format, size, last saved by, VBA yes/no, sheets, grids (titled / untitled), formulas (array formulas), MM_ functions used, external links; plus the version lineage (v1 original → v2 prep → v3 assistant change...).

### 2. Findings

- Header: overall status pill; five KPI tiles in fixed order Error · Needs input · Not supported · Warning · Pass (counts). A one-line note under a non-PASS status: "PASS requires a clean recalculation."
- Filter chips by status (default: Error, Needs input, Warning) and a search box (rule id, sheet, text). Optional group-by: category (structure, format, formula, loop, lookup, io, parameter, project, iteration, performance, risk, environment, kb).
- Findings table: Rule · Severity · Status · Location (`Sheet!Cell`, clickable) · Finding (message) · Evidence (`DETERMINISTIC_FINDING` / `INFERENCE` / `RECOMMENDATION` -- shown as a subtle tag) · Fix available (yes/no).
- Row expand: full message, "Recommended fix" text, `observed` details (key/value or small table), "Open in Prep" link when a prep action covers the rule, "Ask the assistant about this" link that pre-fills a question.
- **Workbook map** (secondary panel or tab): each sheet as a column of grid cards showing `#Title`, range, flags as chips, header preview; untitled grids visually distinct; standalone text cells shown as ghost chips; findings anchored to a grid appear as small status dots on its card. This is the piece that shows Mind fluency -- make it beautiful but truthful.

### 3. Prep (apply changes)

- Intro line: "Each change is planned from the findings and listed cell by cell. Select what you approve; Excel writes them to a fresh copy, the copy is verified to open, and a change log is written."
- A list of **action cards**, each with: checkbox (default on/off comes from data), title, count of changes, covered rule ids, and an expandable table of operations (Sheet · Target · Before · After · Note) plus "Skipped" notes with reasons. Actions in the data today: Add `&&Hide` to hidden sheet names; Normalise loop-name capitalisation; Add `/Input` to `/Reorder` grids; Correct misspelt flags; Correct headers of special grids; Insert an empty row before a trapped `#Title`; Give every untitled grid one `#Name` title from surrounding context; Replace theme colours with explicit RGB; (off by default) apostrophe + space in styled empty cells; Remove sheet protection.
- Sticky footer: "Apply N selected changes" (primary). Applying state with phases (Copy · Excel · Verify · Change log). Result card: applied / partial / failed counts, "Written by Excel and verified to open in Excel", download button, "Re-analyze the prepared file", failed operations table if any.
- **Replace an incompatible formula** sub-section: select a flagged formula (rule · `Sheet!Cell` · functions), current formula in a code block, "Suggest a fix" (AI) with the suggestion shown as advice, an editable replacement field (must start with `=`), "Apply this formula". Make explicit that nothing is written until Apply.

### 4. Assistant

- Conversation view (user / assistant bubbles, markdown, code blocks for formulas). Sticky composer with placeholder "Ask anything, or tell me what to change -- e.g. rename sheet Notes to Inputs · title the grid at B4 #Premiums /Input · why does RES-002 fail?".
- Under each assistant answer a tiny provenance line: "context 14k chars · detail 2.1k · 1 lookup".
- **Proposal card** (appears when the assistant proposes changes): summary line, operations table (Op · Sheet · Target · Before · After), validation problems listed in amber if any, buttons **Apply N changes** (primary) and **Discard**. Applying re-analyzes automatically; a system note then appears in the conversation ("Applied 2 changes via Excel · verified · re-analyzed") with a download link for the changed workbook.
- Clear conversation control. Empty state when the assistant is not configured: "The assistant needs the shared gateway key".

### 5. Recalculate

- Explanation: drives the installed Excel (hidden, macros disabled) to recalculate a fresh copy and scan for formula errors -- the only way the app claims PASS. Primary "Recalculate now" button; running state; result card with status pill, message, a table of formula-error cells (Sheet · Cell · Error · Formula), and a distinct amber note for `#NAME?` on `MM_` calls when the MMForExcel add-in is not installed ("not a workbook defect").

### 6. Reports

- Two side-by-side cards: **Standalone report** (.xlsx, Summary + Findings -- always valid) and **Workbook copy + report sheets** (written by Excel, "verified to open in Excel" line, warnings if any). "Generate reports" primary button, then download buttons.

### 7. History

- Version lineage as a vertical timeline: v1 original (sha256 short), v2 "Prep: 8 changes via Excel · verified", v3 "Assistant: rename sheet Top → Summary · verified"... Each entry expands to its change-log entries (operation, sheet, target, before, after, note) and offers download / re-analyze.

## Components to design (with all states)

Status pill · KPI tile · Finding row + expanded row · Grid card (titled / untitled / flagged / with findings) · Action card (on / off / disabled-no-changes) · Operations table · Result card (applied / partial / failed / verifying) · Proposal card · Chat bubbles + system note · Provenance line · Version chip + timeline entry · Drop zone (idle / drag-over / converting / analyzing) · Empty states (no findings in filter, nothing to prep, assistant not configured) · Error banner (engine error text, copyable).

## Visual direction

- Enterprise-calm: white surfaces, hairline borders (#E5E7EB), soft 10-12 px radii, one accent (deep navy #1F3A5F) for primary actions, teal (#0F766E) for "verified" signals, status colours: pass green #0F6E3A on #DFF5E6, warning amber #8A5A00 on #FFF1CC, error red #9F1D1D on #FDE2E2, needs-input orange #7A3E00 on #FFE4C7, not-supported gray #4B5563 on #E9ECEF. Typography: Inter (UI), JetBrains Mono / ui-monospace for cells, formulas, file names, rule ids. 14 px base, 1.5 line height, tables at 13 px.
- Dense but scannable tables with sticky headers; monospaced `Sheet!Cell` everywhere; chips for flags (`/Input`, `/Resize.grp`) rendered like code.
- Light theme first; provide dark tokens. Minimum 1280 px layout, works at 1440 and 1920; the left rail collapses to icons below 1200.
- No illustrations, no gradients, no marketing copy. Motion: 150-200 ms fades only.

## Data contracts (the engine's JSON -- mock these exactly)

```ts
export type Status = "PASS" | "WARNING" | "ERROR" | "REQUIRES_USER_INPUT" | "NOT_SUPPORTED";
export type Evidence = "DOCUMENTED_RULE" | "DETERMINISTIC_FINDING" | "USER_PROVIDED" | "INFERENCE" | "RECOMMENDATION";

export interface Finding {
  rule_id: string;               // "RES-002"
  status: Status;
  severity?: string;             // "HIGH" | "MEDIUM" | "LOW" | "BLOCKER" | "INFO"
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: Evidence;
  location: { sheet?: string; cell?: string; [k: string]: unknown };
  observed?: unknown;            // free-form JSON details
  expected?: unknown;
  message: string;
  readiness_impact: Status;
  correction_available: boolean;
  source: { document?: string; article?: string };
}

export interface ValidationReport {
  schema_version: string;
  report_id: string;
  status: Status;                // worst finding wins
  findings: Finding[];
  summary: { finding_count: number; status_counts: Partial<Record<Status, number>>; not_supported_rule_ids: string[]; blocking_rule_ids: string[] };
}

export interface GridFlag { name: string; raw: string; args: string[] }       // name lower-case: "input", "resize", "group"
export interface Grid {
  sheet: string; title_cell: string | null; title: string | null; name: string | null;
  display_name: string;          // "Premiums" or "untitled B4"
  flags: GridFlag[]; flag_names: string[];
  anchor: string; ref: string;   // "B4", "B4:D9"
  first_row: number; last_row: number; first_col: number; last_col: number; n_rows: number; n_cols: number;
  header_values: (string | number | boolean | null)[]; header_is_all_text: boolean;
  inner_title_cells: string[];   // a '#Title' trapped inside -> merged grids
  formula_count: number;
}
export interface SheetSummary { name: string; state: "visible" | "hidden" | "veryHidden"; dimensions: string; grids: Grid[]; standalone_text_cells: { cell: string; text: string }[]; formula_count: number; array_formula_count: number; protected: boolean }
export interface WorkbookSummary {
  file_name: string; file_type: "xlsx" | "xlsm"; sha256: string;
  application: string | null; app_version: string | null; has_vba: boolean;
  sheet_count: number; hidden_sheet_count: number; grid_count: number; flagged_grid_count: number;
  formula_count: number; array_formula_count: number; defined_name_count: number; external_link_part_count: number;
  mm_functions_used: Record<string, number>; native_function_usage: Record<string, number>;
  sheets: SheetSummary[];
}

export type OpKind = "set_value" | "set_formula" | "clear_cell" | "rename_sheet" | "insert_row" | "insert_column" | "set_sheet_visibility" | "unprotect_sheet" | "explicit_colors";
export interface Operation {
  op: OpKind; action_id: string; rule_id: string; sheet: string;
  cell?: string; row?: number; column?: string; cells?: string[];
  before: unknown; after: unknown; note?: string; after_inserts?: boolean;
}
export interface PrepAction { id: string; title: string; rule_ids: string[]; default_on: boolean; operations: Operation[]; count: number; skipped: string[] }

export interface ApplyResult {
  status: "APPLIED" | "PARTIAL" | "ERROR" | "NOT_APPLICABLE";
  method: "excel_com" | "openpyxl"; output_path: string; output_name: string;
  applied: Operation[]; failed: (Operation & { error: string })[];
  verified_opens_in_excel: boolean | null; warnings: string[]; message: string;
}

export interface ChatMessage { role: "user" | "assistant"; content: string; note?: boolean; provenance?: { context_chars: number; detail_chars: number; lookups: number } }
export interface Proposal { summary: string | null; operations: Operation[]; errors: string[] }
export interface ChatReply { text: string; proposal: Proposal | null; provenance: { context_chars: number; detail_chars: number; lookups: number } }

export interface RecalcResult { status: Status; message: string; formula_errors: { sheet: string; cell: string; error: string; formula: string }[]; addin_gap_errors: { sheet: string; cell: string; formula: string }[] }
export interface ReportBuild { standalone_name: string; workbook_name: string; method: "excel_com" | "openpyxl"; verified_opens_in_excel: boolean | null; warnings: string[] }
export interface Version { id: string; label: string; file_name: string; sha256: string; created_at: string; source: "upload" | "prep" | "assistant" | "formula" | "convert"; change_log: Operation[]; verified_opens_in_excel: boolean | null }
```

## Service layer (so the backend can be plugged in)

Put every data access behind one module, `src/services/api.ts`, with these functions and **no UI code calling fetch directly**. Ship mock implementations (`src/mocks/*.json` + a `USE_MOCKS` flag) that return the fixtures below with realistic delays.

```ts
uploadWorkbook(file: File, mode: Mode): Promise<{ sessionId: string; summary: WorkbookSummary; report: ValidationReport; plan: PrepAction[]; version: Version }>
reanalyze(sessionId: string, versionId: string): Promise<{ summary: WorkbookSummary; report: ValidationReport; plan: PrepAction[] }>
applyOperations(sessionId: string, operations: Operation[]): Promise<{ result: ApplyResult; version: Version }>
suggestFormulaFix(sessionId: string, ruleId: string, sheet: string, cell: string): Promise<{ suggestion: string | null; formula: string | null; message: string | null }>
chat(sessionId: string, history: ChatMessage[], question: string): Promise<ChatReply>
recalculate(sessionId: string): Promise<RecalcResult>
generateReports(sessionId: string): Promise<ReportBuild>
downloadUrl(sessionId: string, fileName: string): string
listVersions(sessionId: string): Promise<Version[]>
```

Mock fixture to include: a workbook "IFRS_Risk_Model.xlsm" with 11 sheets, 183 grids (most untitled), 3,002 formulas (103 array), `MM_LOOP ×4`; findings: 1 ERROR (FRM-002: `AGGREGATE`, `FILTER` not on the supported list, first site `MM_Change_Log!L7`), 2 NOT_SUPPORTED (FORMULA-001, READY-001), 15 WARNING (e.g. DBG-003 71 whole-column references from `Cashflows!D5`, STR-004 untitled grids, FMT-002 theme colours), 76 PASS; prep plan with the actions listed above (e.g. "Give every untitled grid one #Name title" = 160 changes, 23 skipped with reasons); one assistant conversation that ends in a 2-operation proposal (rename sheet `Top` → `Summary`; set `Data!B3` to `#Premium table /Input`) and its applied system note; three versions in History.

## Deliverables

- Figma file: pages *Foundations* (tokens, type, colour, spacing, status system), *Components* (all states above), *Screens* (every section in empty / loading / populated / error states at 1440), *Flows* (upload → findings → prep apply → re-analyze; assistant proposal → apply; recalc; reports).
- Code export: React 18 + TypeScript + Vite, Tailwind (or CSS variables), React Router with routes `/`, `/findings`, `/prep`, `/assistant`, `/recalculate`, `/reports`, `/history`; folder structure `src/components`, `src/screens`, `src/services/api.ts`, `src/mocks`, `src/types.ts` (the contracts above verbatim), `src/theme`. State in a single store (Zustand or React context) keyed by `sessionId`. No backend calls; everything through `services/api.ts`.
- Accessibility: keyboard-navigable tables and cards, visible focus, WCAG AA contrast for every status colour on its background, `aria-live` for apply/recalc progress.
- Do not add features that are not described here (no scoring, no auto-apply, no "upload to Mind" button). Where the engine says NOT_SUPPORTED, the UI says so plainly.
