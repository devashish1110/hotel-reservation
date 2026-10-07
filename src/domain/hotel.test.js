import { describe, it, expect } from "vitest";
import { accessTime, createRooms, roomNumber, travelTime } from "./hotel";

describe("createRooms", () => {
  it("builds 97 rooms", () => {
    expect(createRooms()).toHaveLength(97);
  });

  it("numbers the top floor 1001-1007", () => {
    const top = createRooms().filter(r => r.floor === 10).map(roomNumber);
    expect(top).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007]);
  });
});

describe("travelTime", () => {
  it("counts only the corridor on one floor", () => {
    const a = { floor: 1, position: 1 };
    const b = { floor: 1, position: 5 };
    expect(travelTime(a, b)).toBe(4);
    expect(travelTime(b, a)).toBe(4);
  });

  it("counts both walks to the lift plus the ride between floors", () => {
    const a = { floor: 1, position: 10 };
    const b = { floor: 3, position: 2 };
    expect(travelTime(a, b)).toBe(16);
  });
});

describe("accessTime", () => {
  it("measures the trip from the entrance to the door", () => {
    expect(accessTime({ floor: 1, position: 1 })).toBe(1);
    expect(accessTime({ floor: 3, position: 7 })).toBe(11);
  });
});
