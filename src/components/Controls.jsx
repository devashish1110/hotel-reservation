import { useEffect, useRef, useState } from "react";
import { MAX_ROOMS_PER_BOOKING } from "../domain/hotel";
import { MIN_ROOMS_PER_BOOKING, validateRoomCount } from "../domain/booking";
import "./Controls.css";

export default function Controls({
  bookingCount,
  onBook,
  onReset,
  onRandomize,
}) {
  const [raw, setRaw] = useState("1");
  const [seenBookings, setSeenBookings] = useState(bookingCount);
  const inputRef = useRef(null);

  // Once a booking lands, hand the field back empty for the next guest; Reset
  // and Random start the count over, so the field starts over at 1 too.
  if (bookingCount !== seenBookings) {
    setSeenBookings(bookingCount);
    setRaw(bookingCount > 0 ? "" : "1");
  }

  // Moving focus touches the DOM, so it stays in an effect.
  useEffect(() => {
    if (bookingCount > 0) inputRef.current?.focus();
  }, [bookingCount]);

  const isEmpty = raw.trim() === "";
  // Reuse the domain rule so the inline hint and the booking never disagree.
  const validation = isEmpty ? { ok: true } : validateRoomCount(Number(raw));

  function handleSubmit(event) {
    event.preventDefault();
    if (isEmpty) return;
    onBook(Number(raw));
  }

  return (
    <form className="controls" onSubmit={handleSubmit} noValidate>
      <div className="controls__field">
        <label className="controls__label" htmlFor="room-count">
          Rooms to book
        </label>
        <input
          id="room-count"
          ref={inputRef}
          className="controls__input"
          type="number"
          inputMode="numeric"
          placeholder={
            bookingCount > 0 ? "Next guest: how many rooms?" : undefined
          }
          min={MIN_ROOMS_PER_BOOKING}
          max={MAX_ROOMS_PER_BOOKING}
          step="1"
          value={raw}
          onChange={event => setRaw(event.target.value)}
          aria-invalid={!validation.ok}
          aria-describedby={validation.ok ? undefined : "room-count-error"}
        />
        <p className="controls__hint">
          {MIN_ROOMS_PER_BOOKING}&ndash;{MAX_ROOMS_PER_BOOKING} rooms per
          booking
        </p>
      </div>

      <div className="controls__actions">
        <button type="submit" className="btn btn--primary" disabled={isEmpty}>
          Book
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="btn" onClick={onRandomize}>
          Random
        </button>
      </div>

      {!validation.ok && (
        <p className="controls__error" id="room-count-error" role="alert">
          {validation.error}
        </p>
      )}
    </form>
  );
}
