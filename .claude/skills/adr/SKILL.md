---
name: adr
description: Record an architecture decision in docs/adr/ with options, trade-offs and a recommendation. Use when the user runs /adr, when a significant technical choice is being made (framework, data store, infra service, auth approach, deployment model, major version), or when an earlier decision is being changed.
argument-hint: <decision topic>
---

Create or update an Architecture Decision Record for: $ARGUMENTS

1. Read `docs/adr/README.md` to get the next number and check whether an existing ADR already covers this topic. If one does, the new ADR supersedes it: set the old one's status to `Superseded by NNNN` (its status line is the only thing you may edit in an old ADR).
2. Gather facts before writing: current installed versions, `engines` fields, official docs and release status. Mark anything you could not verify.
3. Write `docs/adr/NNNN-kebab-case-title.md` following `docs/adr/template.md`:
    - At least two real options, each with concrete pros and cons covering complexity, cost, lock-in, operational burden, scalability, and learning value for this project.
    - A clear decision. If the user has not decided yet, set status `Proposed` and give your recommendation.
    - "Revisit when" with observable signals, not "if needed".
4. Add the row to the index table in `docs/adr/README.md`.
5. Write the ADR in English. Explain the trade-offs to the user in Simplified Chinese and ask for a decision if the status is `Proposed`.
