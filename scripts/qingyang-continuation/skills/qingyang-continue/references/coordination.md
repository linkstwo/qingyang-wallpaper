# Coordination protocol

The only authoritative lease is `docs/CONTINUATION_LEASE.json` on the selected branch. Use unique owner IDs per invocation. Lease TTL is900seconds, renew at most every300seconds; token `fence` increases on every takeover. Do not treat `workSession.mode=active_development` or a missing release as a permanent exclusion. A live legacy task record is a signal to inspect, not an unbounded lock.

`control.py` reads JSON on stdin and outputs a proposal; it performs no network write. Inputs for `inspect/claim/heartbeat/checkpoint/release`:

```json
{"repository":"linkstwo/qingyang-wallpaper","branch":"feature/cloud-framing-response","head":"40-hex remote HEAD","now":"timezone-aware ISO timestamp","owner":"unique-run-id","fence":1,"runMode":"manual","state":{"currentStage":"S2","status":"in_progress","next":["concrete task"]},"lease":null}
```

Use actual values, not sample strings. For scheduled calls include `runMode=scheduled` and `authorizedWindow={start,end}` from the user-approved schedule. Do not infer or expand that window. `outside_window` and `needs_schedule_scope` mean no scheduled development. `busy` means another valid owner; `ownership_lost` means this writer has no authority to mutate the branch.

For `claim_proposed`, create a tree containing the proposed lease, a commit with parent `expectedHead`, then update the branch only if it still matches `expectedHead`. Fetch it again and verify owner/fence. For heartbeat/release/checkpoint first fetch current HEAD and lease; require same owner/fence, call the helper, then do the same CAS. Lost ownership aborts all queued writes. Update source/state and receipt with the lease in one commit when checkpointing.

Never retry a failed ref update blindly. Reread HEAD, lease and changed paths. A non-fast-forward/expected-SHA conflict is coordination, not evidence of lost permission. Reclaim only if the lease is released or expired. A currently running old worker whose lease expired must stop writes when it returns and detects a newer fence.

For `snapshot`, supply `paths` (explicit changed files), `stage`, `next`, `owner`, `fence`, `head`, `now` and actual `tests=[{command,status,exitCode}]`. The helper hashes source bytes; it does not run tests or prove a remote save. After CAS, retain returned commit SHA in state/handoff or the next receipt. Do not invent the current commit's own hash inside itself.

If shell/Python is unavailable, apply this JSON protocol through available connector tools and document that the bundled helper was not executed. If remote write/CAS is unavailable, keep read-only status accurate and report the specific blocker; do not claim a lease or checkpoint is saved.
