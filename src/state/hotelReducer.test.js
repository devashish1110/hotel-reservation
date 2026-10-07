import { describe, it, expect } from "vitest";
import { createRooms, roomNumber } from "../domain/hotel";
import {
  BOOK,
  RANDOMIZE,
  RESET,
  createInitialState,
  hotelReducer,
} from "./hotelReducer";

// A state whose hotel is fully occupied except for the listed room numbers.
function stateWithFreeRooms(freeRoomNumbers) {
  const free = new Set(freeRoomNumbers);
  return {
    rooms: createRooms().map(room => ({
      ...room,
      isOccupied: !free.has(roomNumber(room)),
    })),
    lastBooking: [],
    message: null,
  };
}

function occupiedNumbers(state) {
  return state.rooms.filter(room => room.isOccupied).map(roomNumber);
}

describe("hotelReducer BOOK", () => {
  it("books the best rooms and reports the result", () => {
    const next = hotelReducer(createInitialState(), { type: BOOK, count: 3 });

    expect(next.lastBooking).toEqual([101, 102, 103]);
    expect(occupiedNumbers(next)).toEqual([101, 102, 103]);
    expect(next.message).toMatchObject({
      kind: "success",
      roomNumbers: [101, 102, 103],
      floors: [1],
      travelTime: 2,
    });
    expect(next.message.text).toContain("Floor 1");
  });

  it("leaves the hotel alone and explains an invalid room count", () => {
    const before = createInitialState();
    const next = hotelReducer(before, { type: BOOK, count: 6 });

    expect(next.rooms).toBe(before.rooms);
    expect(next.lastBooking).toEqual([]);
    expect(next.message.kind).toBe("error");
    expect(next.message.text).toBeTruthy();
  });

  it("reports how many rooms are available when there are too few", () => {
    const before = stateWithFreeRooms([101, 102]);
    const next = hotelReducer(before, { type: BOOK, count: 4 });

    expect(next.rooms).toBe(before.rooms);
    expect(next.message.kind).toBe("insufficient");
    expect(next.message.available).toBe(2);
  });

  it("will not hand out a room that is already booked", () => {
    const first = hotelReducer(createInitialState(), { type: BOOK, count: 2 });
    const second = hotelReducer(first, { type: BOOK, count: 2 });

    expect(first.lastBooking).toEqual([101, 102]);
    expect(second.lastBooking).toEqual([103, 104]);
    expect(occupiedNumbers(second)).toEqual([101, 102, 103, 104]);
  });

  it("runs out of rooms once the hotel fills up", () => {
    const before = stateWithFreeRooms([101, 102]);
    const booked = hotelReducer(before, { type: BOOK, count: 2 });
    const next = hotelReducer(booked, { type: BOOK, count: 1 });

    expect(next.message.kind).toBe("insufficient");
    expect(next.message.available).toBe(0);
  });
});

describe("hotelReducer RESET", () => {
  it("empties the hotel and clears the last booking", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 4 });
    const next = hotelReducer(booked, { type: RESET });

    expect(next.lastBooking).toEqual([]);
    expect(next.message).toBeNull();
    expect(occupiedNumbers(next)).toEqual([]);
  });
});

describe("hotelReducer RANDOMIZE", () => {
  it("builds a fresh scenario and clears the last booking", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 4 });
    const next = hotelReducer(booked, {
      type: RANDOMIZE,
      rate: 0.4,
      random: () => 0.99,
    });

    expect(next.lastBooking).toEqual([]);
    expect(next.message).toBeNull();
    // Occupancy replaces what was there rather than stacking on top of it.
    expect(occupiedNumbers(next)).toEqual([]);
  });

  it("fills roughly the requested share of the hotel", () => {
    const next = hotelReducer(createInitialState(), {
      type: RANDOMIZE,
      rate: 0.4,
      random: () => 0,
    });

    expect(occupiedNumbers(next)).toHaveLength(next.rooms.length);
  });
});

describe("hotelReducer unknown action", () => {
  it("returns the same state", () => {
    const before = createInitialState();
    expect(hotelReducer(before, { type: "NOPE" })).toBe(before);
  });
});

describe("explainBooking tie-breaks", () => {
  it("names the lift-distance rule when the best alternative was as compact", () => {
    // 101-104 go first, so the next four land on Floor 2. The best booking
    // left on Floor 1 is 105-108: just as compact, but further from the lift.
    const first = hotelReducer(createInitialState(), { type: BOOK, count: 4 });
    const second = hotelReducer(first, { type: BOOK, count: 4 });

    expect(second.lastBooking).toEqual([201, 202, 203, 204]);
    expect(second.message.text).toContain(
      "Floor 1 (105–108) was equally compact, but Floor 2 is closer to the lift entrance."
    );
  });

  it("falls through to the lower floor when access tied as well", () => {
    const state = stateWithFreeRooms([307, 308, 309, 310, 601, 602, 603, 604]);
    const next = hotelReducer(state, { type: BOOK, count: 4 });

    expect(next.lastBooking).toEqual([307, 308, 309, 310]);
    expect(next.message.text).toContain(
      "equally close to the lift, so the lower floor was chosen."
    );
  });

  it("says nothing about tie-breaks when the winner was strictly better", () => {
    const state = stateWithFreeRooms([301, 305, 306, 307, 601, 602, 603, 604]);
    const next = hotelReducer(state, { type: BOOK, count: 4 });

    expect(next.message.text).not.toContain("equally compact");
  });
});

describe("guest numbering", () => {
  it("counts up on every successful booking", () => {
    const first = hotelReducer(createInitialState(), { type: BOOK, count: 2 });
    const second = hotelReducer(first, { type: BOOK, count: 2 });

    expect(first.guestCount).toBe(1);
    expect(first.message.guest).toBe(1);
    expect(second.guestCount).toBe(2);
    expect(second.message.guest).toBe(2);
  });

  it("does not count invalid input or a hotel that is too full", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 2 });
    const invalid = hotelReducer(booked, { type: BOOK, count: 9 });
    const tooFew = hotelReducer(
      { ...stateWithFreeRooms([101, 102]), guestCount: 1 },
      { type: BOOK, count: 4 }
    );

    expect(invalid.guestCount).toBe(1);
    expect(tooFew.guestCount).toBe(1);
  });

  it("restarts the count on reset and on randomize", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 2 });

    expect(hotelReducer(booked, { type: RESET }).guestCount).toBe(0);
    expect(
      hotelReducer(booked, { type: RANDOMIZE, rate: 0.4, random: () => 0.99 })
        .guestCount
    ).toBe(0);
  });
});
