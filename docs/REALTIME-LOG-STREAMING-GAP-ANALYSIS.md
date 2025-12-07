# Real-Time Log Streaming: Gap Analysis

**Date**: December 2024
**Scope**: Analysis of current log implementations in tpi-datalake-api and databasin-cli
**Objective**: Identify infrastructure gaps and requirements for implementing real-time log streaming

---

## Executive Summary

Both projects support **pull-based log retrieval** through REST APIs, but **neither implements real-time streaming**. The backend has infrastructure that could support streaming (Akka Streams, SSE pattern proven in LLMProxy), but real-time log endpoints don't exist. The CLI fetches logs via single synchronous requests with no monitoring or watching capabilities.

**Estimated Implementation Complexity**: Medium (3-4 weeks for production-grade solution)

---

## Part 1: Backend (tpi-datalake-api) Gap Analysis

### Current Implementation

#### What Exists ✅

**Log Storage:**
- PostgreSQL database with dual-schema design (current + history)
- Automatic trigger-based history replication
- Comprehensive log data: timestamps, status, duration, error messages
- Support for pipeline/artifact/automation/task logs

**Log Retrieval Endpoints:**
- `GET /api/pipeline/logs` - Pipeline execution logs
- `GET /api/artifacts/logs` - Artifact stage-by-stage logs
- `GET /api/automations/logs` - Automation execution logs
- `GET /api/automations/tasks/logs` - Task-level logs within automations
- `GET /api/pipeline/history/:id` - Historical pipeline runs (last 30)
- `GET /api/automations/history/:id` - Historical automation runs

**Query Capabilities:**
- Filter by specific execution ID or latest run
- Conditional filtering for current vs historical runs
- Window function calculations for stage durations

**Infrastructure Foundation:**
- Akka Streams library (streaming-capable)
- Play Framework with async/Future support
- Server-Sent Events pattern implemented in LLMProxyController
- Proven connection keep-alive and chunked response handling

#### What's Missing ❌

**Real-Time Delivery Mechanisms:**
- ❌ No WebSocket endpoints for logs
- ❌ No Server-Sent Events (SSE) for logs (only used in LLM proxy)
- ❌ No persistent connections (all endpoints are request-response)
- ❌ No change notification system (LISTEN/NOTIFY not implemented)
- ❌ No pub/sub for log events

**Event System:**
- ❌ No message queue (Kafka, RabbitMQ)
- ❌ No event bus for log notifications
- ❌ No hooks for external log consumers
- ❌ No log streaming service separate from query service

**Connection Management for Streaming:**
- ❌ No heartbeat/keep-alive mechanism for long-lived connections
- ❌ No backpressure handling (slow client buffering)
- ❌ No client disconnection detection
- ❌ No reconnection logic or session state tracking
- ❌ No authentication token refresh for streaming sessions

**High-Volume Log Support:**
- ❌ No streaming buffer management
- ❌ No connection pooling for streaming clients
- ❌ No rate limiting for high-frequency log producers
- ❌ No log compression or chunking strategy

**Operational Requirements:**
- ❌ No monitoring/metrics for streaming connections
- ❌ No graceful shutdown support for open streams
- ❌ No partial failure handling (some clients fail while others continue)
- ❌ No log retention policies (logs never deleted)

---

### Backend Gap Categories

#### 1. Protocol & Transport Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Real-time protocol | Request-response (polling) | WebSocket OR SSE | Medium |
| Persistent connections | None | Connection pooling, lifecycle mgmt | Medium |
| Bidirectional comm | No | Optional (commands to stream) | Low |
| Protocol upgrade | N/A | WebSocket handshake in Play | Low |

**Details:**
- Play Framework supports both WebSocket and SSE via built-in APIs
- WebSocket: Full duplex, lower latency, more complex (needs Akka Actor)
- SSE: Simpler, unidirectional, already proven in LLMProxyController
- Trade-off: SSE is lower effort for logs (read-only use case)

#### 2. Event & Change Detection Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Change notification | Polling only | PostgreSQL LISTEN/NOTIFY | Medium |
| Event system | None | Pub/sub or event bus | High |
| Message queue | None | Kafka/RabbitMQ for decoupling | High |
| Event ordering | N/A | Sequence numbering for events | Low |

**Details:**
- PostgreSQL LISTEN/NOTIFY is native, would require:
  - Trigger-based NOTIFY calls on log table updates
  - Listener in Scala using `postgresql-notification` library
  - Could reduce database polling from every request to event-driven
- Message queue (full production approach):
  - Publish logs to Kafka on creation
  - Subscribe via WebSocket server
  - Decouples log producers from consumers
  - Adds operational complexity (another service to manage)

#### 3. Connection Management Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Keep-alive | N/A | Ping/pong frames (WebSocket) or heartbeat comments (SSE) | Low |
| Client tracking | N/A | HashMap of active connections | Low |
| Disconnection handling | N/A | Cleanup on close | Low |
| Session state | N/A | Last sent log ID, filter state | Medium |
| Token refresh | N/A | JWT refresh mid-stream | Medium |

**Details:**
- WebSocket has native ping/pong frames (automatic in Play)
- SSE requires manual heartbeat (`:keepalive\n` comment lines every 30s)
- Session state allows resuming from last position if reconnect
- Token refresh: JWTs expire during long streams (90+ min logs)

#### 4. Backpressure & Flow Control Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Flow control | N/A | Client feedback on buffer status | Medium |
| Slow client handling | N/A | Akka Streams backpressure | Medium |
| Buffer sizing | N/A | Configurable per connection | Low |
| Rate limiting | N/A | Throttle high-volume logs | Medium |

**Details:**
- Akka Streams has built-in backpressure via `Source` operators
- Slow clients can cause memory issues (unbounded buffering)
- Solution: Use `Source.queue()` with `OverflowStrategy.fail` or `.drop`
- Rate limiting via `throttle()` operator

#### 5. Operational Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Metrics | Application metrics only | Streaming connection metrics | Low |
| Graceful shutdown | Standard JVM shutdown | Drain open streams | Low |
| Error recovery | 5xx errors | Partial failures don't break stream | Medium |
| Log retention | Infinite | Archive old runs, purge strategy | Medium |

**Details:**
- Need to track: active connections, bytes transferred, client churn
- Graceful shutdown: Wait for clients to disconnect or timeout after 30s
- Partial failures: One slow client shouldn't affect others

---

### Backend Implementation Roadmap (By Effort)

**Phase 1 - MVP (1-2 weeks):** SSE-based streaming
- [ ] Create new `StreamingController` with SSE endpoints
- [ ] Implement `getAutomationLogsStream()` following LLMProxyController pattern
- [ ] Add heartbeat mechanism (`:keepalive\n` every 30s)
- [ ] Handle client disconnection gracefully
- [ ] Test with CLI client (polling behavior still works)

**Phase 2 - Enhanced (1-2 weeks):** PostgreSQL LISTEN/NOTIFY
- [ ] Add PostgreSQL `NOTIFY` calls on log table triggers
- [ ] Create listener service subscribing to notifications
- [ ] Reduce database polling for idle streams
- [ ] Implement exponential backoff for recovery
- [ ] Add connection metrics (Prometheus)

**Phase 3 - Production (2-4 weeks):** Full message queue integration
- [ ] Deploy Kafka or RabbitMQ cluster
- [ ] Create log producer publishing to message queue
- [ ] Create streaming server consuming from queue
- [ ] Implement consumer group for load balancing
- [ ] Add log retention policies
- [ ] Implement log archival (to S3 or cold storage)

---

## Part 2: CLI (databasin-cli) Gap Analysis

### Current Implementation

#### What Exists ✅

**Log Commands:**
- `databasin automations logs` - Fetch and display automation logs
- `databasin automations tasks logs` - Fetch and display task logs
- `databasin pipelines artifacts logs` - Fetch and display artifact logs
- `databasin pipelines history` - Historical pipeline runs
- `databasin automations history` - Historical automation runs

**Output Capabilities:**
- Table format (auto-sized columns with CLI Table3)
- JSON format (with syntax highlighting option)
- CSV format (RFC 4180 compliant)
- Color output (chalk library, respects NO_COLOR)
- Field filtering (`--fields` parameter)
- Result limiting (`--limit` parameter)

**Error Handling:**
- API error messages with helpful context
- Validation errors for missing parameters
- 401 token refresh and retry
- User-friendly error formatting

**Progress Indicators:**
- Spinner animation during data fetch (table format only)
- Success/failure state indicators
- Token usage warnings for large responses

#### What's Missing ❌

**Real-Time Streaming:**
- ❌ No WebSocket client library
- ❌ No SSE (Server-Sent Events) handling
- ❌ No async event listeners
- ❌ No streaming output while data arrives
- ❌ No persistent connections

**Monitoring & Following:**
- ❌ No `--follow` or `--watch` flag
- ❌ No continuous polling loop
- ❌ No polling interval configuration
- ❌ No `tail -f` style behavior
- ❌ No filtering during streaming (client-side)

**Output for Streaming:**
- ❌ No dynamic line updates (would overwrite spinner)
- ❌ No real-time progress indicators
- ❌ No line-by-line streaming output
- ❌ No log buffering for incomplete lines
- ❌ No "new logs" highlighting in terminal

**Connection Management:**
- ❌ No WebSocket client implementation
- ❌ No SSE parser
- ❌ No reconnection logic
- ❌ No exponential backoff on connection loss
- ❌ No session recovery (resume from last log)

**Interactive Features:**
- ❌ No Ctrl+C graceful shutdown
- ❌ No pause/resume capability
- ❌ No filtering/searching live logs
- ❌ No log level filtering during stream
- ❌ No timestamp filtering (e.g., "since 5 minutes ago")

**Pipeline Log Command:**
- ❌ `databasin pipelines logs` is NOT IMPLEMENTED
- ❌ Currently shows placeholder warning
- ❌ Directs users to UI instead

---

### CLI Gap Categories

#### 1. Streaming Protocol Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| WebSocket support | None | `ws` npm package + parser | Medium |
| SSE support | None | Simple EventSource parser | Low |
| Connection lifecycle | N/A | Connect → Listen → Disconnect | Low |
| Message parsing | N/A | JSON parsing of log events | Low |

**Details:**
- SSE is easier: native `EventSource` API in Node.js (via `eventsource` npm)
- WebSocket requires: `ws` library, Akka Actor coordination on backend
- For CLI, SSE is better choice (simpler, sufficient for unidirectional logs)

#### 2. Output & Display Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Line-by-line output | Buffered JSON | Streaming line display | Medium |
| Dynamic updates | Static table | Rolling log display | Medium |
| Spinner compatibility | Incompatible | Handle spinner during stream | Low |
| Timestamp formatting | Post-fetch | Real-time relative time | Low |
| Color coding by level | Not used | ERROR (red), WARN (yellow), INFO (green) | Low |

**Details:**
- Current spinner shows only during fetch, hides once results arrive
- Streaming: Need to show logs as they arrive, one line at a time
- Solution: Replace spinner with live log display
- Terminal clearance: Simple `process.stdout.write()` per line

#### 3. Command-Line Flags Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| --follow/--tail | Missing | Continuous stream mode | Low |
| --initial-lines | Missing | Load N logs before streaming | Low |
| --since | Missing | Time-based filter | Medium |
| --level | Missing | Filter by log level (ERROR, WARN, etc.) | Low |
| --filter | Missing | Regex pattern matching | Low |
| --no-timestamps | Missing | Hide timestamps in output | Low |

**Details:**
- These are Commander.js option definitions: straightforward to add
- `--since` requires timestamp parsing and server-side support
- Client-side filtering (--filter, --level) can run locally

#### 4. Connection Management Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Reconnection | N/A | Exponential backoff (1s → 30s) | Low |
| Graceful disconnect | N/A | Clean close on Ctrl+C | Low |
| Heartbeat timeout | N/A | Detect stale connections | Medium |
| Session recovery | N/A | Resume from last log ID | Medium |
| Timeout handling | 30s default | Streaming timeout (90s+) | Low |

**Details:**
- Graceful disconnect: Handle `SIGINT` signal
- Heartbeat: Detect if no data for 60s, reconnect
- Session recovery: Track last log ID, reconnect and request from that point
- Timeout: Disable for streaming (only kill if truly hung)

#### 5. Error Handling Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Connection errors | Logged | Retry with backoff | Low |
| Parse errors | Fatal | Skip malformed message | Low |
| Timeout errors | Fatal | Retry or exit | Low |
| Auth expiration | 401 refresh (once) | Refresh mid-stream | Medium |
| Partial failures | Visible | Continue despite one failure | Low |

**Details:**
- WebSocket close codes need interpretation (1000=normal, 1006=abnormal)
- SSE reconnection is automatic (browser will retry)
- Auth refresh: Refresh token and re-establish connection

#### 6. Implementation Architecture Gaps

| Gap | Current | Needed | Complexity |
|-----|---------|--------|------------|
| Streaming client | None | New utility module | Medium |
| Event emitter | None | Emit log events to command | Low |
| Buffer management | N/A | Handle line breaks mid-stream | Medium |
| Terminal control | None | Cursor positioning, colors | Low |

**Details:**
- New file: `src/utils/log-streamer.ts`
  - `class LogStreamer` with EventEmitter
  - `connect(url)` → opens SSE/WebSocket
  - Emits events: `log`, `status`, `error`, `disconnect`
- Terminal: Use chalk for colors, simple writes for output

---

### CLI Implementation Roadmap (By Effort)

**Phase 1 - Foundation (2-3 days):**
- [ ] Implement `databasin pipelines logs` command (currently missing)
- [ ] Add `src/utils/log-streamer.ts` (SSE-based for MVP)
- [ ] Add `--follow` flag to all log commands
- [ ] Implement graceful Ctrl+C handling
- [ ] Add basic error logging for connection failures

**Phase 2 - UX Polish (1-2 days):**
- [ ] Add log level color coding (ERROR → red, WARN → yellow)
- [ ] Add `--initial-lines` to load past logs before streaming
- [ ] Add `--filter` for client-side regex filtering
- [ ] Format relative timestamps ("2 minutes ago" vs full ISO)
- [ ] Add `--no-timestamps` flag for compact output

**Phase 3 - Robustness (2-3 days):**
- [ ] Implement exponential backoff reconnection
- [ ] Add heartbeat timeout detection (60s no data → reconnect)
- [ ] Implement session recovery (last log ID tracking)
- [ ] Handle mid-stream token expiration (refresh + reconnect)
- [ ] Add connection status indicator

**Phase 4 - Advanced (3-5 days):**
- [ ] Implement `--since` flag (backend support needed)
- [ ] Add `--level` filtering
- [ ] Implement log buffering for incomplete lines
- [ ] Add pagination support for historical logs with streaming
- [ ] Create example monitor script (polling wrapper)

---

## Part 3: Integration Gaps

### API Contract Gaps

**Current Log Endpoints:**
```
GET /api/automations/logs?automationID={id}&currentRunID={runID}&limit={n}
GET /api/artifacts/logs?artifactID={id}&currentRunID={runID}&limit={n}
GET /api/automations/tasks/logs?automationTaskID={id}&currentRunID={runID}&limit={n}
GET /api/pipeline/logs?pipelineID={id}&currentRunID={runID}
```

**Needed for Streaming:**
```
WebSocket /ws/automations/{id}/logs?token={jwt}&since={logID}
  OR
GET /api/automations/{id}/logs?stream=true&token={jwt}&since={logID}
```

**Missing Response Headers:**
- ❌ `Transfer-Encoding: chunked` for streaming
- ❌ `Content-Type: text/event-stream` for SSE
- ❌ `Connection: keep-alive` for persistent connections
- ❌ `Cache-Control: no-cache` for streaming

**Missing Request Parameters:**
- ❌ `stream=true` to activate streaming
- ❌ `since={logID}` to resume from position
- ❌ `follow=true` to stay connected after run completes
- ❌ `heartbeat={interval}` to customize keep-alive

---

### Authentication Gaps

**Current Pattern:**
- Token in Authorization header
- 401 response triggers refresh (once)
- Token lasts 1 hour

**For Streaming:**
- ❌ Token refresh mid-stream (current expires during long logs)
- ❌ WebSocket authentication (different from HTTP header)
- ❌ Query parameter tokens (not ideal but sometimes necessary for SSE)
- ❌ Session invalidation detection (proactive refresh before expiry)

**Solution Required:**
- Implement token refresh endpoint call before token expiry
- Or: Accept query parameter `token={jwt}` for WebSocket/SSE
- Or: Use bearer token in first WebSocket frame

---

### Type Definition Gaps

**Current:**
- `AutomationLogEntry[]` - Array type
- `ArtifactLogEntry[]` - Array type

**Needed:**
- `LogStreamEvent` - Individual log event structure
- `StreamStatusMessage` - Status updates (connected, reconnecting, etc.)
- `StreamErrorMessage` - Error details with recovery suggestions
- `LogFilter` - Filter configuration for server or client

**New Event Types:**
```typescript
interface LogStreamEvent {
  type: 'log';
  data: {
    id: string;           // Unique log ID for resumption
    timestamp: string;    // ISO timestamp
    level?: string;       // INFO, WARN, ERROR, DEBUG
    message: string;      // Log message
    metadata?: Record<string, unknown>;
  };
}

interface StreamStatusEvent {
  type: 'status';
  status: 'connected' | 'reconnecting' | 'completed' | 'paused';
  message?: string;
}

interface StreamErrorEvent {
  type: 'error';
  error: {
    code: string;         // Connection error, Auth error, etc.
    message: string;
    recoverable: boolean;
  };
}
```

---

## Part 4: Technology Decisions

### WebSocket vs Server-Sent Events (SSE)

| Aspect | WebSocket | SSE |
|--------|-----------|-----|
| Complexity | High (bidirectional, state mgmt) | Low (unidirectional) |
| Browser Support | Good | Good (Node.js via `eventsource`) |
| Latency | Lower | Slightly higher |
| Multiplexing | Built-in | Per-connection only |
| Fallback | Can add HTTP polling | Automatic browser fallback |
| Firewall Issues | Sometimes blocked | Works through HTTP proxies |
| Connection Reuse | Full duplex | Read-only |
| Use Case Fit | Chat, commands | Notifications, logs |

**Recommendation for Logs:** SSE (simpler, sufficient for read-only use case)
- If commands needed later (start/stop execution), upgrade to WebSocket

---

### Database Change Notification

| Approach | Complexity | Latency | Cost |
|----------|-----------|---------|------|
| Polling every 1s | Low | 1s delay | High DB load |
| PostgreSQL NOTIFY | Medium | <100ms | Very low (event-driven) |
| Message Queue (Kafka) | High | <10ms | High (another service) |
| Webhooks to external | Medium | <100ms | External service needed |

**Recommendation:** PostgreSQL NOTIFY (Phase 2)
- Implement SSE polling first (Phase 1)
- Add NOTIFY for ~10x efficiency improvement
- Save message queue for high-volume scenarios (Phase 3)

---

### Buffer Management Strategy

**For Slow Clients:**
- Akka Streams `Source.queue()` with `OverflowStrategy.fail`
- Buffer up to 10,000 log entries per client
- Disconnect if buffer exceeds limit (prevents memory leak)
- Log warning when disconnecting slow client

**For Network Reliability:**
- Implement log ID sequencing server-side
- Client tracks last received log ID
- Reconnect requests `since={lastLogID}`
- Server retrieves and sends any missed logs first (within 24h window)

---

## Part 5: Implementation Schedule & Effort Estimates

### Total Effort: 5-8 weeks (production-grade)

```
Week 1-2: Backend MVP (SSE support)
├─ Create StreamingController with SSE endpoints
├─ Implement heartbeat mechanism
├─ Handle disconnections gracefully
└─ Test with manual curl/nc

Week 2-3: CLI Streaming Foundation
├─ Implement pipelines logs command
├─ Add streaming client utility
├─ Add --follow flag to log commands
├─ Implement Ctrl+C graceful shutdown
└─ Test with backend MVP

Week 3-4: CLI UX Polish
├─ Add color-coded log levels
├─ Add --filter and --initial-lines
├─ Format timestamps
├─ Add connection status indicators
└─ E2E testing with real logs

Week 4-5: Backend Enhancement (NOTIFY)
├─ Add PostgreSQL LISTEN/NOTIFY
├─ Create notification service
├─ Reduce polling overhead
├─ Add connection metrics
└─ Load testing (100+ concurrent streams)

Week 5-7: Production Hardening
├─ Token refresh mid-stream
├─ Session recovery after disconnect
├─ Error recovery and retry logic
├─ Log retention policies
├─ Graceful shutdown procedures
└─ Documentation and examples

Week 7-8: Optional Advanced Features
├─ Message queue integration (Kafka)
├─ Log archival (S3 integration)
├─ Advanced filtering (server-side)
├─ Performance optimization
└─ Monitoring dashboard
```

### Quick Win Path (2 weeks)

If timeline is tight, implement minimum viable product:

**Backend (1 week):**
1. Copy LLMProxyController pattern
2. Create `/ws/automations/{id}/logs` SSE endpoint
3. Add heartbeat (30s comments)
4. Basic error handling

**CLI (1 week):**
1. Add `--follow` flag to `automations logs`
2. Implement `EventSource` listener
3. Stream output line-by-line
4. Add graceful Ctrl+C

**Result:** Working real-time logs for automations, MVP quality

---

## Part 6: Risk Assessment

### High Risk Areas

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Long-lived connections exhausting memory | Crashes | Implement backpressure + buffer limits |
| Token expiration during stream | Users stuck | Implement refresh before expiry |
| Connection pooling exhaustion | Cascading failures | Monitor + connection limits + health checks |
| Large log volume overwhelming clients | Slow/unresponsive CLI | Implement throttling + sampling |
| PostgreSQL connection limit exceeded | Streaming fails completely | Use LISTEN connection pool |

### Medium Risk Areas

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Network instability (mobile users) | Frequent reconnects | Exponential backoff + session recovery |
| Malformed log messages | Crash parser | Validate before sending, skip bad messages |
| Firewall/proxy blocking WebSocket | Works nowhere | Use SSE as fallback |
| Clock skew in timestamps | Confusing order | Use server-provided sequence numbers |
| High-frequency log volume | Latency spikes | Batch + compress + sample |

---

## Part 7: Recommended Phased Approach

### Phase 1: MVP Backend (Week 1-2) - RECOMMENDED STARTING POINT
- [ ] Create SSE streaming endpoint for automation logs only
- [ ] Use Akka Streams with polling database
- [ ] Add heartbeat mechanism
- [ ] Test with manual curl requests
- **Deliverable**: `/api/automations/{id}/logs?stream=true` endpoint

### Phase 2: CLI Streaming (Week 2-3)
- [ ] Implement `automations logs --follow` using EventSource
- [ ] Add graceful shutdown
- [ ] Color-code log levels
- **Deliverable**: Working real-time log streaming for automations

### Phase 3: Backend Enhancement (Week 3-4) - IF NEEDED
- [ ] Migrate from polling to PostgreSQL LISTEN/NOTIFY
- [ ] Add connection metrics
- [ ] Implement token refresh for long streams
- **Deliverable**: Production-grade efficiency & reliability

### Phase 4: Feature Completeness (Week 4-5)
- [ ] Implement `pipelines logs --follow`
- [ ] Add `--filter`, `--level`, `--since` flags
- [ ] Implement session recovery after disconnect
- **Deliverable**: Feature parity across all log types

### Phase 5: Production Hardening (Week 5+) - FOR HIGH-VOLUME DEPLOYMENTS
- [ ] Add message queue (if >1000 concurrent streams expected)
- [ ] Implement log archival and retention
- [ ] Add monitoring and alerting
- **Deliverable**: Enterprise-grade real-time logging system

---

## Conclusion

**Current State**: Both projects support polling-based log retrieval with no real-time capabilities.

**Quick Win**: Implement SSE-based streaming in backend + CLI follow mode (2 weeks) gets 80% of value.

**Recommended Next Step**: Start with Phase 1 (MVP Backend) focusing on automations logs as proof-of-concept.

**Architecture**: SSE is the right choice for logs (simpler than WebSocket, proven pattern in codebase, sufficient for read-only use case).

**Backend Effort**: Low-to-Medium (SSE endpoint following existing LLMProxyController pattern)

**CLI Effort**: Low-to-Medium (EventSource client, line-by-line output, graceful shutdown)

---

## Appendix: Example Implementation Sketches

### Backend SSE Endpoint (Scala/Play)

```scala
// StreamingController.scala
def getAutomationLogsStream(automationId: String) = Action.async { implicit request =>
  val source = Source
    .tick(Duration.Zero, 1.second, ())
    .flatMapConcat(_ => {
      Source.fromFuture(
        automationService.getCurrentAutomationLogs(automationId)
      )
    })
    .map(logs => s"data: ${Json.stringify(Json.toJson(logs))}\n\n")
    .keepAlive(30.seconds, () => ": keepalive\n")

  Ok.chunked(source)
    .as("text/event-stream")
    .withHeaders(
      "Cache-Control" -> "no-cache",
      "Connection" -> "keep-alive"
    )
}
```

### CLI Streaming Client (TypeScript)

```typescript
// src/utils/log-streamer.ts
import { EventEmitter } from 'events';
import EventSource from 'eventsource';

export class LogStreamer extends EventEmitter {
  private eventSource?: EventSource;

  async connect(url: string, token: string): Promise<void> {
    this.eventSource = new EventSource(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    this.eventSource.onmessage = (event) => {
      const logs = JSON.parse(event.data);
      this.emit('logs', logs);
    };

    this.eventSource.onerror = () => {
      this.emit('error', 'Connection lost');
      this.reconnect(url, token);
    };
  }

  private async reconnect(url: string, token: string): Promise<void> {
    // Exponential backoff: 1s, 2s, 4s, 8s, ... 30s max
    await new Promise(r => setTimeout(r, this.backoffDelay));
    this.connect(url, token);
  }

  disconnect(): void {
    this.eventSource?.close();
    this.emit('disconnect');
  }
}
```

### CLI Command Usage

```bash
# Follow logs in real-time
databasin automations logs auto-456 --follow

# Follow with filtering
databasin automations logs auto-456 --follow --filter "ERROR"

# Follow specific run's logs (current run if not specified)
databasin automations logs auto-456 --follow --run-id run-123

# Load initial logs then follow new ones
databasin automations logs auto-456 --follow --initial-lines 50
```

