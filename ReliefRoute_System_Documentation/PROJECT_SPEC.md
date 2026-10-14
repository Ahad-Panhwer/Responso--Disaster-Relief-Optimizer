# Project Specification
## Objective
Centralize simulated relief requests, stock, allocation recommendations, approvals, and delivery tracking to help coordinators make transparent decisions.

## Roles
- **Admin:** users, roles, settings, audit.
- **Coordinator:** requests, allocation runs, approval/rejection, monitoring.
- **Warehouse manager:** inventory and stock movements.
- **Field operator:** assigned deliveries and permitted status changes.
For a 2-person team, roles may be simplified, but permissions must still be enforced on the backend.

## Functional requirements
- **FR-01 Authentication:** sign in/out; hashed passwords; protected APIs reject invalid tokens.
- **FR-02 Authorization:** role checks on every protected endpoint.
- **FR-03 Requests:** create/update/list/detail/close requests with location, urgency, affected population, required items/quantities, status, creator and timestamps.
- **FR-04 Locations:** names and optional coordinates; simulated status clearly labelled.
- **FR-05 Inventory:** stock by warehouse and item; movement history; no negative available stock.
- **FR-06 Capacity:** document a simple, consistent vehicle/dispatch capacity model.
- **FR-07 Priority:** score from urgency, affected population and waiting time; show score factors.
- **FR-08 Allocation:** recommend quantities by request/warehouse/item respecting demand, stock and capacity; show unmet demand and explanation.
- **FR-09 Review:** recommendations are drafts; coordinator approves/rejects.
- **FR-10 Deliveries:** track pending → prepared → in_transit → delivered; failed state requires reason; reject invalid transitions.
- **FR-11 Dashboard:** API-backed request, stock, unmet-demand and delivery metrics.
- **FR-12 Re-run:** changed requests/stock/capacity can trigger a new run; record run time and algorithm version.
- **FR-13 Audit:** record stock adjustments, allocation runs, approvals, rejections, delivery changes and user changes.
- **FR-14 Demo data:** repeatable fictional seed and local-only reset process.
- **FR-15 UX states:** loading, empty, validation, permission, server-error and success states.

## Non-functional requirements
Usable without training; keyboard accessible; responsive; server-side validation; reliable persistence; explainable decisions; maintainable modular code; useful logs; privacy-minimizing fictional data; repeatable clean setup.

## Out of scope
Official emergency integrations, verified flood forecasting, production road routing, autonomous dispatch, complex multi-vehicle optimization, real-world impact claims, and production-grade high availability.

## Acceptance criteria
1. Auth and backend roles work.
2. Request can contain multiple item types.
3. Invalid/negative quantities are rejected.
4. Stock cannot go negative.
5. Allocation never exceeds demand, stock or capacity.
6. Distance affects warehouse selection as documented.
7. Unmet demand is visible.
8. Approval re-checks stock and is transactional.
9. Delivery state transitions are validated.
10. Dashboard reflects persisted API data.
11. Data survives backend restart.
12. Tests cover allocation, auth, validation and transitions.
13. README setup works from a clean checkout.
14. Simulated data and limitations are clearly disclosed.
