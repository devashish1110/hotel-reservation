import {
  MAX_ROOMS_PER_BOOKING,
  accessTime,
  createRooms,
  roomNumber,
  travelTime,
} from "./hotel";

export const REASON_INSUFFICIENT = "INSUFFICIENT";
export const MIN_ROOMS_PER_BOOKING = 1;
export const DEFAULT_OCCUPANCY_RATE = 0.4;

export function validateRoomCount(k) {
  if (typeof k !== "number" || Number.isNaN(k)) {
    return { ok: false, error: "Room count must be a number." };
  }
  if (!Number.isInteger(k)) {
    return { ok: false, error: "Room count must be a whole number." };
  }
  if (k < MIN_ROOMS_PER_BOOKING) {
    return {
      ok: false,
      error: `Room count must be at least ${MIN_ROOMS_PER_BOOKING}.`,
    };
  }
  if (k > MAX_ROOMS_PER_BOOKING) {
    return {
      ok: false,
      error: `Room count must be at most ${MAX_ROOMS_PER_BOOKING}.`,
    };
  }
  return { ok: true };
}

// The guest's worst walk inside the booking: the slowest of all room-to-room trips.
export function bookingCost(selected) {
  let worst = 0;
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const time = travelTime(selected[i], selected[j]);
      if (time > worst) worst = time;
    }
  }
  return worst;
}

// How quickly the booking can be reached from the entrance at all: its nearest room.
export function bookingAccess(selected) {
  return selected.reduce(
    (best, room) => Math.min(best, accessTime(room)),
    Infinity
  );
}

function sortedRoomNumbers(selected) {
  return selected.map(roomNumber).sort((a, b) => a - b);
}

// Lexicographic order over the ascending room numbers: a deterministic last resort
// so two equally good bookings never rank as equal.
function compareRoomNumbers(a, b) {
  const left = sortedRoomNumbers(a);
  const right = sortedRoomNumbers(b);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}

export function compareCandidates(a, b) {
  const byCost = bookingCost(a) - bookingCost(b);
  if (byCost !== 0) return byCost;

  const byAccess = bookingAccess(a) - bookingAccess(b);
  if (byAccess !== 0) return byAccess;

  return compareRoomNumbers(a, b);
}

function freeRoomsByFloor(rooms) {
  const byFloor = new Map();
  for (const room of rooms) {
    if (room.isOccupied) continue;
    if (!byFloor.has(room.floor)) byFloor.set(room.floor, []);
    byFloor.get(room.floor).push(room);
  }
  for (const onFloor of byFloor.values()) {
    onFloor.sort((a, b) => a.position - b.position);
  }
  return byFloor;
}

// On a single floor the cost is just the span between the outermost chosen rooms.
// Take any k-subset of the free list and compare it with the consecutive window that
// starts at the same first room: the window's t-th room is never further right than
// the subset's t-th room, so its span is no larger, its first room (and therefore its
// access time) is identical, and its room numbers are lexicographically no larger.
// Windows dominate every other subset on all three criteria, so nothing else can win.
function sameFloorCandidates(byFloor, k) {
  const candidates = [];
  for (const onFloor of byFloor.values()) {
    for (let start = 0; start + k <= onFloor.length; start++) {
      candidates.push(onFloor.slice(start, start + k));
    }
  }
  return candidates;
}

// Every split of k across the floors, taking each floor's leftmost free rooms.
//
// Leftmost is lossless, not just a heuristic. Once two or more floors are involved the
// costliest trip is always a cross-floor one: if a floor's rightmost chosen room sits
// at position r, every same-floor span on it is at most r - 1, while pairing that room
// with any room on another floor costs at least r + 1 + VERTICAL_MINUTES_PER_FLOOR
// (= r + 3) -- strictly more. So the booking's cost collapses to
//   max over floor pairs of (r_i + r_j + VERTICAL_MINUTES_PER_FLOOR * |f_i - f_j|),
// which depends only on each floor's rightmost chosen room. Taking a floor's leftmost
// free rooms minimises that r, and simultaneously yields the floor's smallest position
// (lowest access time) and its smallest room numbers -- so for a given split it wins
// on cost first and on both tiebreaks after. Only the split itself needs enumerating.
function crossFloorCandidates(byFloor, k) {
  const floors = [...byFloor.keys()].sort((a, b) => a - b);
  const candidates = [];

  function walk(index, remaining, picked) {
    if (remaining === 0) {
      candidates.push(picked);
      return;
    }
    if (index === floors.length) return;

    const onFloor = byFloor.get(floors[index]);
    const most = Math.min(onFloor.length, remaining);
    for (let count = 0; count <= most; count++) {
      walk(index + 1, remaining - count, [
        ...picked,
        ...onFloor.slice(0, count),
      ]);
    }
  }

  walk(0, k, []);
  return candidates;
}

function floorKey(selected) {
  return [...new Set(selected.map((room) => room.floor))]
    .sort((a, b) => a - b)
    .join("-");
}

// The winner, plus the best candidate that would have put the guest on a
// different set of floors. A near-miss on the winner's own floors explains
// nothing useful, so the rival has to be a genuinely different placement.
function bestAndRival(candidates) {
  let best = null;
  for (const candidate of candidates) {
    if (best === null || compareCandidates(candidate, best) < 0) {
      best = candidate;
    }
  }

  const winningFloors = floorKey(best);
  let rival = null;
  for (const candidate of candidates) {
    if (floorKey(candidate) === winningFloors) continue;
    if (rival === null || compareCandidates(candidate, rival) < 0) {
      rival = candidate;
    }
  }

  return [best, rival];
}

function sortedRooms(selected) {
  return [...selected].sort(
    (a, b) => a.floor - b.floor || a.position - b.position
  );
}

function candidateSummary(selected) {
  if (!selected) return null;

  const rooms = sortedRooms(selected);
  return {
    roomNumbers: rooms.map(roomNumber),
    travelTime: bookingCost(rooms),
    access: bookingAccess(rooms),
    floors: [...new Set(rooms.map((room) => room.floor))],
  };
}

function bookingResult(selected, runnerUp) {
  const rooms = sortedRooms(selected).map((room) => ({ ...room }));

  return {
    ok: true,
    rooms,
    roomNumbers: rooms.map(roomNumber),
    travelTime: bookingCost(rooms),
    floors: [...new Set(rooms.map((room) => room.floor))],
    runnerUp: candidateSummary(runnerUp),
  };
}

export function findBestBooking(rooms, k) {
  const validation = validateRoomCount(k);
  if (!validation.ok) return { ok: false, error: validation.error };

  const byFloor = freeRoomsByFloor(rooms);
  const available = [...byFloor.values()].reduce(
    (total, onFloor) => total + onFloor.length,
    0
  );
  if (available < k) {
    return {
      ok: false,
      reason: REASON_INSUFFICIENT,
      available,
      error: `Only ${available} room(s) available, but ${k} were requested.`,
    };
  }

  // Same-floor bookings win outright: a cross-floor option is never offered while
  // one floor can hold the whole booking, however short its walk would look.
  const sameFloor = sameFloorCandidates(byFloor, k);
  if (sameFloor.length > 0) return bookingResult(...bestAndRival(sameFloor));

  return bookingResult(...bestAndRival(crossFloorCandidates(byFloor, k)));
}

export function applyBooking(rooms, selected) {
  const booked = new Set(selected.map(roomNumber));
  return rooms.map((room) => ({
    ...room,
    isOccupied: room.isOccupied || booked.has(roomNumber(room)),
  }));
}

export function generateRandomOccupancy(
  rate = DEFAULT_OCCUPANCY_RATE,
  random = Math.random
) {
  return createRooms().map((room) => ({
    ...room,
    isOccupied: random() < rate,
  }));
}
