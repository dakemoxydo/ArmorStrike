# Task Plan: Architectural refactor

## Goal

Analyze ArmorStrike architecture, prioritize structural problems, then refactor **one problem at a time** without gameplay regressions (tests + typecheck).

## Status: **implementation complete** (behavior-preserving structural pass)

## Phases

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Architecture analysis + prioritized list | **complete** | See `findings.md` |
| 2. Agree backlog / which P-items to implement | **complete** | User: implement, preserve behavior |
| 3. Implement cycles | **complete** | P2.3, P1.1, P1.2, P0.1, P0.2 types, P0.3 partial, P2.1 charge FX |
| 4. Verify (typecheck, tests, graphify update) | **complete** | typecheck clean; 123 tests pass |
| 5. Close / archive | **complete** | residual optional only |

## Phase 1 deliverable

Prioritized list in `findings.md`:

- **P0:** TankEntity fan-in, SimContext bag, AIController blob  
- **P1:** Audio/Effects concrete hubs, fat WeaponDeps  
- **P2:** Railgun SRP, bootstrap/debug hygiene, physics module split  
- **P3–P4:** HudModel DTO, GameApi discipline, config scatter  

Context: prior `stepwise-refactor` already cleared many CRITICAL/MEDIUM items (Game split, weapon ports, DamageSystem, etc.).

## Rules

- No drive-by refactors outside the chosen P-item.
- No balance changes unless user explicitly OK.
- After code changes: `npm run typecheck`, `npm test`, `graphify update . --force`.
