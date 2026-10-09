# Hotel Room Reservation

A single-page app that books 1–5 rooms in a 97-room hotel and picks the group with the shortest walk between them. The booking rules live in a dependency-free domain layer; the UI is a cinema-seat-map style plan of the building.

Live: https://devashish1110.github.io/hotel-reservation/

## Running it

```bash
npm install
npm run dev
```

```bash
npm test
npm run lint
npm run build
```

`npm test` runs the Vitest suite once and exits.

## The hotel

Ten floors. Floors 1–9 have 10 rooms each, numbered `101`–`110`, `201`–`210` and so on. Floor 10 has 7, numbered `1001`–`1007`. There is one lift and staircase, at the left-hand end of every corridor. Position 1 is the room next to it.

## How rooms are chosen

1. **Same floor first.** If any floor has enough free rooms, the booking is made on a floor — never across floors — even when a cross-floor option would have a shorter walk.
2. **Shortest travel time wins**, measured between the two farthest rooms in the booking.
3. **Tie on travel time** goes to the booking whose nearest room is quickest to reach from the lift on floor 1.
4. **Tie on that too** goes to the lower room numbers, which in practice means the lower floor.

Rule 4 makes the ranking total, so the same hotel always produces the same booking.

## Travel time

Walking the corridor costs 1 minute per room. Riding the lift costs 2 minutes per floor. Room at position `p` is `p` minutes from the lift on its floor.

```
same floor        |p1 - p2|
different floors  p1 + p2 + 2 * |f1 - f2|
```

Across floors you pay for the whole journey: walk out to the lift, ride it, walk in at the other end.

**Example — 105 to 303:** walk 5 minutes to the lift, ride 2 floors for 4 minutes, walk 3 minutes to the door.

```
5 + 4 + 3 = 12 minutes
```

A booking's cost is the largest of these times over every pair of rooms in it.

## Algorithm

**Same-floor phase.** Free rooms on a floor are sorted by position and every window of `k` consecutive entries is considered — a sliding window, not every combination.

*Why that is enough:* on one floor the cost is just the span between the outermost rooms. Take any `k`-subset and compare it with the window starting at the same first room. The window's *t*-th room is never further right than the subset's *t*-th room, so its span is no larger, its first room — and therefore its access time — is identical, and its room numbers are lexicographically no larger. Windows dominate every other subset on all three ranking criteria.

**Cross-floor phase.** Only reached when no single floor can hold the booking. Every way of splitting `k` across the floors is enumerated by recursion, and each floor contributes its **leftmost** free rooms.

*Why leftmost is lossless:* once two or more floors are involved, the costliest trip is always a cross-floor one. If a floor's rightmost chosen room sits at position `r`, every same-floor span on that floor is at most `r - 1`, while pairing that room with any room on another floor costs at least `r + 1 + 2 = r + 3`. The booking's cost therefore collapses to

```
max over floor pairs of ( r_i + r_j + 2 * |f_i - f_j| )
```

which depends only on each floor's rightmost chosen room. Taking a floor's leftmost free rooms minimises that `r`, and at the same time gives the floor's smallest position (best access time) and its smallest room numbers — so for a given split it wins on cost first and on both tie-breaks after. Only the split itself needs enumerating.

**Verification.** `src/domain/booking.test.js` cross-checks the algorithm against an exhaustive reference implementation — no sliding window, no leftmost shortcut — over 300 seeded high-occupancy hotels and every `k` from 1 to 5. All 1,489 comparisons match, covering 828 same-floor cases, 661 cross-floor cases and 476,249 candidate sets.

## Complexity

| Phase | Work per booking |
| --- | --- |
| Same floor | `O(R)` over the hotel's `R` rooms — one grouping pass, then at most one window per free room |
| Cross floor | `C(k + 9, 9)` splits across 10 floors: 2,002 at `k = 5`, fewer below |
| Naive brute force | `C(97, 5) ≈ 64,000,000` combinations |

Both phases run in well under a millisecond, which is why the brute-force cross-check above is affordable as a test rather than as the implementation.

## Assumptions and decisions

| Ambiguity | Options | Choice | Why |
| --- | --- | --- | --- |
| The brief's second example books `201, 202` on floor 2 while free rooms remain on floor 1, which contradicts "same floor first" | Follow the example, or follow the stated rule | Follow the stated rule | The rule is stated as absolute and is testable; the example appears to predate it. With free rooms `101, 102, 201, 202, 203, 210` and `k = 4`, this app books `201, 202, 203, 210`. The app says so in its own "How rooms are chosen" panel rather than hiding the divergence |
| How far room 1 is from the lift | 0 minutes, or 1 minute | 1 minute | Position `p` costs `p` minutes uniformly, so a room's number alone gives its walk. A 0-minute first room would make floors 1 and 2 indistinguishable for single-room bookings |
| "Time between the first and last room" | The lowest- and highest-numbered rooms, or the farthest-apart pair | The farthest-apart pair | For same-floor bookings the two are identical. Across floors they are not, and the maximum over all pairs is the only reading that bounds the real worst-case walk |
| What breaks a travel-time tie | Leave it unspecified, or rank explicitly | Access time from the entrance, then room-number order | An unspecified tie-break makes results depend on enumeration order. The two-level rule makes the ranking total, so the app is deterministic and the result panel can state which rule decided |
| Invalid room counts (0, 6, −1, 2.5, text) | Clamp silently, or reject | Reject with a specific message | Silent clamping hides mistakes. `validateRoomCount` distinguishes not-a-number, not-whole, too-low and too-high, and the same function drives both the inline hint and the booking, so they cannot disagree |
| Fewer than `k` rooms left | Fail, or book what is available | Fail, then offer the smaller booking | Partially filling a request silently is worse than saying so. The result panel reports the exact count and offers a one-click "Book N instead", which disappears at zero |
| What "Random" does | Add occupancy on top, or replace it | Replace it | A fresh ~40% scenario is reproducible and keeps the demo honest; layering would drift towards a full hotel with every click |

## Project structure

```
src/
  domain/      booking rules - no React, no DOM
    hotel.js        hotel shape, room numbering, travel and access time
    booking.js      validation, ranking, findBestBooking, applyBooking
  state/       the bridge
    hotelReducer.js pure reducer: BOOK, RESET, RANDOMIZE
    useHotel.js     useReducer wrapper the UI consumes
  components/  presentation only
    App, Controls, BuildingGrid, RoomCell, Legend, BookingResult, HowItWorks
```

The booking rules are the part worth being sure about, so they are kept where they can be tested exhaustively: plain functions over plain data, no framework, never mutating their inputs. That is what makes the 300-hotel brute-force cross-check possible at all. The reducer owns transitions and the wording of results; components only render what they are handed. Moving this app to a different framework, or behind an HTTP API, would not touch `src/domain/`.

## What production would need

- **A backend API.** Occupancy currently lives in browser memory and disappears on refresh. `findBestBooking` would run server-side so every client ranks against the same state.
- **A database with transactional booking.** Two guests searching at once can be offered the same rooms. The read-then-write in `applyBooking` has to become one transaction that locks the candidate rows — `SELECT ... FOR UPDATE` or an equivalent — and re-checks availability before committing, so the second request fails cleanly instead of double-booking.
- **Authentication and authorisation**, so bookings belong to a guest and only staff can reset or randomise occupancy.
- **CI.** `npm test`, `npm run lint` and `npm run build` on every pull request, with the brute-force cross-check kept in the suite as a guard against regressions in the ranking rules.
- Beyond that: real room inventory and rates, cancellation and check-out returning rooms to the pool, an audit log of bookings, accessibility and browser testing, and monitoring.
