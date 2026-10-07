import { createRooms } from "../domain/hotel";
import {
  REASON_INSUFFICIENT,
  applyBooking,
  bookingAccess,
  findBestBooking,
  generateRandomOccupancy,
} from "../domain/booking";

export const BOOK = "BOOK";
export const RESET = "RESET";
export const RANDOMIZE = "RANDOMIZE";

export function createInitialState() {
  return { rooms: createRooms(), lastBooking: [], message: null, guestCount: 0 };
}

// "2-3" when the floors run on, "2, 4 and 7" when they do not.
function formatFloors(floors) {
  const isRun = floors.every(
    (floor, index) => index === 0 || floor === floors[index - 1] + 1
  );
  if (isRun) return `${floors[0]}–${floors[floors.length - 1]}`;
  return `${floors.slice(0, -1).join(", ")} and ${floors[floors.length - 1]}`;
}

function floorLabel(floors) {
  return floors.length === 1
    ? `Floor ${floors[0]}`
    : `Floors ${formatFloors(floors)}`;
}

function roomRange(roomNumbers) {
  const isRun = roomNumbers.every(
    (number, index) => index === 0 || number === roomNumbers[index - 1] + 1
  );
  return isRun && roomNumbers.length > 1
    ? `${roomNumbers[0]}–${roomNumbers[roomNumbers.length - 1]}`
    : roomNumbers.join(", ");
}

// When the best placement elsewhere was just as compact, name the rule that
// actually separated them. The rival always sits on different floors, so the
// comparison can always be phrased in terms of floors.
function tieBreakNote(result) {
  const { runnerUp, floors, travelTime, rooms } = result;
  if (!runnerUp || runnerUp.travelTime !== travelTime) return null;

  const rival = `${floorLabel(runnerUp.floors)} (${roomRange(
    runnerUp.roomNumbers
  )})`;

  if (runnerUp.access !== bookingAccess(rooms)) {
    return `${rival} was equally compact, but ${floorLabel(
      floors
    )} is closer to the lift entrance.`;
  }

  // Cost and access both tied, so the room-number order was the decider.
  return `${rival} was equally compact and equally close to the lift, so the lower floor was chosen.`;
}

// One plain-English sentence explaining why these rooms won.
export function explainBooking(result) {
  const { roomNumbers, floors, travelTime } = result;

  let base;
  if (roomNumbers.length === 1) {
    base = `Room ${roomNumbers[0]} is the quickest free room to reach from the entrance.`;
  } else if (floors.length === 1) {
    base = `All on Floor ${floors[0]} — the closest group of ${roomNumbers.length} free rooms available, ${travelTime} min end to end.`;
  } else {
    base = `No single floor had ${roomNumbers.length} free rooms, so the booking spans floors ${formatFloors(
      floors
    )}.`;
  }

  const note = tieBreakNote(result);
  return note ? `${base} ${note}` : base;
}

function book(state, count) {
  const result = findBestBooking(state.rooms, count);

  if (result.ok) {
    const guest = state.guestCount + 1;
    return {
      rooms: applyBooking(state.rooms, result.rooms),
      lastBooking: result.roomNumbers,
      guestCount: guest,
      message: {
        kind: "success",
        guest,
        roomNumbers: result.roomNumbers,
        floors: result.floors,
        travelTime: result.travelTime,
        text: explainBooking(result),
      },
    };
  }

  if (result.reason === REASON_INSUFFICIENT) {
    return {
      ...state,
      message: {
        kind: "insufficient",
        available: result.available,
        text: result.error,
      },
    };
  }

  return { ...state, message: { kind: "error", text: result.error } };
}

export function hotelReducer(state, action) {
  switch (action.type) {
    case BOOK:
      return book(state, action.count);

    case RESET:
      return createInitialState();

    // A fresh scenario, not occupancy layered on top of what is already there.
    case RANDOMIZE:
      return {
        ...createInitialState(),
        rooms: generateRandomOccupancy(action.rate, action.random),
      };

    default:
      return state;
  }
}
