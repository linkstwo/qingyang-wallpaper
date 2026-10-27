---
name: qingyang-status
description: Read-only status and artifact verification for 轻漾 wallpaper. Use when the user asks current progress, whether development is actually running, what changed, the current S-stage, interruption causes, or the latest APK. Do not start or schedule development from a status-only request.
---

# 轻漾真实进度

Resolve latest HEAD for `linkstwo/qingyang-wallpaper`, starting with `feature/cloud-framing-response`. Read START_IN_CLOUD, EXECUTION_STATE, latest candidate result and `docs/CONTINUATION_LEASE.json` if present. Compare current request with those sources. Do not rely on an old conversation's stage or APK version.

For lease interpretation use [control.py](../qingyang-continue/scripts/control.py) `inspect` and [coordination](../qingyang-continue/references/coordination.md). A valid lease means recorded occupancy, not proof of a live process. A stale active flag, no new commits, or an installed plugin is never proof of continuing work. If related scheduling is relevant, use `peek`, compare run IDs/time ranges and distinguish last_run from an older latest_result. Do not create/extend/restart tasks from this skill.

Check actual release metadata and APK hash/signing evidence. Give an existing valid direct download promptly; do not rebuild or download large files merely to answer status. Never imply phone acceptance from a build or a cloud render.

Respond concisely in Chinese: what actually changed, current S-stage/incomplete requirements, latest real checkpoint and APK, whether runtime is verified active/stopped/unknown, blocker and next concrete action. Do not repeat long plans, pretend unexecuted work is done, or claim that a final reply keeps development running. If the user explicitly also asks to continue, hand off to `$qingyang-continue` after the brief status.
