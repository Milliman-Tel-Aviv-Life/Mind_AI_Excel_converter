# Runbook — prep a workbook and run it in Milliman Mind

End-to-end: take a raw model workbook, fix it with the local **Mind Ready** app,
then upload it to **Milliman Mind**, convert it, and run it. This reproduces the
result achieved on `Shlomo_IFRS_Risk_Mind_Copilot` (converts + runs cleanly).

Two rules to remember up front:
- **Mind only accepts `.xlsx` / `.xlsm`** (not `.xlsb`). If your model is `.xlsb`,
  open it in Excel → *Save As* → **Excel Macro-Enabled Workbook (`.xlsm`)** first.
- The fix that makes this particular model convert (rewriting broken `#REF!`
  references to `NA()`) is now **opt-in** — you must turn it on in step A4.

---

## Part A — Fix the workbook in the local Mind Ready app

1. **Start the app** (if not already running): run `run_mind_ready_web.bat` in
   `excel-upload-preparation`, then open **http://localhost:8600**.
   (To confirm the running build, open **http://localhost:8600/api/health** — it
   returns `"version":"1.6.6"` and `"rules":96`. The sidebar's rule count is a
   static label and does not reflect the live number.)
2. **Workbook screen → upload** your `.xlsm` (drag it onto the drop zone or
   *Load workbook*). The app analyses it and lands on **Findings**.
3. **Findings** — review what it caught. On the Shlomo model you'll see, among
   others: **REF-001** (broken `#REF!` references — the conversion blocker),
   **REP-001** (value reconciliation), plus WARNINGs. No `FILTER` error anymore.
4. **Prep screen → turn on the fixes and Apply.** In the prep action list, make
   sure **"Replace broken (#REF!) references with NA()"** is **ticked** (it's
   off by default because it edits formulas). Leave the other default fixes on.
   Click **Apply** — the app edits a *copy* via Excel (your original is never
   touched) and creates a new version.
5. **Download the fixed workbook** — use the **Download** area in the left
   sidebar (it offers the latest version, e.g. `…_v2.xlsm`). Save it. This is the
   file you upload to Mind.

*(Optional: click **Recalculate** to confirm the fixed copy has no formula errors,
and **Reports** for a written findings report.)*

---

## Part B — Convert and run it in Milliman Mind

6. **Open Milliman Mind** and go to your workspace's **Project Manager**
   (`shared.milliman-mind.com` → *Access the Project manager*, or your normal
   Mind entry). Sign in if prompted.
7. **Create a project for the model:** click **New project**, give it a name,
   **Create project**. Then **open it** (click its tile — it opens the project).
8. The empty project shows **"Drag your Excel files here to convert them."**
   Click **Browse files** (or drag) and pick the **app-fixed `.xlsm`** from A5.
9. Mind runs a 3-step wizard: **Upload → Convert → Test.** Wait for all three to
   complete → **"Upload successful"**.
   - If it stops at **Convert** with a red step, click **Display Error Logs** —
     that message tells you exactly what to fix back in the app (this is how the
     app's rules were built). Fix, re-download, re-upload.
10. Click **Add template to Milliman Mind** (the blue button). You'll see
    **"Successfully added model"** and the project opens with a **Run** button.
11. Click **Run** (top-left). Wait for **"Run in Progress"** → the button turns
    **green** and you get **"Calculations completed — Run completed in N seconds
    · Consistent with the audit trail."** The model has run.
12. **Get the results:** use **Exports** / the **download icon** (top-right) to
    export outputs, the **chart icon** for dashboards, or the **Grid validation
    manager** (export/right side) to review grid results. Audit trail of runs is
    under the history/clock icon (top-left).

---

### What "good" looks like
- Convert wizard: **Upload ✓ Convert ✓ Test ✓** ("Upload successful").
- After **Run**: green Run button, **"Calculations completed … Consistent with
  the audit trail."**

---

## Part D — Let the app do all of it by itself

Parts A–C are the manual path. Since 1.6.8 the app can run the whole cycle
unattended (`app/mind_loop.py`): prepare a fresh copy, verify the numbers,
upload, convert, add the template, run, read what Mind shows, decide, repeat.
Nobody — and no assistant — is consulted while it runs. The full runbook for
that path, including how to read every verdict, is
[RUN_IN_MIND_LOOP.md](RUN_IN_MIND_LOOP.md); this section is the short version.

```bash
cd excel-upload-preparation
python scripts/run_in_mind.py "path\to\YourModel.xlsm" --max-iterations 4
```

or, in the app: **Mind** in the left sidebar → **Run in Mind**, and watch the
live log. (`.xlsb` is accepted: it is converted through Excel first.)

What one iteration checks, in order — a gate that *cannot* be checked counts
as a failure, never a pass:

| Gate | Passes when |
|---|---|
| Prepared | the plan applied through Excel and the copy opens |
| Numbers | a full Excel recalculation of the prepared copy equals one of the source, cell for cell — except cells the plan wrote as content (titles, moved labels); a cell whose *formula* the plan rewrote may keep its value or turn an error into another error, never move a valid value |
| Structure | the grid count did not balloon (the signature of a bad row insert) |
| Names | every grid the plan could title is titled; the rest are listed with the reason |
| Convert | Mind's Upload / Convert / Test all Complete |
| Run | Mind ran the model and reports it *consistent with the audit trail* |
| Counts | *reported, never a block*: Mind's `Untitled(r,c)` entries are matched cell by cell against the untitled grids the app predicted; any the app did not predict (or predicted and Mind merged away) are listed under `detection_gaps` — a difference between the app's grid detection and Mind's, which no prep action can change |

A title is only ever written where it cannot change a value: never into a cell
any formula or defined name reads, never by inserting a row on a sheet that a
formula counts or indexes over whole columns (`=COUNTA(Data!A:A)`), and a label
that something reads is left in place even when its text becomes the title
(these rules came out of the first unattended run — see CHANGELOG 1.6.8).

When a gate fails the loop changes **one** thing and starts again from the
**original** source: it enables the opt-in fix Mind's error log asks for
(`#REF!` → `fix_broken_refs`), or disables the action whose edit moved a
number (found by walking the changed cell's precedents back to a cell an
action wrote), or disables the action that inserted the most rows when the
workbook fragments. It never re-preps its own output. When no rule applies
it stops with `stuck` and the exact reason — that report is the developer's
cue, not the user's problem.

Read the result in `<work-dir>/loop_report.json` (rewritten after every
iteration) or the summary the CLI prints. A converged run of the Shlomo model
reads:

```
verdict: converged -- every gate passed; Mind lists 51 Untitled grid(s), the app predicted 75: 8 Mind-only, 32 app-only (see detection_gaps)
  iter 1: actions=fix_broken_refs,create_grid_titles,explicit_colors | apply=APPLIED | grids 181->155 unnamed=75 blocked=55 | numbers=match | convert=ok run=ok audit=ok | converged
untitled grids left: app 75 (of which 55 the app cannot title safely), Mind shows 51
```

`numbers=match` is the line that matters: every computed value in the prepared
copy equals the source. The first time this loop ran it caught the titling
action changing 790 values (a title counted by `COUNTA` over a whole column
moved the model to a different policy) — Mind's own *consistent with the audit
trail* did **not** catch that, because it only compares Mind against the
workbook's cached values. Never treat a Mind run as proof that a prepared
workbook still computes what the original did; the numbers gate is that proof. Sandbox projects are named
`zzz_mindready_<stamp>_i<N>` in the `MindReady_Sandbox` folder; the one that
was **run** cannot be deleted by automation and is listed under
*leftover projects* for you to delete by hand.

### Once it runs: are the grids readable?
Converting and running is not the whole job -- Mind lists every grid by name in
the `work ▾` selector, and a grid with no title shows up as `Untitled(60,8)`.
[RUN_IN_MIND_NAMING.md](RUN_IN_MIND_NAMING.md) is the runbook for auditing and
fixing those names.

### If Convert fails
The error log names the cause. Common ones this app now handles automatically:
broken `#REF!` references (REF-001 → NA() rewrite, opt-in in A4) and unsupported
functions (FRM-002; note Mind *does* support `FILTER`). Fix in the app, re-download,
re-upload.
