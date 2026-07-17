## Working style

- Prefer clear, complete sentences. Keep changes focused on the request.
- For multi-step or ambiguous work, use **Plan Mode** before large edits.
- After substantive code changes, run relevant **tests / builds** when they exist.
- Prefer small, reviewable diffs over drive-by refactors.

## Graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

1. **Read the map first.** Before architectural questions, dependency analysis, or large refactors, consult `graphify-out/GRAPH_REPORT.md` when it exists.
2. **Prefer graph queries over bulk file reads.** Use `graphify query`, `graphify path`, and `graphify explain` instead of mass `grep` / reading many source files for structure questions. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
3. **Keep the graph fresh.** After significant architectural changes, offer to rebuild (`graphify .` or incremental `graphify update .` / `graphify . --update`). After ordinary code edits, run `graphify update .` (AST-only, no API cost).
4. **Share the graph.** Prefer committing `graphify-out/` so teammates share the map. Keep local-only noise out of git (e.g. `graphify-out/cost.json`; optionally ignore `graphify-out/cache/`).

Additional notes:

- Dirty `graphify-out/` files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` for broad architecture review, or when query/path/explain do not surface enough context.

### Everyday commands

```bash
graphify query "how does combat connect to weapons?"
graphify path "Game" "TankEntity"
graphify explain "CameraRig"
graphify update .              # incremental AST refresh (no API)
graphify extract . --code-only # full code re-index without LLM
graphify hook install          # post-commit graph rebuild
```
