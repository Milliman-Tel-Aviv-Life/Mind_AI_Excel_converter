# MM Formula Review Playbook

Version: 0.1

Purpose:
Provide a deterministic review process for MMForExcel formulas.

Used By:
- Formula Auditor
- Workbook Reviewer
- Model QA Copilot
- Formula Builder Validation Layer

---

# 1. Review Objectives

Every formula review must answer:

1. Is the formula syntactically valid?
2. Is the MM function usage valid?
3. Does the formula respect Mind-specific rules?
4. Could Excel and Mind produce different results?
5. Is there a modeling risk?
6. Is there an actuarial review requirement?

---

# 2. Review Severity Levels

## BLOCKER

Formula cannot safely run.

Examples:

- invalid MM syntax
- unsupported MM function
- circular dependency
- invalid loop reference
- broken iteration reference
- inconsistent dimensions

Required action:

```text
Must be corrected before upload.
```

---

## HIGH

Formula may run but likely produces incorrect results.

Examples:

- loop case mismatch
- omitted mandatory parameters
- wrong simulation selector
- incorrect MM_RESULT dimension use
- SUMIFS dimension mismatch

Required action:

```text
Review before production use.
```

---

## MEDIUM

Formula likely works but contains maintainability or robustness risks.

Examples:

- fixed references in dynamic tables
- unnecessary duplication
- hardcoded indexes
- risky instance references

Required action:

```text
Recommend correction.
```

---

## LOW

Minor improvement opportunity.

Examples:

- readability
- naming conventions
- simplification opportunity

---

## INFO

No defect found.

Provide explanation only.

---

# 3. Review Workflow

For every formula:

Step 1

Identify:

```text
Excel function
MM function
Custom formula
Hybrid formula
```

Step 2

Locate every MM function.

Step 3

Validate each MM function against:

```text
02_MM_Function_Registry.md
```

Step 4

Determine dimensions:

```text
Loop dimensions
Simulation dimensions
Instance dimensions
Iteration dimensions
```

Step 5

Evaluate:

```text
Excel behaviour
Mind behaviour
```

Step 6

Assign severity.

---

# 4. MM Function Review Matrix

## MM_LOOP

Review:

```text
Loop name
Loop size
Case sensitivity
Duplicate loop definitions
```

Red flags:

```text
Scenario
scenario
```

must be treated as different loops.

---

## MM_RESULT

Review:

```text
Specified loops
Omitted loops
SIM selector
Dimension aggregation
```

Red flags:

```text
Missing loop specifications causing
unintended summation.
```

---

## MM_SUM

Review:

```text
Simulation aggregation only
```

Red flags:

```text
User expects loop aggregation.
```

---

## MM_SUMIF
## MM_SUMIFS
## MM_COUNTIF
## MM_COUNTIFS
## MM_AVERAGEIF
## MM_AVERAGEIFS

Review:

```text
Range sizes
Dimension consistency
Criteria syntax
SIM selector
Loop selector
```

Red flags:

```text
">12,5"
```

Should be:

```text
">12.5"
```

---

## MM_READTABLE
## MM_READTABLENAN

Review:

```text
Headers included
Criteria order
Lookup assumptions
```

Red flags:

```text
Header missing
Criteria misordered
```

---

## MM_INSTANCE

Review:

```text
Instance existence
Dynamic loop interaction
Cross-instance dependencies
```

---

## MM_ITERATIONS

Review:

```text
Single definition only
Iteration count
Workbook usage
```

Red flags:

```text
More than one MM_ITERATIONS
in same workbook
```

---

# 5. Dynamic Table Review Rules

Applies to:

```text
MM_TABLE
MM_ROW
MM_COLUMN
MM_LASTROW
MM_LASTROWCELL
MM_LASTCOLUMN
MM_LASTCOLUMNCELL
MM_RANGE
MM_SETSIZE
```

Checklist:

- dynamic table confirmed
- empty cells reviewed
- Excel/Mind difference reviewed
- resize behavior reviewed

Flag:

```text
MEDIUM
```

unless calculation error is possible.

---

# 6. Excel vs Mind Risk Checklist

Whenever a formula contains:

```text
MM_ROW
MM_COLUMN
MM_TABLE
MM_LASTROW
MM_LASTROWCELL
MM_LASTCOLUMN
MM_LASTCOLUMNCELL
MM_RANGE
```

review must contain:

```text
Excel behaviour may differ from Mind behaviour.
```

This warning is mandatory.

---

# 7. Iteration Review Rules

Review:

```text
MM_ITERATIONS
MM_CURRENTITERATION
MM_READITERATION
```

Questions:

1. Is iteration defined?
2. Is it defined once?
3. Is MM_READITERATION reading another workbook?
4. Is workbook dependency valid?

Critical failure:

```text
MM_READITERATION used
inside the same workbook.
```

---

# 8. Instance Review Rules

Review:

```text
MM_INSTANCE
MM_INSTINDEX
MM_INSTANCEKEY
MM_ISINSTANCELOADED
```

Questions:

```text
Can instance be missing?
Is partial load possible?
Should NaN be returned?
```

Required warning:

```text
Verify behaviour under partial load.
```

---

# 9. Formula Review Output Format

Use:

```text
Formula
Finding
Severity
Explanation
Recommendation
```

Example:

Formula:
=MM_SUMIFS(...)

Finding:
Dimension mismatch

Severity:
HIGH

Explanation:
Range1 and Sum_value do not share
the same dimensions.

Recommendation:
Align dimensions before upload.

---

# 10. Automatic Review Constraints

The reviewer may:

```text
Detect
Explain
Recommend
```

The reviewer must NOT:

```text
Change actuarial logic
Change assumptions
Change business rules
```

without explicit instruction.

---

# 11. Mandatory Warnings

Always warn for:

- unsupported MM functions
- Excel vs Mind differences
- loop name case issues
- instance partial load risks
- iteration misuse
- empty parameter usage

---

# 12. Definition Of Done

Review is complete when:

- all MM functions identified
- syntax validated
- dimensions reviewed
- criteria reviewed
- Excel/Mind differences reviewed
- severity assigned
- recommendations supplied

The objective is:

```text
Safe Mind upload
not formula optimization.
```