export const FLOOR_COUNT = 10;
export const MAX_ROOMS_PER_BOOKING = 5;
export const VERTICAL_MINUTES_PER_FLOOR = 2;

export function roomsOnFloor(floor) {
  return floor === FLOOR_COUNT ? 7 : 10;
}

export function roomNumber(room) {
  return room.floor * 100 + room.position;
}

export function createRooms() {
  const rooms = [];
  for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
    for (let position = 1; position <= roomsOnFloor(floor); position++) {
      rooms.push({ floor, position, isOccupied: false });
    }
  }
  return rooms;
}

// Position p is p minutes of walking from the lift on its floor, so a trip between
// floors is: walk out to the lift, ride it, then walk in on the other side.
export function travelTime(a, b) {
  if (a.floor === b.floor) {
    return Math.abs(a.position - b.position);
  }
  return (
    a.position +
    b.position +
    VERTICAL_MINUTES_PER_FLOOR * Math.abs(a.floor - b.floor)
  );
}

// Minutes from the ground-floor entrance (lift on floor 1) to the room's door.
export function accessTime(room) {
  return VERTICAL_MINUTES_PER_FLOOR * (room.floor - 1) + room.position;
}
