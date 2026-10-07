import { describe, it, expect } from "vitest";
import { MAX_ROOMS_PER_BOOKING, createRooms, roomNumber } from "./hotel";
import {
  applyBooking,
  bookingAccess,
  compareCandidates,
  findBestBooking,
  generateRandomOccupancy,
  validateRoomCount,
} from "./booking";

// Every room in the hotel is occupied except the ones listed.
function makeHotel(freeRoomNumbers) {
  const free = new Set(freeRoomNumbers);
  return createRooms().map(room => ({
    ...room,
    isOccupied: !free.has(roomNumber(room)),
  }));
}

describe("validateRoomCount", () => {
  it.each([0, 6, -1, 2.5, NaN, "abc"])("rejects %s", value => {
    const result = validateRoomCount(value);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it.each([1, 5])("accepts %s", value => {
    expect(validateRoomCount(value)).toEqual({ ok: true });
  });
});

describe("findBestBooking on an empty hotel", () => {
  it("gives the room next to the lift for k=1", () => {
    const result = findBestBooking(createRooms(), 1);
    expect(result.ok).toBe(true);
    expect(result.roomNumbers).toEqual([101]);
  });

  it("gives the first five rooms of floor 1 for k=5", () => {
    const result = findBestBooking(createRooms(), 5);
    expect(result.roomNumbers).toEqual([101, 102, 103, 104, 105]);
    expect(result.travelTime).toBe(4);
  });
});

describe("findBestBooking same-floor phase", () => {
  it("matches the PDF example", () => {
    const rooms = makeHotel([
      101, 102, 105, 106, 201, 202, 203, 210, 301, 302,
    ]);
    const result = findBestBooking(rooms, 4);
    expect(result.roomNumbers).toEqual([101, 102, 105, 106]);
    expect(result.travelTime).toBe(5);
  });

  it("prefers one floor even when its walk is long", () => {
    const rooms = makeHotel([101, 102, 201, 202, 203, 210, 301, 302]);
    const result = findBestBooking(rooms, 4);
    expect(result.roomNumbers).toEqual([201, 202, 203, 210]);
    expect(result.travelTime).toBe(9);
  });

  it("slides the window to the tightest run of free rooms", () => {
    const rooms = makeHotel([301, 303, 304, 307, 308, 309]);
    const result = findBestBooking(rooms, 3);
    expect(result.roomNumbers).toEqual([307, 308, 309]);
    expect(result.travelTime).toBe(2);
  });

  it("takes a smaller travel time over a lower floor", () => {
    const rooms = makeHotel([301, 305, 306, 307, 601, 602, 603, 604]);
    const result = findBestBooking(rooms, 4);
    expect(result.roomNumbers).toEqual([601, 602, 603, 604]);
    expect(result.travelTime).toBe(3);
  });

  it("breaks a travel-time tie on access time", () => {
    const rooms = makeHotel([507, 508, 509, 510, 601, 602, 603, 604]);
    const result = findBestBooking(rooms, 4);
    expect(result.roomNumbers).toEqual([601, 602, 603, 604]);
  });

  it("breaks a tie on access time too with the lower floor", () => {
    const rooms = makeHotel([307, 308, 309, 310, 601, 602, 603, 604]);
    const result = findBestBooking(rooms, 4);
    expect(result.roomNumbers).toEqual([307, 308, 309, 310]);
  });

  it("applies the whole rule chain", () => {
    const rooms = makeHotel([
      101, 102, 201, 210, 401, 405, 409, 506, 507, 508, 603, 604, 605, 701,
      702, 703,
    ]);
    const result = findBestBooking(rooms, 3);
    expect(result.roomNumbers).toEqual([603, 604, 605]);
  });
});

describe("findBestBooking cross-floor phase", () => {
  it("spreads across floors when no floor can hold the booking", () => {
    const rooms = makeHotel([109, 110, 201, 301, 302]);
    const result = findBestBooking(rooms, 3);
    expect(result.roomNumbers).toEqual([201, 301, 302]);
    expect(result.travelTime).toBe(5);
    expect(result.floors).toEqual([2, 3]);
  });

  it("uses one room per floor when that is all there is", () => {
    const rooms = makeHotel([101, 201, 301, 401, 501]);
    const result = findBestBooking(rooms, 5);
    expect(result.roomNumbers).toEqual([101, 201, 301, 401, 501]);
    expect(result.travelTime).toBe(10);
  });
});

describe("findBestBooking when there is not enough room", () => {
  it("reports how many rooms are left", () => {
    const result = findBestBooking(makeHotel([101, 102]), 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT");
    expect(result.available).toBe(2);
    expect(result.error).toBeTruthy();
  });

  it("reports zero on a full hotel", () => {
    const result = findBestBooking(makeHotel([]), 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT");
    expect(result.available).toBe(0);
  });
});

describe("applyBooking", () => {
  it("does not mutate the rooms it is given", () => {
    const rooms = createRooms();
    const before = JSON.parse(JSON.stringify(rooms));
    const { rooms: selected } = findBestBooking(rooms, 3);

    const updated = applyBooking(rooms, selected);

    expect(rooms).toEqual(before);
    expect(updated).not.toBe(rooms);
    expect(updated.filter(room => room.isOccupied).map(roomNumber)).toEqual([
      101, 102, 103,
    ]);
  });
});

describe("generateRandomOccupancy", () => {
  it("fills the hotel when the random source is below the rate", () => {
    const rooms = generateRandomOccupancy(0.4, () => 0);
    expect(rooms).toHaveLength(97);
    expect(rooms.every(room => room.isOccupied)).toBe(true);
  });

  it("empties the hotel when the random source is above the rate", () => {
    const rooms = generateRandomOccupancy(0.4, () => 0.99);
    expect(rooms.every(room => !room.isOccupied)).toBe(true);
  });
});

describe("determinism", () => {
  it("returns the same booking for the same hotel twice", () => {
    const freeRooms = [101, 102, 105, 106, 201, 202, 203, 210, 301, 302];
    const first = findBestBooking(makeHotel(freeRooms), 4);
    const second = findBestBooking(makeHotel(freeRooms), 4);
    expect(first).toEqual(second);
  });
});

// --- brute-force cross-check -------------------------------------------------

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function combinations(items, k) {
  const result = [];
  const picked = [];
  function walk(start) {
    if (picked.length === k) {
      result.push([...picked]);
      return;
    }
    for (let i = start; i <= items.length - (k - picked.length); i++) {
      picked.push(items[i]);
      walk(i + 1);
      picked.pop();
    }
  }
  walk(0);
  return result;
}

// Exhaustive reference implementation: no sliding window, no leftmost shortcut.
// Returns the winning room numbers, or null when the hotel cannot fit k rooms.
function bruteForceBest(rooms, k) {
  const free = rooms.filter(room => !room.isOccupied);
  if (free.length < k) return null;

  const byFloor = new Map();
  for (const room of free) {
    if (!byFloor.has(room.floor)) byFloor.set(room.floor, []);
    byFloor.get(room.floor).push(room);
  }

  const roomyFloors = [...byFloor.values()].filter(onFloor => onFloor.length >= k);
  const candidates =
    roomyFloors.length > 0
      ? roomyFloors.flatMap(onFloor => combinations(onFloor, k))
      : combinations(free, k);

  const best = candidates.reduce((winner, candidate) =>
    compareCandidates(candidate, winner) < 0 ? candidate : winner
  );
  return best.map(roomNumber).sort((a, b) => a - b);
}

describe("findBestBooking against brute force", () => {
  it("picks the same rooms as an exhaustive search on 300 busy hotels", () => {
    const HOTEL_COUNT = 300;
    const RATES = [0.85, 0.86, 0.87, 0.88, 0.89, 0.9, 0.91, 0.92];

    for (let seed = 1; seed <= HOTEL_COUNT; seed++) {
      const rooms = generateRandomOccupancy(
        RATES[seed % RATES.length],
        mulberry32(seed)
      );
      const freeNumbers = rooms
        .filter(room => !room.isOccupied)
        .map(roomNumber);

      for (let k = 1; k <= MAX_ROOMS_PER_BOOKING; k++) {
        const expected = bruteForceBest(rooms, k);
        const result = findBestBooking(rooms, k);
        const hotel = `seed ${seed}, k=${k}, free [${freeNumbers.join(", ")}]`;

        if (expected === null) {
          expect(result.ok, hotel).toBe(false);
          continue;
        }

        expect(result.ok, hotel).toBe(true);
        expect(result.roomNumbers, hotel).toEqual(expected);
      }
    }
  });
});

describe("findBestBooking runnerUp", () => {
  // Mirrors compareCandidates, but over the summary shape runnerUp uses.
  function rank(a, b) {
    if (a.travelTime !== b.travelTime) return a.travelTime - b.travelTime;
    if (a.access !== b.access) return a.access - b.access;
    for (let i = 0; i < a.roomNumbers.length; i++) {
      if (a.roomNumbers[i] !== b.roomNumbers[i]) {
        return a.roomNumbers[i] - b.roomNumbers[i];
      }
    }
    return 0;
  }

  it("reports the best alternative placement, which ranks below the winner", () => {
    const result = findBestBooking(createRooms(), 4);
    const winner = {
      roomNumbers: result.roomNumbers,
      travelTime: result.travelTime,
      access: bookingAccess(result.rooms),
    };

    expect(result.runnerUp).not.toBeNull();
    expect(rank(result.runnerUp, winner)).toBeGreaterThan(0);
  });

  it("puts the runner-up on a different set of floors", () => {
    const result = findBestBooking(createRooms(), 4);

    expect(result.floors).toEqual([1]);
    expect(result.runnerUp.floors).not.toEqual(result.floors);
  });

  it("skips nearer misses that sit on the winning floors", () => {
    // 102-105 ranks second overall, but it explains nothing: the rival has to
    // be the best booking somewhere else, which is 201-204 on Floor 2.
    const result = findBestBooking(createRooms(), 4);

    expect(result.roomNumbers).toEqual([101, 102, 103, 104]);
    expect(result.runnerUp.roomNumbers).toEqual([201, 202, 203, 204]);
  });

  it("is null when every candidate sits on the winning floors", () => {
    const result = findBestBooking(makeHotel([101, 102]), 2);

    expect(result.ok).toBe(true);
    expect(result.roomNumbers).toEqual([101, 102]);
    expect(result.runnerUp).toBeNull();
  });
});
