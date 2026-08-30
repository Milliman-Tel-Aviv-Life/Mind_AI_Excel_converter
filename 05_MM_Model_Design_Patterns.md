# 05_MM_Model_Design_Patterns

Version: 0.1

Purpose:
Define approved Milliman Mind modeling patterns, architecture standards, and design recommendations that should be preferred when building new models.

Depends on:

- 01_MM_Skill_Instructions.md
- 02_MM_Function_Registry.md
- 03_MM_Formula_Review_Playbook.md
- 04_MM_Formula_Generation_Guide.md

---

# 1. Core Design Philosophy

Models should be:

- deterministic
- reviewable
- dimension-aware
- scalable
- instance-safe
- resize-safe
- performant

Preferred priorities:

```text
Correctness
↓
Transparency
↓
Maintainability
↓
Performance
↓
Convenience
```

Never sacrifice correctness for elegance.

---

# 2. Standard Mind Architecture

Recommended structure:

```text
Inputs
↓
Mapping
↓
Assumptions
↓
Loop Definition
↓
Calculation Engine
↓
Aggregation
↓
Outputs
```

Avoid:

```text
Input
↓
Output
```

without intermediate layers.

---

# 3. Loop Design Patterns

## Pattern 1 — Scenario Loop

Use when:

```text
Scenario
Stress
Economic condition
Regulatory run
```

Structure:

```excel
=MM_LOOP("Scenario",Range)
```

Benefits:

- simple
- easy review
- easy reporting

---

## Pattern 2 — Product Loop

Use when:

```text
Products
LOBs
Cohorts
Segments
```

Structure:

```excel
=MM_LOOP("Product",Range)
```

Recommended:

```text
Stable labels
Stable ordering
Independent dimensions
```

---

## Pattern 3 — Cross Product Loops

Structure:

```excel
=MM_LOOP("Scenario",...)
+MM_LOOP("Product",...)
```

Creates:

```text
Scenario × Product
```

dimension space.

Use only when dimensions are genuinely independent.

---

## Pattern 4 — Hierarchical Modeling

Preferred:

```text
Product Loop
Contract Loop
```

instead of:

```text
ProductContract Loop
```

Benefits:

- easier aggregation
- easier reporting
- reusable dimensions

---

# 4. MM_RESULT Access Patterns

## Pattern 1 — Explicit Dimension Access

Preferred:

```excel
=MM_RESULT(Cell,"Scenario",2)
```

Reason:

```text
Dimension selected intentionally.
```

---

## Pattern 2 — Dynamic Selected Dimension

Preferred UI/reporting pattern:

```excel
=MM_RESULT(
 Cell,
 "Scenario",
 MM_DIMINDEX("Scenario")
)
```

Benefits:

- responsive reporting
- reusable tables

---

## Pattern 3 — Controlled Aggregation

Preferred:

```excel
=MM_RESULT(Cell)
```

ONLY when summation of omitted loops is intended.

Required comment:

```text
Loop aggregation intentional.
```

---

# 5. Stochastic Modeling Patterns

## Pattern 1 — Native SIM Dimension

Preferred:

```excel
=MM_SIMULATE(...)
```

instead of manual simulation loops.

Reason:

```text
Native Mind optimization.
```

---

## Pattern 2 — Simulation Aggregation

Preferred:

```excel
=MM_SUM(Cell)
```

for stochastic totals.

Avoid:

```excel
=SUM(...)
```

across manually constructed simulation structures.

---

## Pattern 3 — Simulation Extraction

Preferred:

```excel
=MM_RESULT(
 Cell,
 "SIM",
 SimulationIndex
)
```

for validation and audit.

---

# 6. Table Lookup Patterns

## Pattern 1 — Assumption Tables

Preferred:

```excel
=MM_READTABLE(...)
```

when lookup failures should be explained.

Use for:

```text
Business rules
Assumption tables
Configuration tables
```

---

## Pattern 2 — Numerical Calculation Tables

Preferred:

```excel
=MM_READTABLENAN(...)
```

when failures should propagate.

Use for:

```text
Rates
Factors
Parameters
```

---

## Pattern 3 — Multi-Key Lookup

Preferred:

```excel
=MM_READTABLE(
 Table,
 "Value",
 Product,
 Region,
 Scenario
)
```

over nested:

```excel
IF(...)
VLOOKUP(...)
MATCH(...)
```

chains.

---

# 7. Dynamic Table Patterns

Use when:

```text
Input Manager
Resize
Variable datasets
Instance-dependent size
```

are possible.

---

## Pattern 1 — Dynamic Row

Preferred:

```excel
=SUM(MM_ROW(A2))
```

instead of:

```excel
=SUM(A2:Z2)
```

---

## Pattern 2 — Dynamic Column

Preferred:

```excel
=SUM(MM_COLUMN(A2))
```

instead of:

```excel
=SUM(A2:A500)
```

---

## Pattern 3 — Dynamic Last Cell

Preferred:

```excel
=SUM(
 B2:
 MM_LASTROWCELL(B2)
)
```

instead of fixed ranges.

---

## Pattern 4 — Whole Table Access

Preferred:

```excel
=SUM(MM_TABLE(A1))
```

for dynamic grids.

---

# 8. Resize Patterns

## Pattern 1 — Single Dynamic Table

Preferred:

```excel
=Formula
+MM_SETSIZE(
 NbRows,
 NbCols
)
```

Use:

```text
Reference table
```

approach.

---

## Pattern 2 — Resize Group

Preferred:

```text
/Resize
```

or

```text
/ResizeRow
/ResizeColumn
```

flags.

Benefits:

```text
One resize source
Many dependent grids
```

---

## Pattern 3 — Named Resize Networks

Preferred:

```text
/Resize.Policy
/Resize.Cashflow
/Resize.Output
```

instead of global resize.

Benefits:

```text
Isolation
Predictability
```

---

# 9. Instance Modeling Patterns

## Pattern 1 — Workbook Replication

Use:

```text
Instances
```

for:

```text
Treaties
Funds
Portfolios
Policies
```

Avoid creating separate workbooks manually.

---

## Pattern 2 — Safe Instance Read

Preferred:

```excel
=MM_INSTANCE(
 Cell,
 Instance,
 TRUE
)
```

when missing instances are possible.

Reason:

```text
NaN exposes issue.
```

---

## Pattern 3 — Partial Load Protection

Preferred:

```excel
IF(
 MM_ISINSTANCELOADED(...),
 ...,
 ""
)
```

for partial-load environments.

---

## Pattern 4 — Instance Labels

Preferred:

```excel
=MM_INSTANCEKEY(...)
```

for reporting.

Avoid:

```text
Hardcoded instance names.
```

---

# 10. Iteration Modeling Patterns

Use iterations ONLY when:

```text
Workbook A
depends on
Workbook A previous iteration
```

or:

```text
Sequential convergence
```

is required.

---

## Pattern 1 — Central Iteration Driver

Preferred:

```excel
=MM_ITERATIONS(
 "ProjectionStep",
 N
)
```

Single workbook definition.

Never create multiple iteration definitions.

---

## Pattern 2 — Iterative Results Access

Preferred:

```excel
=MM_READITERATION(...)
```

only across workbooks.

Avoid:

```text
Same workbook iteration reads.
```

---

# 11. Assumption Architecture Pattern

Preferred:

```text
Raw Inputs
↓
Mapped Inputs
↓
Assumptions
↓
Calculation
```

Avoid:

```text
Lookup logic
inside
calculation formulas
```

Benefits:

```text
Auditability
Reuse
Performance
```

---

# 12. Output Design Patterns

## Pattern 1 — Dedicated Output Layer

Preferred:

```text
Inputs
Calculations
Outputs
```

separated grids.

Avoid mixed grids.

---

## Pattern 2 — Report Cells

Preferred:

```excel
=MM_RESULT(...)
```

inside reporting tables.

Avoid direct reference to deep calculation logic.

---

## Pattern 3 — Aggregated Outputs

Preferred:

```text
One grid
One reporting purpose
```

Examples:

```text
P&L
Cashflow
Capital
Sensitivity
```

---

# 13. AOC/AOS Design Pattern

Use:

```text
AOC
```

for:

```text
Analysis of Change
```

Use:

```text
Sensitivity
```

for:

```text
Analysis of Sensitivity
```

Principles:

```text
Inputs separate
Drivers explicit
Outputs traceable
```

Do not embed AOC logic deep inside unrelated formulas.

---

# 14. Performance Patterns

## Pattern 1 — Minimize Range Size

Preferred:

```excel
A2:A100
```

instead of:

```excel
A:A
```

---

## Pattern 2 — Use Array-Oriented Lookups

Preferred:

```text
Array MM_READTABLE
```

pattern where appropriate.

Benefits:

```text
Single evaluation
Reduced runtime
```

---

## Pattern 3 — Reuse Dimensions

Preferred:

```text
Shared loops
```

instead of duplicated loop definitions.

---

## Pattern 4 — Centralize Expensive Logic

Avoid:

```text
Repeated lookup formula
10000 times
```

Preferred:

```text
Lookup once
Reference many
```

---

# 15. Anti-Patterns

Avoid:

## Anti-Pattern 1

```text
Loop depending on another loop.
```

Risk:

```text
Iteration errors.
```

---

## Anti-Pattern 2

```text
SetSize of SetSize.
```

Risk:

```text
Run instability.
```

---

## Anti-Pattern 3

```text
Case variation of loop names.
```

Example:

```text
Scenario
scenario
```

Risk:

```text
Different loops.
```

---

## Anti-Pattern 4

```text
Hardcoded dynamic table boundaries.
```

Example:

```excel
A2:A1000
```

with resizable tables.

---

## Anti-Pattern 5

```text
Using MM_READITERATION
inside same workbook.
```

---

## Anti-Pattern 6

```text
Missing placeholder parameters
when MM function requires them.
```

Remember:

```text
Mind does not accept empty parameters.
```

Use:

```text
""
```

where documentation requires placeholders.

---

# 16. Excel vs Mind Risk Catalog

Whenever these appear:

```text
MM_ROW
MM_COLUMN
MM_TABLE
MM_RANGE
MM_LASTROW
MM_LASTROWCELL
MM_LASTCOLUMN
MM_LASTCOLUMNCELL
MM_SETSIZE
```

review must include:

```text
Excel behavior may differ from Mind behavior.
```

Mandatory warning.

---

# 17. Standard Modeling Checklist

Before upload verify:

```text
Loop names consistent
Loop names case-consistent
MM_RESULT aggregation intentional
Simulation logic reviewed
Instances reviewed
Iterations reviewed
Resize reviewed
Dynamic table references reviewed
Lookup failures reviewed
Output layer separated
```

---

# 18. Recommended Architecture Example

```text
01 Inputs
02 Mapping
03 Assumptions
04 Loops
05 Stochastic Engine
06 Core Calculations
07 Aggregations
08 AOC/AOS
09 Reporting
10 Exports
```

This should be treated as the preferred Milliman Mind model structure unless the user has a specific alternative architecture requirement.

---

# 19. Definition Of Good Design

A model is considered well-designed when:

- dimensions are explicit
- loops are reusable
- aggregation is intentional
- resize is safe
- partial loads are safe
- stochastic logic uses native SIM dimensions
- outputs are separated from calculations
- assumptions are separated from calculations
- no anti-patterns are present

Primary objective:

```text
Transparent actuarial models
that remain correct after
resize,
instance expansion,
stochastic runs,
and future maintenance.
```