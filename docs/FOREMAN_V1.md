# Thin foreman

Jarvis stores messages, versioned drafts, one-shot decision cards and a ticket-event projection cursor in SQLite schema 16. It does not add an AI planner, reviewer or worker role. The existing Builder model, permission profile and protected checker are unchanged.

Messages are append-only. A fresh read-only Codex session produces a bounded draft from the message and known project paths only. One clarification may be answered with another fresh drafting session. Rejected output is retained privately, and provider usage is recorded without estimates. Draft edits change the version; Start binds the new ticket ID inside the same SQLite transaction that inserts the ticket. Interrupted reservations become ERROR and never replay automatically.

Status and action intents dispatch before drafting. Typed action text has no authority. Each button contains an opaque card ID and the exact current binding: ticket state/candidate/evidence, approved-playbook hash, or existing permission generation/transport/thread/turn/payload. Cards are reserved once before effects. The downstream ticket/permission service revalidates its own authority. Failures are not automatically retried as decisions. Existing trusted local CLI commands remain explicit operator controls.

Event updates deduplicate by the original ticket-event sequence and recover after restart. They contain no model-generated status. Fuel is a coalesced cached read of account/rateLimits/read, never a model call or purchase. The UI polls local HTTP; no SSE or new external integration.

After Keep succeeds, chat records the actual repo and local branch plus shell-quoted inspection and manual merge commands. Existing worktree changes must be committed/stashed by the user before switching branches. No automated merge occurs.
