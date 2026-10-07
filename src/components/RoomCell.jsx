import { roomNumber } from "../domain/hotel";
import "./RoomCell.css";

const STATUS_WORDS = {
  available: "available",
  occupied: "occupied",
  booked: "just booked",
};

export default function RoomCell({ room, status }) {
  const number = roomNumber(room);

  return (
    <div
      className={`room room--${status}`}
      role="img"
      aria-label={`Room ${number}, ${STATUS_WORDS[status]}`}
    >
      <span className="room__number" aria-hidden="true">
        {number}
      </span>
    </div>
  );
}
