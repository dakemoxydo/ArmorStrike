# Functional bugfix — ArmorStrike

## Goal
Find and fix all critical + medium functional bugs via one-bug-per-cycle root-cause process.

## Status
- Phase 1 (inventory): complete
- Phase 2 (fix cycles): in progress

## Active cycle
Bug C1 — Death softlock (auto-pause freezes game-over)

## Inventory
See `findings.md`.

## Rules
- One bug per cycle: QA → Diagnostician → Engineer → Reviewer
- Root cause only; temporary debug logs; unit tests for pure logic
- Do not change files outside the active bug plan scope
