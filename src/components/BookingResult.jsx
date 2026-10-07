import "./BookingResult.css";

function Stat({ label, value }) {
  return (
    <div className="result__stat">
      <dt className="result__stat-label">{label}</dt>
      <dd className="result__stat-value">{value}</dd>
    </div>
  );
}

function Success({ message }) {
  const { guest, roomNumbers, floors, travelTime, text } = message;

  return (
    <>
      <h2 className="result__title">Booked for Guest {guest}</h2>

      <ul className="result__chips">
        {roomNumbers.map(number => (
          <li key={number} className="result__chip">
            {number}
          </li>
        ))}
      </ul>

      <dl className="result__stats">
        <Stat label="Rooms" value={roomNumbers.length} />
        <Stat
          label={floors.length === 1 ? "Floor" : "Floors"}
          value={floors.join(", ")}
        />
        <Stat label="Travel time" value={`${travelTime} min`} />
      </dl>

      <p className="result__why">{text}</p>

      <p className="result__next">
        Next guest? Enter the number of rooms above and press Book.
      </p>
    </>
  );
}

function Insufficient({ message, onBook }) {
  const { available } = message;

  return (
    <>
      <h2 className="result__title result__title--warn">Not enough rooms</h2>
      <p className="result__why">
        {available === 0
          ? "Every room is occupied. Reset or randomise to start over."
          : `Only ${available} ${
              available === 1 ? "room is" : "rooms are"
            } available.`}
      </p>
      {available > 0 && (
        <button
          type="button"
          className="btn btn--primary result__action"
          onClick={() => onBook(available)}
        >
          Book {available} instead
        </button>
      )}
    </>
  );
}

export default function BookingResult({ message, onBook }) {
  return (
    <section className="result" role="status" aria-live="polite">
      {message === null && (
        <p className="result__empty">
          Choose how many rooms you need, then press Book. The best group will
          be highlighted in the plan.
        </p>
      )}

      {message?.kind === "success" && <Success message={message} />}

      {message?.kind === "insufficient" && (
        <Insufficient message={message} onBook={onBook} />
      )}

      {message?.kind === "error" && (
        <>
          <h2 className="result__title result__title--warn">
            Check that number
          </h2>
          <p className="result__why">{message.text}</p>
        </>
      )}
    </section>
  );
}
