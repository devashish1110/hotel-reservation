import { Fragment } from "react";
import { FLOOR_COUNT, roomNumber, roomsOnFloor } from "../domain/hotel";
import RoomCell from "./RoomCell";
import { roomStatus } from "./roomStatus";
import "./BuildingGrid.css";

// Top floor first, so the building reads the way you would look at it.
const FLOORS_TOP_DOWN = Array.from(
  { length: FLOOR_COUNT },
  (_, index) => FLOOR_COUNT - index
);

// Every floor reserves the same number of slots, so position 1 stays aligned
// down the whole building even though the top floor is short.
const WIDEST_FLOOR = Math.max(...FLOORS_TOP_DOWN.map(roomsOnFloor));

export default function BuildingGrid({ rooms, lastBooking }) {
  const justBooked = new Set(lastBooking);

  const byFloor = new Map();
  for (const room of rooms) {
    if (!byFloor.has(room.floor)) byFloor.set(room.floor, []);
    byFloor.get(room.floor).push(room);
  }

  return (
    <div className="building">
      <div
        className="building__plan"
        style={{ gridTemplateRows: `repeat(${FLOOR_COUNT}, auto)` }}
      >
        <div className="building__lift">
          <span className="building__lift-label">Lift &amp; Stairs</span>
        </div>

        {FLOORS_TOP_DOWN.map(floor => (
          <Fragment key={floor}>
            <div className="building__floor">
              <span className="building__floor-word">Floor</span>
              <span className="building__floor-number">{floor}</span>
            </div>
            <div
              className="building__rooms"
              style={{
                gridTemplateColumns: `repeat(${WIDEST_FLOOR}, var(--room-size))`,
              }}
            >
              {(byFloor.get(floor) ?? [])
                .slice()
                .sort((a, b) => a.position - b.position)
                .map(room => (
                  <RoomCell
                    key={roomNumber(room)}
                    room={room}
                    status={roomStatus(room, justBooked)}
                  />
                ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
