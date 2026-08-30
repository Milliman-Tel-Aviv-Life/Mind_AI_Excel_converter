# Milliman Mind Workbook Readiness Standard
Version: 0.1
Owner: Mind Copilot Skill Project
Purpose: Determine whether an Excel workbook is ready for upload into Milliman Mind.

---

# 1. Objective

The purpose of this standard is to provide a deterministic validation framework for Excel workbooks intended for upload into Milliman Mind.

A workbook is considered "Mind Ready" when:

- Workbook structure is compatible with Mind grid generation.
- Grids can be identified correctly.
- Headers are recognized correctly.
- Formulas are compatible.
- MMForExcel functions are valid.
- Dynamic resizing behaves correctly.
- Inputs and exports are configured correctly.
- Instances and interlinks are configured correctly.
- Project settings are defined correctly.
- Workbook can be uploaded without introducing model risk.

---

# 2. Severity Classification

BLOCKER
    Prevents upload or causes incorrect model behaviour.

HIGH
    Likely causes incorrect results or unstable model design.

MEDIUM
    Best-practice issue or maintainability concern.

LOW
    Cosmetic or usability issue.

INFO
    Documentation only.

---

# 3. Workbook Structure Validation

## STR-001 Grid Detection

PASS IF:

- Intended grids are separated appropriately.
- Grid boundaries are clear.
- Empty rows and columns exist where grids must be separated.

FAIL IF:

- Multiple logical grids are merged unintentionally.

SEVERITY:
BLOCKER

---

## STR-002 Standalone Text Cells

PASS IF:

- Standalone labels are intentional.

FAIL IF:

- User expects standalone text cells to generate navigation items.

SEVERITY:
MEDIUM

---

## STR-003 Header Recognition

PASS IF:

- First row contains only text values when headers are intended.

FAIL IF:

- Header row contains formulas or numeric values that prevent recognition.

SEVERITY:
HIGH

---

## STR-004 Grid Naming

PASS IF:

- Every important grid is explicitly named.

FAIL IF:

- Grid is given automatic "Untitled" name.

SEVERITY:
MEDIUM

---

## STR-005 Sheet Names

PASS IF:

- Sheet names are meaningful.

SEVERITY:
LOW

---

## STR-006 Workbook Names

PASS IF:

- Workbook names are meaningful.

SEVERITY:
LOW

---

## STR-007 Hidden Sheets

PASS IF:

- Hidden sheets use &&Hide intentionally.

SEVERITY:
INFO

---

# 4. Formatting Validation

## FMT-001 Supported Formats

Allowed:

- Standard
- Number
- Text
- Boolean
- Date
- Data Validation
- Hyperlink

SEVERITY:
MEDIUM

---

## FMT-002 Excel Styles

PASS IF:

- Workbook does not rely on unsupported theme formatting.

SEVERITY:
MEDIUM

---

## FMT-003 Empty Styled Cells

PASS IF:

- Empty styled cells are reviewed.

SEVERITY:
LOW

---

## FMT-004 Merged Cells

PASS IF:

- Merged cells are intentional.

SEVERITY:
MEDIUM

---

## FMT-005 Locked Cells

PASS IF:

- Locked cells are intentional.

SEVERITY:
INFO

---

## FMT-006 Grouped Rows/Columns

PASS IF:

- Outline structure is intentional.

SEVERITY:
LOW

---

## FMT-007 Comments

PASS IF:

- User expects comments to be kept.

SEVERITY:
INFO

---

# 5. Excel Formula Validation

## FRM-001 Formula Inventory

Audit every formula used.

SEVERITY:
BLOCKER

---

## FRM-002 Unsupported Functions

PASS IF:

- Every function appears on Mind supported list.

FAIL IF:

- Unsupported function exists.

SEVERITY:
BLOCKER

---

## FRM-003 Dynamic Arrays

Review:

- @ operator
- spilled ranges
- Office 365 dynamic array behaviour

SEVERITY:
HIGH

---

## FRM-004 VBA

FAIL IF:

- VBA logic is required.

SEVERITY:
BLOCKER

---

# 6. MMForExcel Environment Validation

## MMX-001 Add-In Requirement

PASS IF:

MMForExcel is required when MM functions exist.

SEVERITY:
HIGH

---

## MMX-002 Platform

PASS IF:

Workbook is maintained using Windows Excel.

SEVERITY:
HIGH

---

## MMX-003 Function Classification

Classify every MM function into:

- Resize
- Loop
- Dimension
- Instance
- Distribution
- Audit
- AOC/AOS
- Iteration
- Export
- Input

SEVERITY:
MEDIUM

---

# 7. Loop Validation

## LOOP-001 MM_LOOP Inventory

Inventory:

=MM_LOOP()

SEVERITY:
HIGH

---

## LOOP-002 Naming Consistency

PASS IF:

Loop names are consistent.

SEVERITY:
HIGH

---

## LOOP-003 Repeated Definitions

PASS IF:

Ranges have identical lengths.

SEVERITY:
HIGH

---

## LOOP-004 Dynamic Instance Loops

Review use of:

MM_LOOPINSTANCE

SEVERITY:
MEDIUM

---

# 8. MM_RESULT Validation

## RES-001 MM_RESULT Inventory

Inventory:

=MM_RESULT()

SEVERITY:
HIGH

---

## RES-002 Loop References

PASS IF:

Loop names match exactly.

SEVERITY:
HIGH

---

## RES-003 Summed Dimensions

Identify omitted dimensions.

SEVERITY:
MEDIUM

---

## RES-004 Duplicate Loop References

FAIL IF:

Same loop is specified more than once.

SEVERITY:
HIGH

---

## RES-005 Simulation References

Review:

SIM dimension usage

SEVERITY:
MEDIUM

---

# 9. Dynamic Resize Validation

## RZS-001 MM_SETSIZE Inventory

Inventory all:

MM_SETSIZE

SEVERITY:
HIGH

---

## RZS-002 MM_SETSIZE Syntax

Validate syntax.

SEVERITY:
HIGH

---

## RZS-003 Resize Destination Cells

PASS IF:

Destination cells are empty.

SEVERITY:
HIGH

---

## RZS-004 Resize Flags

Inventory:

/Resize
/ResizeRow
/ResizeColumn

SEVERITY:
HIGH

---

## RZS-005 Named Resize Groups

Validate:

/ResizeRow.Name
/Resize.Name
/ResizeColumn.Name

SEVERITY:
MEDIUM

---

## RZS-006 Dynamic References

Audit:

MM_LASTROWCELL
MM_LASTCOLUMNCELL

SEVERITY:
HIGH

---

## RZS-007 Dynamic Helper Functions

Inventory:

MM_GETRANGE

SEVERITY:
INFO

---

# 10. Lookup Validation

## LKP-001 MM_READTABLE Inventory

Inventory:

MM_READTABLE

SEVERITY:
MEDIUM

---

## LKP-002 Header Inclusion

Headers must be included.

SEVERITY:
HIGH

---

## LKP-003 Unique Output Header

Validate output header.

SEVERITY:
HIGH

---

## LKP-004 Duplicate Result Handling

Review first-match behaviour.

SEVERITY:
MEDIUM

---

## LKP-005 NaN Behaviour

Review:

MM_READTABLE
MM_READTABLENAN

SEVERITY:
MEDIUM

---

# 11. Input Manager Validation

## INP-001 Input Grid Inventory

Inventory:

/Input

SEVERITY:
HIGH

---

## INP-002 Naming Convention

Grid names should align with import strategy.

SEVERITY:
MEDIUM

---

## INP-003 Input Settings

Inventory:

/InputSettings

SEVERITY:
MEDIUM

---

## INP-004 Filename Patterns

Validate:

{GridName}
{ModelName}
{InstanceName}
{*}

SEVERITY:
MEDIUM

---

## INP-005 Reorder Support

Inventory:

/Reorder

PASS IF:

- Grid has /Input
- Grid has headers
- No duplicate headers

SEVERITY:
HIGH

---

## INP-006 Format Checking

Review project setting.

SEVERITY:
MEDIUM

---

# 12. Export Validation

## EXP-001 Export Grid Inventory

Inventory:

/Export

SEVERITY:
MEDIUM

---

## EXP-002 Export Settings Inventory

Inventory:

/ExportSettings

SEVERITY:
MEDIUM

---

## EXP-003 Export Column Validation

Validate:

GridName
ExportByInstance
ExportNoInstanceKeys
ExportByLoop
ExportNoLoopKeys
Separator
Culture
Headers
SubHeaders
IncludeHiddenData
FileNamePattern
FileExtension
Locked
AllowScientificFormat

SEVERITY:
HIGH

---

## EXP-004 Filename Pattern Validation

Review:

{ModelName}
{GridName}
{InstanceName}
{LoopsLabels}

SEVERITY:
LOW

---

# 13. Project Settings Validation

## PRJ-001 Project Settings Inventory

Inventory:

/ProjectSettings

SEVERITY:
INFO

---

## PRJ-002 Structure Validation

Required columns:

Name
Value
Locked
Hidden

SEVERITY:
HIGH

---

## PRJ-003 Hidden Settings

Review hidden settings.

SEVERITY:
MEDIUM

---

## PRJ-004 Stochastic Configuration

Review:

Simulation settings

SEVERITY:
MEDIUM

---

## PRJ-005 Debug Configuration

Review:

Performance Profiler
Debug Mode
Stop On NaN

SEVERITY:
LOW

---

# 14. Instance Validation

## INS-001 InstanceKeys

Inventory:

/InstanceKeys

SEVERITY:
HIGH

---

## INS-002 Main Workbook

Validate location of InstanceKeys grid.

SEVERITY:
HIGH

---

## INS-003 Instance Functions

Inventory:

MM_INSTANCE
MM_INSTINDEX
MM_ISINSTANCELOADED

SEVERITY:
MEDIUM

---

## INS-004 Partial Load Behaviour

Review partial load logic.

SEVERITY:
MEDIUM

---

# 15. Interlink Validation

## LNK-001 Inventory

Inventory:

/InputLink
/OutputLink

SEVERITY:
HIGH

---

## LNK-002 Exact Naming Match

Validate source and target names.

SEVERITY:
HIGH

---

## LNK-003 Column Count Match

Validate source/target dimensions.

SEVERITY:
HIGH

---

## LNK-004 Saved Result Requirement

Validate source projects have results.

SEVERITY:
HIGH

---

## LNK-005 Loop Flattening

Review loop retrieval and flattening.

SEVERITY:
MEDIUM

---

# 16. Parameter Editor Validation

## PAR-001 Parameters Inventory

Inventory:

/Parameters

SEVERITY:
MEDIUM

---

## PAR-002 Structure Validation

Required columns:

Label
Type
PossibleValues
Values

SEVERITY:
HIGH

---

## PAR-003 Type Validation

Allowed:

number
text
switch
checkbox
radio
slider
dropdown
percentage
date

SEVERITY:
HIGH

---

## PAR-004 PossibleValues Validation

Review definition syntax.

SEVERITY:
MEDIUM

---

# 17. Iteration Validation

## CAL-001 Calculation Steps

Inventory:

/CalculationSteps

SEVERITY:
MEDIUM

---

## CAL-002 Step Ordering

Validate workbook ordering.

SEVERITY:
HIGH

---

## CAL-003 Parallelization Review

Identify parallel opportunities.

SEVERITY:
LOW

---

## CAL-004 Iteration Functions

Inventory:

MM_ITERATIONS

SEVERITY:
MEDIUM

---

## CAL-005 Iteration Inputs

Inventory:

/iterationinput
/iterationoutput

SEVERITY:
MEDIUM

---

# 18. Performance Validation

## DBG-001 Debug Mode Recommendation

Provide recommendation.

SEVERITY:
INFO

---

## DBG-002 Performance Profiler Recommendation

Provide recommendation.

SEVERITY:
INFO

---

## DBG-003 Large Range References

Review formula efficiency.

SEVERITY:
MEDIUM

---

## DBG-004 Lookup Performance

Review:

VLOOKUP
LOOKUP
MATCH

SEVERITY:
MEDIUM

---

## DBG-005 Dependency Analysis

Recommend dependency analysis when required.

SEVERITY:
INFO

---

## DBG-006 Partial Evaluation

Recommend F9 evaluation workflow.

SEVERITY:
INFO

---

# 19. Upload Risk Validation

## RSK-001 Duplicate Resize Groups

FAIL IF:

Duplicate dynamic reference groups exist.

SEVERITY:
BLOCKER

---

## RSK-002 Oversized Array Results

FAIL IF:

Array calculations exceed grid boundaries.

SEVERITY:
BLOCKER

---

## RSK-003 Hyperlink Upload Risk

Review hyperlinks.

SEVERITY:
MEDIUM

---

## RSK-004 LET Function Review

Review LET formulas.

SEVERITY:
MEDIUM

---

## RSK-005 External Named Range Review

Inventory external named ranges.

SEVERITY:
MEDIUM

---

# 20. Audit Output Format

The auditor must output:

Executive Summary

Readiness Status

Blockers
High
Medium
Low

Findings

For every finding:

- ID
- Severity
- Workbook
- Sheet
- Grid
- Description
- Evidence
- Recommended Fix

Safe Auto Fixes

Manual Fixes

Actuarial Review Items

Enhancement Opportunities

---

# Definition Of Ready

The workbook can be labelled:

"MIND READY"

only when:

- No blockers exist.
- All MM functions are inventoried.
- Dynamic resize structures are validated.
- Import/export structures are validated.
- Instance design is validated.
- Interlinks are validated.
- Project settings are validated.
- Formula compatibility is validated.