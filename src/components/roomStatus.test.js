import { describe, it, expect } from "vitest";
import { roomNumber } from "../domain/hotel";
import {
  BOOK,
  RANDOMIZE,
  RESET,
  createInitialState,
  hotelReducer,
} from "../state/hotelReducer";
import { roomStatus } from "./roomStatus";

// What the grid would draw for a given state, without rendering it.
function renderedStatuses(state) {
  const justBooked = new Set(state.lastBooking);
  return state.rooms.map(room => roomStatus(room, justBooked));
}

describe("roomStatus", () => {
  it("tells the three states apart", () => {
    const free = { floor: 3, position: 5, isOccupied: false };
    const taken = { floor: 3, position: 6, isOccupied: true };

    expect(roomStatus(free, new Set())).toBe("available");
    expect(roomStatus(taken, new Set())).toBe("occupied");
    expect(roomStatus(taken, new Set([306]))).toBe("booked");
  });

  it("highlights exactly the rooms from the booking that just happened", () => {
    const state = hotelReducer(createInitialState(), { type: BOOK, count: 3 });
    const booked = state.rooms
      .filter(room => roomStatus(room, new Set(state.lastBooking)) === "booked")
      .map(roomNumber);

    expect(booked).toEqual([101, 102, 103]);
  });

  it("draws no booked room after Random, whatever it generates", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 5 });

    // A rate of 1 occupies every room, including the five just highlighted:
    // if Random left lastBooking behind, those rooms would still light up.
    const filled = hotelReducer(booked, {
      type: RANDOMIZE,
      rate: 1,
      random: () => 0,
    });
    const mixed = hotelReducer(booked, { type: RANDOMIZE });

    expect(filled.rooms.every(room => room.isOccupied)).toBe(true);
    expect(renderedStatuses(filled)).not.toContain("booked");
    expect(renderedStatuses(mixed)).not.toContain("booked");
  });

  it("draws no booked room after Reset either", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 5 });
    const next = hotelReducer(booked, { type: RESET });

    expect(renderedStatuses(next)).not.toContain("booked");
  });

  it("drops the highlight when a later booking fails", () => {
    const booked = hotelReducer(createInitialState(), { type: BOOK, count: 2 });
    const invalid = hotelReducer(booked, { type: BOOK, count: 99 });

    // A failed booking leaves the previous highlight alone rather than lying
    // about what was booked.
    expect(invalid.message.kind).toBe("error");
    expect(renderedStatuses(invalid).filter(s => s === "booked")).toHaveLength(
      2
    );
  });
});
