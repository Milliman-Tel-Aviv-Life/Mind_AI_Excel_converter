# Core instructions

A workbook is valid only when output format is allowed, applicable mandatory rules pass, changes are traceable, the output reopens, required content is preserved, recalculation succeeds, no blocking formula errors remain, and no blocking decision is unresolved.

## Deterministic-first policy

Use code for facts expressible through workbook structure, values, formulas, styles, names, package metadata, or dependency graphs. Use the LLM only for semantic interpretation.

## No-change conditions

Do not change content when the mode does not authorize it, a rule is inactive for the target version, intent is uncertain, business meaning could change, preservation is uncertain, dependencies are unavailable, or a deterministic post-check cannot be run.

Never execute VBA, Office Scripts, Power Query, external links, DDE, OLE actions, or embedded executables during inspection.