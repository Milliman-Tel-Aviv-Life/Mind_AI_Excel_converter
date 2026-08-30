# MM Formula Generation Guide

Version: 0.1  
Purpose: Define how the Milliman Mind Copilot Skill should safely generate, rewrite, and explain MMForExcel formulas.

Primary consumers:
- Formula Builder
- Workbook Auditor
- Workbook Repair Assistant
- Model Design Assistant

Depends on:
- 01_Mind_Readiness_Standard.md
- 02_MM_Function_Registry.md
- 03_MM_Formula_Review_Playbook.md

---

# 1. Purpose

This guide tells the skill how to generate formulas for Excel workbooks intended for upload into Milliman Mind.

The goal is not to create clever formulas.

The goal is to create formulas that are:

- documented
- traceable
- Mind-compatible
- reviewable
- conservative
- safe for actuarial model review

---

# 2. Formula Generation Principles

## 2.1 Never Invent Syntax

The skill must only generate formulas using syntax documented in:

```text
02_MM_Function_Registry.md
```

If a requested function is not listed there, the skill must respond:

```text
Function not in registry. Do not auto-generate or auto-correct this formula until the registry is expanded.
```

## 2.2 Prefer Explicitness Over Compactness

Generated formulas should prefer:

```text
clear references
explicit loop names
explicit placeholder arguments
clear criteria strings
```

over short formulas that are hard to review.

## 2.3 Do Not Change Actuarial Logic

The skill may generate formula syntax, but must not change actuarial assumptions, projection logic, aggregation logic, dimensions, or business rules unless the user explicitly asks for that change.

## 2.4 Warn When Excel And Mind May Differ

The skill must warn whenever it generates formulas using:

```text
MM_ROW
MM_COLUMN
MM_TABLE
MM_LASTROW
MM_LASTROWCELL
MM_LASTCOLUMN
MM_LASTCOLUMNCELL
MM_RANGE
MM_SETSIZE
```

because these formulas can behave differently in Excel and Mind.

## 2.5 Prefer Registry Functions Over Guesswork

The skill must not create formulas by analogy from Excel unless the equivalent MM function is documented in the registry.

---

# 3. Required Inputs Before Generating A Formula

Before generating an MM formula, the skill should identify:

```yaml
formula_goal: ""
target_cell_or_range: ""
source_cells_or_ranges: []
grid_name: ""
sheet_name: ""
workbook_name: ""
uses_loops: true_or_false
loop_names: []
uses_simulations: true_or_false
uses_instances: true_or_false
uses_iterations: true_or_false
uses_dynamic_tables: true_or_false
input_manager_or_resize_impact: true_or_false
output_should_error_as_nan: true_or_false
actuarial_logic_change: true_or_false
```

If some information is missing, the skill should make the safest conservative assumption and clearly state it.

---

# 4. Formula Generation Decision Tree

## Step 1: Identify Formula Type

Choose one:

```text
Loop creation
Dimension access
Simulation aggregation
Criteria aggregation
Table lookup
Dynamic resizing
Dynamic range reference
Instance access
Iteration access
Distribution/stochastic formula
Other
```

## Step 2: Choose Function Category

Use:

```text
MM_LOOP
MM_RESULT
MM_SUM
MM_SUMIF / MM_SUMIFS
MM_COUNTIF / MM_COUNTIFS
MM_AVERAGEIF / MM_AVERAGEIFS
MM_READTABLE / MM_READTABLENAN
MM_SETSIZE
MM_TABLE / MM_ROW / MM_COLUMN
MM_LASTROWCELL / MM_LASTCOLUMNCELL
MM_INSTANCE / MM_INSTINDEX / MM_INSTANCEKEY / MM_ISINSTANCELOADED
MM_ITERATIONS / MM_CURRENTITERATION / MM_READITERATION
```

## Step 3: Validate Function Exists In Registry

If not listed in `02_MM_Function_Registry.md`, do not generate.

## Step 4: Generate Formula

Use documented syntax only.

## Step 5: Add Safety Notes

Every generated formula should include:

```text
Assumptions
Excel vs Mind warning if applicable
Review notes
Actuarial review required: Yes/No
```

---

# 5. Standard Formula Output Format

Whenever the skill generates a formula, output:

```text
Formula:
=<formula>

Use case:
<what this formula does>

Assumptions:
- <assumption 1>
- <assumption 2>

Mind-specific notes:
- <note 1>
- <note 2>

Review before upload:
- <item 1>
- <item 2>
```

---

# 6. Loop Formula Generation

## 6.1 Create A Basic Loop

Use when the model needs a dimension such as scenario, product, policy, contract, cohort, or projection step.

Template:

```excel
=MM_LOOP("LoopName", Range)
```

Example:

```excel
=MM_LOOP("Scenario", A3:A10)
```

Generation rules:

- Loop name must be stable.
- Loop name is case-sensitive.
- The loop range should be one row or one column.
- If the loop name already exists, the reused loop should use a range of the same length.
- Do not create a differently capitalized loop accidentally.

Bad:

```excel
=MM_LOOP("Scenario", A3:A10)
=MM_LOOP("scenario", B3:B10)
```

Good:

```excel
=MM_LOOP("Scenario", A3:A10)
=MM_LOOP("Scenario", B3:B10)
```

## 6.2 Create A Loop From A Cell Count

Use when a single cell contains an integer size.

Template:

```excel
=MM_LOOP("LoopName", CellContainingInteger)
```

Example:

```excel
=MM_LOOP("ProjectionYear", B2)
```

Review notes:

- Confirm the referenced cell contains an integer.
- Confirm the loop size should be 1 to n.
- Confirm loop size is not accidentally dependent on another loop.

## 6.3 Loop With Displayed Excel Index

Use when Excel should display a specific loop index.

Template:

```excel
=MM_LOOP("LoopName", Range, Index)
```

Example:

```excel
=MM_LOOP("Scenario", A3:A10, 2)
```

Review notes:

- Excel displays only one chosen index.
- Mind can navigate the full loop dimension.

---

# 7. Dimension Access Formula Generation

## 7.1 Retrieve A Specific Loop Dimension

Use:

```excel
=MM_RESULT(Cell, "LoopName", Index)
```

Example:

```excel
=MM_RESULT(B2, "Scenario", 3)
```

Generation rules:

- Loop name is case-sensitive.
- Cell must contain multidimensional results.
- Index must refer to a valid dimension index.

## 7.2 Sum All Dimensions Of An Omitted Loop

Use:

```excel
=MM_RESULT(Cell)
```

Example:

```excel
=MM_RESULT(B2)
```

Review warning:

```text
Omitted loop dimensions are summed.
```

The skill must not generate this unless summing omitted dimensions is intentional.

## 7.3 Retrieve Current Selected Loop Dimension

Use `MM_DIMINDEX` inside `MM_RESULT`.

Template:

```excel
=MM_RESULT(Cell, "LoopName", MM_DIMINDEX("LoopName"))
```

Example:

```excel
=MM_RESULT(C2, "Scenario", MM_DIMINDEX("Scenario"))
```

Review notes:

- `MM_DIMINDEX("LoopName")` follows the selected dimension in Mind.
- The same loop name must be used exactly in both places.

## 7.4 Retrieve A Specific Simulation

Use:

```excel
=MM_RESULT(Cell, "SIM", SimulationIndex)
```

Example:

```excel
=MM_RESULT(B2, "SIM", 10)
```

Rules:

- Use `"SIM"` exactly.
- Do not invent another simulation dimension name.
- Confirm the simulation index is intended.

---

# 8. Simulation Aggregation Formula Generation

## 8.1 Sum All Simulations

Use:

```excel
=MM_SUM(Cell)
```

Example:

```excel
=MM_SUM(A2)
```

Use when:

- The target cell has stochastic simulation results.
- The user wants to sum simulation values.
- Loop dimensions should be retained.

Do not use when:

- The user wants to sum loop dimensions.
- Criteria-based aggregation is needed.

Use `MM_RESULT` for loop aggregation.

---

# 9. Criteria Aggregation Formula Generation

Applies to:

```text
MM_SUMIF
MM_SUMIFS
MM_COUNTIF
MM_COUNTIFS
MM_AVERAGEIF
MM_AVERAGEIFS
```

## 9.1 General Criteria Rules

Criteria with operators must be strings.

Good:

```excel
">0"
">12.5"
"<=100"
```

Bad:

```excel
>0
">12,5"
```

Use decimal point in string criteria.

## 9.2 Generate One-Criterion Sum

Template:

```excel
=MM_SUMIF(Value, Condition)
```

Example:

```excel
=MM_SUMIF(A2, ">0")
```

With separate sum range:

```excel
=MM_SUMIF(Value, Condition, Sum_value)
```

Example:

```excel
=MM_SUMIF(A2:A10, ">0", B2:B10)
```

With loop selector:

```excel
=MM_SUMIF(Value, Condition, Sum_value, "LoopName", Index)
```

Example:

```excel
=MM_SUMIF(A2:A10, ">0", B2:B10, "Scenario", 1)
```

Rules:

- If loop selectors are used, include `Sum_value`.
- `Value` and `Sum_value` must have compatible dimensions.
- Use Excel `SUMIF` instead when there is no multidimensional behavior.

## 9.3 Generate Multi-Criteria Sum

Template:

```excel
=MM_SUMIFS(Sum_value, Range1, Condition1, Range2, Condition2, Range3, Condition3)
```

Example:

```excel
=MM_SUMIFS(A2:A10, B2:B10, ">0", C2:C10, "<100", "", "")
```

With loop selector:

```excel
=MM_SUMIFS(Sum_value, Range1, Condition1, Range2, Condition2, Range3, Condition3, "LoopName", Index)
```

Example:

```excel
=MM_SUMIFS(A2:A10, B2:B10, ">0", C2:C10, "<100", "", "", "Scenario", 1)
```

Rules:

- If specifying loops, all first seven parameters must be supplied.
- Use empty strings `""` where optional criteria placeholders are needed.
- Dimensions and range sizes must be compatible.
- Do not specify the same loop with different dimensions.

## 9.4 Generate One-Criterion Count

Template:

```excel
=MM_COUNTIF(Value, Condition)
```

Example:

```excel
=MM_COUNTIF(A2, ">0")
```

With loop selector:

```excel
=MM_COUNTIF(Value, Condition, "LoopName", Index)
```

Example:

```excel
=MM_COUNTIF(A2, ">0", "Scenario", 1)
```

Use Excel `COUNTIF` instead when there is no multidimensional behavior.

## 9.5 Generate Multi-Criteria Count

Template:

```excel
=MM_COUNTIFS(Range1, Condition1, Range2, Condition2, Range3, Condition3)
```

Example:

```excel
=MM_COUNTIFS(A2:A10, ">0", B2:B10, "<100", "", "")
```

With loop selector:

```excel
=MM_COUNTIFS(Range1, Condition1, Range2, Condition2, Range3, Condition3, "LoopName", Index)
```

Example:

```excel
=MM_COUNTIFS(A2:A10, ">0", B2:B10, "<100", "", "", "Scenario", 1)
```

Rules:

- Use placeholders before loop selectors.
- Confirm dimensions are aligned.
- Use Excel `COUNTIFS` if no multidimensional behavior is needed.

## 9.6 Generate One-Criterion Average

Template:

```excel
=MM_AVERAGEIF(Value, Condition)
```

Example:

```excel
=MM_AVERAGEIF(A2, ">0")
```

With separate average range and loop selector:

```excel
=MM_AVERAGEIF(Value, Condition, Average_value, "LoopName", Index)
```

Example:

```excel
=MM_AVERAGEIF(A2:A10, ">0", B2:B10, "Scenario", 1)
```

Rules:

- If loop selectors are used, include `Average_value`.
- No matching dimension returns `NaN`.
- Use Excel `AVERAGEIF` if no multidimensional behavior is needed.

## 9.7 Generate Multi-Criteria Average

Template:

```excel
=MM_AVERAGEIFS(Average_value, Range1, Condition1, Range2, Condition2, Range3, Condition3)
```

Example:

```excel
=MM_AVERAGEIFS(A2:A10, B2:B10, ">0", C2:C10, "<100", "", "")
```

With loop selector:

```excel
=MM_AVERAGEIFS(Average_value, Range1, Condition1, Range2, Condition2, Range3, Condition3, "LoopName", Index)
```

Example:

```excel
=MM_AVERAGEIFS(A2:A10, B2:B10, ">0", C2:C10, "<100", "", "", "Scenario", 1)
```

Rules:

- Use placeholders before loop selectors.
- No matching set of criteria returns `NaN`.
- Use Excel `AVERAGEIFS` if no multidimensional behavior is needed.

---

# 10. Lookup Formula Generation

## 10.1 Use MM_READTABLE When A Descriptive No-Match Message Is Useful

Template:

```excel
=MM_READTABLE(Range, Header, Comparison1, [Comparison2], ...)
```

Example:

```excel
=MM_READTABLE(A3:E11, "Output", "A", "B")
```

Rules:

- Range must include headers.
- Header must identify one return column.
- Criteria are tested against the first columns of the table.
- Maximum documented comparison count is six.
- If multiple rows match, first match is returned.
- If no row matches, a descriptive message is returned.

## 10.2 Use MM_READTABLENAN When No-Match Should Be NaN

Template:

```excel
=MM_READTABLENAN(Range, Header, Comparison1, [Comparison2], ...)
```

Example:

```excel
=MM_READTABLENAN(A3:E11, "Output", "A", "B")
```

Rules:

- Same as MM_READTABLE.
- If no row matches, returns `NaN`.
- Prefer this when the lookup feeds numeric calculations.

## 10.3 Lookup Generation Checklist

Before generating lookup formulas, confirm:

```text
Does Range include headers?
Which column should be returned?
How many criteria are needed?
What order are the criteria columns in?
Should no-match return message or NaN?
Can criteria be hardcoded, cell references, or ranges?
```

---

# 11. Dynamic Table Formula Generation

## 11.1 Use MM_TABLE For Whole Dynamic Table

Template:

```excel
=MM_TABLE(Cell)
```

Example:

```excel
=SUM(MM_TABLE(A2))
```

Use when:

- A formula needs the full table from a starting cell.
- The table size may vary.

Mandatory warning:

```text
MM_TABLE may behave differently in Excel and Mind.
```

## 11.2 Use MM_ROW For Dynamic Row Range

Template:

```excel
=MM_ROW(Cell)
```

Example:

```excel
=SUM(MM_ROW(B4))
```

Use when:

- The row width may change.
- The formula should extend to the last column of the table.

Mandatory warning:

```text
MM_ROW may behave differently in Excel and Mind.
```

## 11.3 Use MM_COLUMN For Dynamic Column Range

Template:

```excel
=MM_COLUMN(Cell)
```

Example:

```excel
=SUM(MM_COLUMN(B4))
```

Use when:

- The column height may change.
- The formula should extend to the last row of the table.

Mandatory warning:

```text
MM_COLUMN may behave differently in Excel and Mind.
```

## 11.4 Use MM_LASTROWCELL For Last Row Reference

Template:

```excel
=MM_LASTROWCELL(Cell)
```

Example:

```excel
=SUM(B3:MM_LASTROWCELL(B3))
```

Use when:

- The formula needs to end at the last row of a dynamic table.

Mandatory warning:

```text
MM_LASTROWCELL may behave differently in Excel and Mind.
```

## 11.5 Use MM_LASTCOLUMNCELL For Last Column Reference

Template:

```excel
=MM_LASTCOLUMNCELL(Cell)
```

Example:

```excel
=SUM(B3:MM_LASTCOLUMNCELL(B3))
```

Use when:

- The formula needs to end at the last column of a dynamic table.

Mandatory warning:

```text
MM_LASTCOLUMNCELL may behave differently in Excel and Mind.
```

---

# 12. Resize Formula Generation

## 12.1 Numeric Formula Resize With MM_SETSIZE

Template:

```excel
=Formula + MM_SETSIZE(NbRows, NbCols)
```

Example:

```excel
=A2*2 + MM_SETSIZE(10,1)
```

Rules:

- `MM_SETSIZE` must be added to the formula being copied.
- It must not be nested inside another function.
- Cells to be populated should be empty in Excel.
- Existing formulas are not overwritten.

## 12.2 Text Formula Resize With MM_SETSIZE

Template:

```excel
=Formula & IF(MM_SETSIZE(NbRows, NbCols)=0,"",0)
```

Example:

```excel
="Policy " & A2 & IF(MM_SETSIZE(10,1)=0,"",0)
```

Rules:

- Use this pattern when the formula returns text.
- Review output cells before generating.

## 12.3 Resize Multiple Tables With Flags

When multiple tables must resize together, prefer named resize flags rather than duplicating complex resize logic.

Supported flag concepts:

```text
/Resize
/ResizeRow
/ResizeColumn
/Resize.NAME
/ResizeRow.NAME
/ResizeColumn.NAME
```

Generation rule:

```text
Do not generate resize flags blindly. Confirm which grids are intended to resize together.
```

---

# 13. Instance Formula Generation

## 13.1 Access Another Instance

Template:

```excel
=MM_INSTANCE(Cell, Param, [NanIfNotExists])
```

Example:

```excel
=MM_INSTANCE(A2, "Treaty01", TRUE)
```

Rules:

- `Cell` should be a single cell.
- `Param` is the instance index or name.
- Use `NanIfNotExists = TRUE` when missing instances should return `NaN`.
- Review interaction with partial load.

## 13.2 Use Current Instance Index

Template:

```excel
=MM_INSTINDEX()
```

Example inside a loop name:

```excel
=MM_LOOP("Loop " & MM_INSTINDEX(), MM_COLUMN(A2))
```

Rules:

- Instances must exist.
- This can create different loops for different instances.
- Review whether those loops are intended to be instance-specific.

## 13.3 Use Current Instance Key

Template:

```excel
=MM_INSTANCEKEY("DefaultKey")
```

Example:

```excel
=MM_INSTANCEKEY("Product A")
```

Rules:

- DefaultKey is used in Excel.
- Mind returns the selected instance label/key once calculated.

## 13.4 Guard Against Partial Load

Template:

```excel
=IF(MM_ISINSTANCELOADED(Cell, "InstanceKey"), MM_INSTANCE(Cell, "InstanceKey", TRUE), "")
```

Example:

```excel
=IF(MM_ISINSTANCELOADED(A2, "Treaty01"), MM_INSTANCE(A2, "Treaty01", TRUE), "")
```

Rules:

- Use when partial load is possible.
- Prevents unintended default Excel values for unloaded instances.

---

# 14. Iteration Formula Generation

## 14.1 Define Workbook Iterations

Template:

```excel
=MM_ITERATIONS("IterationName", Size)
```

Example:

```excel
=MM_ITERATIONS("Projection Step", 5)
```

Rules:

- Only one `MM_ITERATIONS` formula per workbook.
- Use only when sequential workbook calculations are required.
- Do not use when a regular loop is sufficient.

## 14.2 Use Current Iteration

Template:

```excel
=MM_CURRENTITERATION()
```

Example:

```excel
=MM_CURRENTITERATION()
```

Rules:

- Only use on a workbook where iterations are defined.
- Review display behavior versus calculation behavior.

## 14.3 Read Iteration From Another Workbook

Template:

```excel
=MM_READITERATION(Cell, Iteration)
```

Example:

```excel
=MM_READITERATION([Workbook]Sheet1!A1, 2)
```

Rules:

- Use only to read from another workbook where iterations are defined.
- Do not use for cells in the same workbook.
- Same-workbook iteration dependencies inherit the iteration loop automatically.

---

# 15. Distribution And Stochastic Formula Generation

This guide only supports limited generation for stochastic formulas currently in the registry or explicitly documented.

## 15.1 Generate A Simulation From Parameters

Template:

```excel
=MM_SIMULATE("DistName", Param1, [Param2], [Param3])
```

Example:

```excel
=MM_SIMULATE("Normal", 0, 1)
```

Rules:

- Confirm that the distribution is supported before generating.
- Use `MM_PARAMNAME` if parameter meaning is uncertain.
- A single cell with this formula inherits the `"SIM"` dimension in Mind.

## 15.2 Generate A Simulation From Mean And Standard Deviation

Template:

```excel
=MM_SIMULATE_MS("DistName", Mean, [StdDev], [Param3])
```

Example:

```excel
=MM_SIMULATE_MS("Gamma", 4, 8)
```

Rules:

- Confirm distribution parameter requirements.
- Do not invent missing distribution parameters.

## 15.3 Empty Parameters In Truncated Distribution Formulas

For truncated distribution formulas, all required parameter positions must be filled.

Bad:

```excel
=MM_SIMULATE_TRUNC("Normal",0,2,,-10,10)
```

Good:

```excel
=MM_SIMULATE_TRUNC("Normal",0,2,0,-10,10)
```

Use `""` only where the documentation specifically allows empty string, such as bounds representing infinity.

---

# 16. Formula Generation Safety Checklist

Before returning any generated formula, check:

```text
Function exists in registry
Syntax matches registry
No empty required parameters
Loop names are exact and case-consistent
SIM selector used correctly
Ranges have compatible dimensions
Criteria strings use decimal point
Dynamic table warnings included
Excel vs Mind warning included where required
Instance partial-load risk reviewed
Iteration workbook rules reviewed
No unsupported MM function generated
No actuarial logic changed without instruction
```

---

# 17. Safe Auto-Generation Categories

The skill may generate formulas directly for:

```text
MM_LOOP
MM_RESULT
MM_SUM
MM_SUMIF
MM_SUMIFS
MM_COUNTIF
MM_COUNTIFS
MM_AVERAGEIF
MM_AVERAGEIFS
MM_READTABLE
MM_READTABLENAN
MM_SETSIZE
MM_TABLE
MM_ROW
MM_COLUMN
MM_LASTROWCELL
MM_LASTCOLUMNCELL
MM_INSTANCE
MM_INSTINDEX
MM_INSTANCEKEY
MM_ISINSTANCELOADED
MM_ITERATIONS
MM_CURRENTITERATION
MM_READITERATION
```

Only if:

```text
the required inputs are clear
the registry contains the syntax
the formula does not change actuarial logic
```

---

# 18. Do Not Auto-Generate Without Review

Do not auto-generate formulas for:

```text
MM_LOOPINSTANCE
MM_RANGE
MM_FILTER
MM_REMOVEDUPLICATES
MM_HUNION
MM_VUNION
MM_GROUPBY
MM_MATCH
MM_SORTDIM
MM_SORTRANGE
MM_RANK
MM_AOCVALUE
MM_AOCSTATUS
MM_SENSITIVITY
MM_GOALSEEK
MM_INPUTSTATUS
custom C# formulas
VBA replacements
```

unless their full entries have been added to `02_MM_Function_Registry.md`.

---

# 19. Formula Explanation Template

When explaining a generated formula, use this structure:

```text
Formula:
=<formula>

What it does:
<plain English explanation>

Why this function:
<why this MM function was selected>

Mind behavior:
<what Mind will do>

Excel behavior:
<what Excel will show, if relevant>

Risks:
<risks or warnings>

Review required:
Yes/No
```

---

# 20. Example Responses

## 20.1 Example: Build A Scenario Loop

User request:

```text
Create a loop over scenarios in A3:A6.
```

Skill output:

```text
Formula:
=MM_LOOP("Scenario", A3:A6)

What it does:
Creates a Scenario loop using the values in A3:A6.

Mind behavior:
Mind can navigate the dimensions of the Scenario loop.

Excel behavior:
Excel displays the first index by default.

Review required:
No, unless the loop name or range conflicts with another Scenario loop.
```

## 20.2 Example: Retrieve A Selected Scenario Result

User request:

```text
Return B2 for the selected Scenario.
```

Skill output:

```text
Formula:
=MM_RESULT(B2, "Scenario", MM_DIMINDEX("Scenario"))

What it does:
Returns the B2 result for the currently selected Scenario dimension.

Mind behavior:
The result changes with the selected Scenario dimension.

Risks:
Scenario is case-sensitive. Confirm the loop is named exactly "Scenario".

Review required:
No, unless the loop name differs.
```

## 20.3 Example: Sum With Criteria Across Dimensions

User request:

```text
Sum A2 where B2 is greater than 0.5.
```

Skill output:

```text
Formula:
=MM_SUMIFS(A2, B2, ">0.5")

What it does:
Sums multidimensional values of A2 where B2 is greater than 0.5.

Mind behavior:
Applies the criterion across available dimensions.

Risks:
If A2 and B2 have no multidimensional behavior, Excel SUMIFS may be more appropriate.

Review required:
Yes, confirm that A2 and B2 have compatible dimensions.
```

## 20.4 Example: Dynamic Last Column Reference

User request:

```text
Sum row B3 to the last column of its table.
```

Skill output:

```text
Formula:
=SUM(B3:MM_LASTCOLUMNCELL(B3))

What it does:
Sums from B3 through the last column in the same row of the corresponding table.

Mind behavior:
Uses the Mind table boundary.

Excel behavior:
May differ if Excel encounters an empty cell before the Mind table boundary.

Review required:
Yes, because Excel and Mind behavior may differ.
```

---

# 21. Final Rule

The skill must generate formulas as a cautious model assistant.

Default posture:

```text
Generate only documented syntax.
Explain assumptions.
Warn about Mind-specific behavior.
Flag model risk.
Do not change actuarial logic.
``