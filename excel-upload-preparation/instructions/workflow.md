# Workflow

## ANALYZE

Copy and hash the source; inventory file type, package parts, worksheets, cells, formulas, names, flags, grids, links, hidden content, VBA, formatting, and dependencies; select rules for the configured target version and mode.

## VALIDATE

Run deterministic validators first. Use LLM reasoning only for ambiguous organization, semantic formula alternatives, conflict explanation, and targeted questions.

## ASK

Ask only when valid alternatives have materially different effects, business meaning may change, a dependency or target version is missing, documentation conflicts, preservation cannot be guaranteed, or intended mapping is unclear.

## TRANSFORM

Build an immutable change set. Validate before-state hashes. Apply changes to a fresh copy. Never reuse a partially failed file.

## VERIFY

Reopen, reinventory, compare package content, rerun validators, recalculate through a trusted adapter, save, reopen, and inspect formula errors.

## REPORT

Return schema-valid machine output, an external change log, concise explanation, and final readiness status.