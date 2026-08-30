# Claude Code Prompt

Begin with a short discovery phase. Inspect the repository before writing substantial code and ask only a limited number of high-value questions not answered by the repository or this package. Then provide a concise implementation plan before major changes.

## Objective

Build a Python application that analyzes, validates, and prepares copied Excel workbooks for Milliman Mind. It must use a provider-neutral LLM abstraction compatible with the configured Milliman API manager, preserve workbook content, support the four defined modes, emit structured outputs and an external change log, revalidate after mutation, and require successful recalculation before PASS.

## Implementation requirements

1. Inspect repository structure, framework, Python version, dependencies, Excel libraries, LLM clients, UI, tests, deployment, logging, and CI/CD before modifying anything.
2. Do not assume a framework or replace working architecture without evidence.
3. Keep deterministic Excel processing separate from LLM reasoning.
4. Load rules from this package rather than hardcoding all rules in application code.
5. Keep provider adapters outside business logic.
6. Implement JSON Schema-validated outputs and exact statuses.
7. Implement source immutability, fresh-copy processing, before-state hashes, preservation comparison, validation, transformation, revalidation, recalculation, and external change tracking.
8. Create unit, integration, golden-workbook, preservation, recalculation, edge-case, and failure-injection tests.
9. Do not hardcode assumptions unsupported by active rules.
10. Preserve rule and source IDs.
11. Document setup, configuration, secrets, providers, recalculation, rules, tests, deployment, and limitations.
12. Identify anything that cannot be implemented reliably and return NOT_SUPPORTED rather than pretending completion.
13. Ask targeted questions rather than silently guessing.
14. Proceed in phases and verify each phase before continuing.

## Required discovery topics

Ask only if not discoverable: existing stack, Excel library, recalculation environment, LLM provider adapter, secret management, UI, upload/download behavior, approval flow, deployment environment, security requirements, existing tests, CI/CD, and code that must be preserved.

## Recalculation

Find and test a technically defensible way to recalculate Excel results. Prefer Microsoft Excel automation on a suitable Windows worker when Excel-faithful behavior is required and available. Treat other engines as supported only for the feature classes proven by conformance tests. Setting calculation flags or saving through a Python library is not successful recalculation.

## Phases

1. Discovery and clarification
2. Domain models and schemas
3. Rule registry and loader
4. Workbook inventory and preservation baseline
5. Deterministic validators
6. Mode workflows
7. LLM abstraction and structured reasoning
8. Immutable change-set application
9. Recalculation adapters
10. Revalidation and readiness aggregation
11. Change log and reporting
12. Tests, security review, and documentation

After each phase, run relevant tests, inspect failures, correct defects, summarize results, and identify remaining uncertainty.

## Definition of done

The source is immutable; xlsx and xlsm workflows are tested; VBA is preserved; all four modes work; active rules are external and traceable; deterministic checks precede LLM calls; LLM output is schema-valid; changes carry hashes and rule IDs; output reopens; package preservation is checked; a trusted recalculation adapter succeeds; failures and unresolved questions prevent PASS; the external change log is produced; tests and documentation are complete; no secrets are exposed.

At completion report architecture, files changed, commands and tests, recalculation approach, preservation guarantees, limitations, unsupported features, security considerations, and recommended next steps.
