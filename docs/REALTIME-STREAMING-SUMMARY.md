# Real-Time Log Streaming: Executive Summary

**Status**: Research & Gap Analysis Complete
**Date**: December 2024

---

## The Problem

Users currently cannot monitor logs in real-time. They must:
1. Run a command to fetch current logs
2. Wait for complete response
3. Re-run command to see new logs
4. Repeat until operation completes

**Desired State**: `databasin automations logs my-automation --follow` streams logs as they happen.

---

## What Exists Today

### Backend (tpi-datalake-api)
✅ PostgreSQL with full log history (current + historical schemas)
✅ REST APIs for retrieving logs via polling
✅ Akka Streams library (for streaming support)
✅ SSE pattern proven in LLMProxyController
✅ Play Framework async/Future infrastructure

❌ No WebSocket or SSE endpoints for logs
❌ No real-time change notifications
❌ No long-lived connections

### CLI (databasin-cli)
✅ Log fetching commands (`automations logs`, `artifacts logs`)
✅ Multiple output formats (table, JSON, CSV)
✅ Proper error handling and authentication

❌ No real-time streaming
❌ No `--follow` flag
❌ `pipelines logs` command not implemented
❌ No persistent connections to backend

---

## Quick Solution Path

### Minimum Viable Product (2 weeks)

**Backend (1 week):**
- Copy existing LLMProxyController SSE pattern
- Create `/api/automations/{id}/logs?stream=true` endpoint
- Add heartbeat every 30 seconds to keep connection alive

**CLI (1 week):**
- Add `--follow` flag to log commands
- Use Node.js EventSource to consume SSE stream
- Print logs line-by-line as they arrive

**Result**: Working real-time logs with 2 weeks effort

### Production-Grade Solution (5-8 weeks)

Add to MVP:
- Token refresh for long-running streams
- PostgreSQL LISTEN/NOTIFY for efficient change detection
- Session recovery (resume from last log ID if connection drops)
- Enhanced error handling and reconnection logic
- Log archival and retention policies

---

## Technology Decisions

### SSE vs WebSocket

For logs (read-only): **Use SSE**
- Simpler to implement (proven pattern in codebase)
- Lower complexity than WebSocket
- Works through HTTP proxies better
- Sufficient for one-way log streaming
- Future upgrade to WebSocket if bidirectional needed

### Database Change Notification

**Phase 1**: Poll database every 1 second (simple, works, some overhead)
**Phase 2**: PostgreSQL LISTEN/NOTIFY (event-driven, ~10x more efficient)
**Phase 3+**: Message queue for high-volume scenarios (Kafka)

---

## Core Gaps to Address

### Backend Gaps

| Gap | Why Matters | Effort |
|-----|-----------|--------|
| No SSE endpoints | Can't stream logs | Low (1-2 days) |
| No change notifications | Database polling inefficient | Medium (3-5 days) |
| No token refresh | Streams fail after 1 hour | Low (1-2 days) |
| No connection limits | Could exhaust resources | Low (1 day) |

### CLI Gaps

| Gap | Why Matters | Effort |
|-----|-----------|--------|
| No streaming client | Can't consume SSE stream | Low (1-2 days) |
| No `--follow` flag | Can't start streaming mode | Low (1 day) |
| `pipelines logs` missing | Users can't follow pipeline logs | Low (1 day) |
| No graceful shutdown | Ctrl+C doesn't clean up | Low (1 day) |

---

## Recommended Action Items

### Immediate (This Sprint)
- [ ] Create detailed implementation specification for SSE endpoints
- [ ] Design log event format (JSON structure for streaming)
- [ ] Plan CLI command changes

### Next Sprint (MVP Implementation)
- [ ] Implement `/api/automations/{id}/logs?stream=true` in backend
- [ ] Implement `automations logs --follow` in CLI
- [ ] Test end-to-end with real automation runs
- [ ] Document usage and troubleshooting

### Future (Production Hardening)
- [ ] Add PostgreSQL LISTEN/NOTIFY
- [ ] Implement token refresh mid-stream
- [ ] Add session recovery after disconnect
- [ ] Extend to all log types (pipelines, artifacts)

---

## Success Metrics

Once implemented, users will be able to:

```bash
# Real-time log monitoring
$ databasin automations logs my-automation --follow
Connected to log stream...
[2024-12-07 14:23:45] INFO: Starting automation execution
[2024-12-07 14:23:46] INFO: Task 1 of 3: data_sync
[2024-12-07 14:24:12] INFO: Task 1 completed (26s)
[2024-12-07 14:24:13] INFO: Task 2 of 3: transformation
[2024-12-07 14:25:03] INFO: Task 2 completed (50s)
...
```

**Key Improvements**:
- ✅ No polling or manual refresh needed
- ✅ See logs in real-time as they happen
- ✅ Graceful exit when automation completes
- ✅ Color-coded by log level (ERROR in red, WARN in yellow)
- ✅ Works reliably over unreliable networks (auto-reconnect)

---

## Risk Assessment

### Low Risk
- SSE implementation (proven pattern in codebase)
- CLI streaming client (well-documented libraries)
- Authentication (existing JWT pattern)

### Medium Risk
- Long-lived connection stability (need proper error handling)
- High-volume log handling (need backpressure management)
- Token expiration during stream (need refresh logic)

### Mitigation
- Start with MVP (SSE only), validate before adding complexity
- Load test with high-volume logs
- Implement exponential backoff reconnection
- Test long streams (90+ minutes)

---

## Architecture Overview

```
Current (Polling):
  CLI ──→ GET /api/automations/{id}/logs ──→ Backend ──→ PostgreSQL
          (wait for response)                              (query)
          ←─── JSON array of logs ←──

Proposed (Streaming):
  CLI ══→ GET /api/automations/{id}/logs?stream=true ══→ Backend
          (persistent connection)
          ←═══ Event: {"timestamp": "...", "message": "..."} ←═══
          ←═══ Event: {"timestamp": "...", "message": "..."} ←═══
          (repeats until stream closed)
                                               PostgreSQL
                                               (triggered updates)
                                               or
                                               (poll every 1s)
```

---

## Code Examples

### Backend (Scala) - New SSE Endpoint

```scala
def getAutomationLogsStream(automationId: String) = Action.async {
  val source = Source.tick(1.second, 1.second, ())
    .flatMapConcat(_ => fetchLatestLogs(automationId))
    .map(toSSEFormat)
    .keepAlive(30.seconds, () => ": keepalive\n")

  Ok.chunked(source)
    .as("text/event-stream")
    .withHeaders("Cache-Control" -> "no-cache")
}
```

### CLI (TypeScript) - New Streaming Logic

```typescript
async function streamLogs(automationId: string) {
  const eventSource = new EventSource(
    `${config.apiUrl}/api/automations/${automationId}/logs?stream=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  eventSource.onmessage = (event) => {
    const log = JSON.parse(event.data);
    console.log(formatLog(log));
  };

  eventSource.onerror = () => {
    console.log('Connection lost, reconnecting...');
    // Auto-reconnect with backoff
  };
}
```

### Usage

```bash
databasin automations logs auto-456 --follow
databasin pipelines artifacts logs artifact-789 --follow
databasin automations logs auto-456 --follow --level ERROR
```

---

## Next Steps

1. **Review this gap analysis** with team
2. **Decide on scope**: MVP vs Production-grade
3. **Assign resources**: Backend team + CLI team
4. **Create detailed spec** for SSE endpoints and log event format
5. **Start Phase 1**: Backend MVP (1 week)
6. **Validate with CLI**: End-to-end test (1 week)
7. **Iterate**: Add features based on user feedback

---

## References

- Full analysis: `docs/REALTIME-LOG-STREAMING-GAP-ANALYSIS.md`
- Backend code: `tpi-datalake-api/app/controllers/api/LLMProxyController.scala`
- Backend code: `tpi-datalake-api/app/com/databasin/platform/llm/LLMProxyService.scala`
- CLI implementation: `databasin-cli/src/commands/automations.ts`
- Play Framework SSE docs: https://www.playframework.com/documentation/latest/ScalaStream
- EventSource (Node.js): https://www.npmjs.com/package/eventsource

