import { roomNumber } from "../domain/hotel";

// How a room is drawn. "booked" is only ever the rooms from the booking that
// just happened, so anything that clears lastBooking also clears the highlight.
export function roomStatus(room, justBooked) {
  if (justBooked.has(roomNumber(room))) return "booked";
  return room.isOccupied ? "occupied" : "available";
}
