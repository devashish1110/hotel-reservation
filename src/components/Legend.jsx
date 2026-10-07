import "./Legend.css";

const KEYS = [
  { status: "available", label: "Available" },
  { status: "occupied", label: "Occupied" },
  { status: "booked", label: "Just booked" },
];

export default function Legend({ rooms }) {
  const available = rooms.filter(room => !room.isOccupied).length;
  const occupied = rooms.length - available;

  return (
    <div className="legend">
      <ul className="legend__keys">
        {KEYS.map(({ status, label }) => (
          <li key={status} className="legend__key">
            <span
              className={`legend__swatch legend__swatch--${status}`}
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
      <p className="legend__counts">
        <strong>{available}</strong> available
        <span className="legend__dot" aria-hidden="true">
          &middot;
        </span>
        <strong>{occupied}</strong> occupied
      </p>
    </div>
  );
}
