# Judge Demo (4–5 minutes)
**0:00–0:30 — Problem & Real Authentication:** Requests, stock, urgency and transport capacity can be fragmented. Log in using authentic seed credentials (`tariq.mansoor@responso.pk` / `Password123!`). Demonstrate real JWT auth flow, role permissions, and sign-out session clearing.

**0:30–1:10 — Dashboard:** Show open/critical requests, stock, unmet demand, active deliveries, and online/offline sync status badge.

**1:10–2:00 — Request & Multi-Warehouse Inventory:** Open an urgent water and food request. Highlight multiple warehouse stockpiles (Sukkur Hub, Hyderabad Depot, Karachi Base), their weight capacities (`capacity_kg`), and available delivery truck fleets (`available_delivery_trucks`).

**2:00–3:00 — Allocation & Constraints:** Run optimizer; show priority scoring breakdown, straight-line distance, recommended quantities, unmet demand, and constraint explanations (weight limit and truck fleet availability).

**3:00–3:45 — Approval & Multi-Warehouse Delivery:** Approve draft. Show that separate deliveries are generated per source warehouse matching supply origin. Dispatch convoy. Show delivery status updates, stock deduction strictly from the supplying depot upon `DELIVERED`, or report blocked convoy (`FAILED`) which safely releases reservations back to stock and restores request demand.

**3:45–4:30 — Offline Resilience & Idempotency:** Simulate offline network cutoff. Enqueue a request or status update. Show the sync queue modal with unique `Idempotency-Key` tracking, retry/dismiss controls, and automatic server deduplication upon reconnection.

**4:30–5:00 — Governance & Close:** Review audit log and RBAC permissions. Summarize workflow and state limitations: simulated data, straight-line distance approximations; real deployment needs agency validation, verified road networks, security and operational review.

Rehearse with seeded data (`Password123!`). Do not claim verified road routes, official warnings, lives saved or measured real-world impact without evidence.
