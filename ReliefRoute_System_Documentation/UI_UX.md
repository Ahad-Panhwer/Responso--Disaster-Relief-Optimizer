# UI/UX Specification
## Style
Professional operations interface with a restrained handmade doodle identity. Avoid generic gradients and clutter. Black/white is the base; selective accents: red=critical, orange=high, blue=logistics, green=delivered. Always pair color with text/icon.

## Visual identity
Readable sans-serif for operational text; handwritten type only for brand/decorative headings. Use consistent hand-drawn line-art of relief boxes, water bottles, trucks, shelters, pins and volunteers. Doodles must not obscure forms, data, or map information.

## Screens
1. **Sign in:** labelled fields, visibility toggle, clear errors; demo credentials only in demo mode.
2. **Dashboard:** open/critical requests, stock, unmet demand, deliveries in transit, recent activity, map/list, Run Allocation action.
3. **Requests:** search/filter, create/edit, detail with requested/allocated/unmet amounts.
4. **Inventory:** warehouse selector, available/reserved quantities, stock adjustment with reason, movement history.
5. **Allocation review:** timestamp/version, score factors, distance estimate, quantities, capacity, unmet demand, explanation, approve/reject and stale-run warning.
6. **Deliveries:** status list, destination, warehouse, items, operator, valid next action.
7. **Admin/audit:** user roles, active state, audit history.

## Required states
Every data screen needs loading, empty, success, validation error, permission denied and server error states. Disable duplicate submissions. Never fake success on API failure.

## Accessibility
Keyboard operation, visible focus, associated labels/errors, sufficient contrast, no color-only statuses, responsive mobile layout, list/table alternative to map, reduced-motion support.

## Canva/design prompt
“Create a restrained black-and-white hand-drawn doodle illustration for a disaster-relief coordination platform: line-art boxes, water bottles, a small relief truck, location pins and volunteers helping a community. White background, near-black sketch lines, tiny orange/blue/green accents, consistent stroke weight, friendly and respectful, no disaster spectacle, no text/logo, no gradients, ample negative space, suitable for a professional software dashboard.”
