# Architecture — AI Task Processing Platform

This document describes how the system is designed for reliability, scale, and safe deployment. It complements the application and infrastructure READMEs.

## 1. High-level design

The platform follows a classic **API + queue + worker** pattern:

- **React frontend** talks only to the **Express API** over HTTPS (JWT in `Authorization`).
- The **API** owns authentication, validation, and persistence in **MongoDB**. When a user creates a task, the API writes a `pending` document and **LPUSH**es a JSON job onto a **Redis list** (`task_queue`).
- **Python workers** block on **BRPOP** on the same list. **BRPOP** is atomic: with multiple replicas, each job is delivered to exactly one worker. Workers update MongoDB: `running` → `success` or `failed`, append **logs**, and store **result** or **error**.

MongoDB is the source of truth for task state; Redis is a transient work queue only.

## 2. Worker scaling strategy

Workers are **stateless** with respect to the queue: they only need Redis and MongoDB credentials. You can run **N identical replicas** (Docker Compose scale, Kubernetes `Deployment` replicas, or HPA).

- **Horizontal scaling**: Increase `replicas` or attach a **HorizontalPodAutoscaler** (HPA) on CPU/memory. Additional workers increase dequeue parallelism linearly until Redis or MongoDB becomes the bottleneck.
- **Kubernetes**: This repo’s manifests include an HPA on the worker `Deployment` (min/max replicas, CPU and memory targets). **Metrics Server** must be installed on the cluster for HPA to function.
- **Probes**: Workers expose no HTTP server; **exec probes** run a short Python snippet that **PING**s Redis. If Redis is unreachable, the pod is marked not ready / restarted depending on probe configuration—avoiding “running” pods that cannot dequeue work.

Fairness: Redis list + `BRPOP` gives **FIFO** behavior when the API uses **LPUSH** (producer pushes to one end, consumer pops from the other).

## 3. High task volume (e.g. ~100k tasks/day)

**Order-of-magnitude capacity**

- 100,000 tasks/day ≈ **1.2 tasks/second** average. Bursts can be higher; design for **peak** (e.g. 5–10× average) with queue depth and worker count.
- If each task takes ~100ms of worker CPU, one core can finish on the order of **10 tasks/second** for CPU-bound string operations—well above average load for this workload.

**Bottlenecks (in typical order)**

1. **Redis** — enqueue/dequeue rate and connection counts. Mitigation: connection pooling, Redis in clustered/sentinel mode for HA, larger `Deployment` for redis if using single instance.
2. **MongoDB** — writes per completed task (status transitions, logs). Mitigation: indexes (see below), appropriate **write concern**, and scaling MongoDB (replica set, sharding) when justified.
3. **API** — mostly lightweight writes + one Redis `LPUSH` per task. The API is stateless and can be replicated behind a load balancer.

**Back-pressure**

Under extreme load, the **Redis list grows**. Tasks remain `pending` in MongoDB until a worker picks them up—this is explicit **queueing** rather than dropping requests. You can add **max queue length** checks in the API and return `503` or `429` if you need to protect Redis (not implemented in the sample app but a natural extension).

## 4. Database indexing strategy

Queries are dominated by:

- Listing tasks for a user (filter by `userId`, sort by `createdAt`).
- Filtering by `status` for dashboards.

The **Task** schema defines compound indexes:

- `{ userId: 1, createdAt: -1 }` — fast “my tasks, newest first”.
- `{ status: 1 }` — optional global or admin-style status scans.
- `{ userId: 1, status: 1 }` — combined filter for per-user status views.

**User** collection uses `{ email: 1 }` for login lookup (unique email already enforced at schema level).

For very large collections, consider **TTL** or archival jobs for old tasks; not required for the assignment baseline.

## 5. Handling Redis failure

| Scenario | Behavior |
|----------|-----------|
| Redis down at **enqueue** | `LPUSH` fails; API should return `500` (today: unhandled error path—operational fix is retries/circuit breaker). |
| Redis down for **workers** | `BRPOP` / `PING` fails; probes mark pods not ready; workers retry with backoff (worker loop). |
| Redis **data loss** | Jobs in the list can be lost; MongoDB may still show `pending`. Recovery options: **reconciliation job** that finds stale `pending` tasks older than T minutes and re-enqueues; or operator alert + manual replay. |

**Production direction**: Redis **Sentinel** or **Cluster**, persistence (AOF/RDB) for the queue host, and **idempotent** re-enqueue keyed by `taskId` to avoid double processing (workers should treat “already terminal state” as no-op if re-run).

## 6. Staging vs production environments

Recommended pattern with **GitOps (Argo CD)**:

- **Separate namespaces** — e.g. `ai-task-processor-staging` and `ai-task-processor-prod`, or separate clusters for stronger isolation.
- **Separate Argo CD Applications** — same infra repo, different `path` (e.g. `k8s/overlays/staging` vs `k8s/overlays/prod`) or different `targetRevision` / branch (`develop` vs `main`).
- **Separate secrets** — one Kubernetes `Secret` (or ExternalSecrets target) per environment; never share JWT or DB credentials across stages.
- **Image tags** — staging tracks `develop` builds (SHA or `develop` tag); production tracks **immutable SHAs** from `main` (this repo’s CI updates `kustomization.yaml` `newTag` on `main`).
- **ConfigMaps** — different `FRONTEND_URL`, `MONGODB_URI`, Redis hosts, and **frontend build-time** `REACT_APP_API_URL` per environment (CI `vars.REACT_APP_API_URL` for production builds).

**Kustomize overlays** are the usual way to keep base manifests DRY while varying replica counts, resource limits, and ingress hostnames per environment.

## 7. Security and secrets (repository hygiene)

- **JWT**: Required at API startup (`JWT_SECRET`). No fallback secret in code.
- **Kubernetes**: The default `Secret` manifest is **not** applied from Git; operators create `ai-task-processor-secret` with `kubectl` or a secret manager. A **template** file (`k8s/secret.example.yaml`) documents shape only—replace placeholders locally; do not commit real values.
- **CI/CD**: Registry credentials and a **PAT** with push access to the infra repo live in GitHub **Actions secrets**, not in YAML.

## 8. CI/CD and image promotion

1. **Lint** runs first; **build/push** jobs depend on lint passing.
2. Images are built with **multi-stage** Dockerfiles and pushed as `:sha` and `:latest`.
3. On **`main`**, a job checks out the **infra** repository using a **deploy token**, updates **`k8s/kustomization.yaml`** image `newName` / `newTag`, and commits. **Argo CD** auto-sync applies the new SHAs.

Frontend note: Create React App **bakes** `REACT_APP_*` at **image build** time; production API base URL must be supplied via **Docker build-arg** in CI (`vars.REACT_APP_API_URL`).

---

*Length: concise architecture reference (~2–4 pages when rendered). Extend with sequence diagrams or SLOs as needed for your submission.*
