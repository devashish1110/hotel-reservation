import { DEFAULT_OCCUPANCY_RATE } from "../domain/booking";
import { VERTICAL_MINUTES_PER_FLOOR } from "../domain/hotel";
import "./HowItWorks.css";

const RANDOM_SHARE = Math.round(DEFAULT_OCCUPANCY_RATE * 100);

export default function HowItWorks() {
  return (
    <details className="how">
      <summary className="how__summary">How rooms are chosen</summary>
      <ol className="how__list">
        <li>
          <strong>Same floor first</strong>, whenever any floor has enough free
          rooms &mdash; even if a different floor would look like a shorter
          walk.
        </li>
        <li>
          <strong>Travel time</strong> is the time between the two farthest
          rooms in the booking. On one floor: 1 min per room. Across floors:
          walk to the lift + {VERTICAL_MINUTES_PER_FLOOR} min per floor + walk
          to the room (room 1 is 1 min from the lift).
        </li>
        <li>
          <strong>Ties</strong> go to the shorter walk from the lift on Floor 1
          to the nearest room in the booking, and then to the lower floor.
        </li>
        <li>
          <strong>Note on the PDF.</strong> Its second example (&ldquo;201,
          202&rdquo;) conflicts with &ldquo;same floor first&rdquo;. We follow
          the stated rule, so that case books 201, 202, 203, 210.
        </li>
        <li>
          <strong>Random</strong> fills about {RANDOM_SHARE}% of the rooms as a
          fresh scenario, replacing whatever was there.
        </li>
      </ol>
    </details>
  );
}
