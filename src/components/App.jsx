import { useHotel } from "../state/useHotel";
import BookingResult from "./BookingResult";
import BuildingGrid from "./BuildingGrid";
import Controls from "./Controls";
import HowItWorks from "./HowItWorks";
import Legend from "./Legend";
import "./App.css";

export default function App() {
  const { state, book, reset, randomize } = useHotel();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Hotel Room Reservation</h1>
        <p className="app__subtitle">
          Book up to 5 rooms and get the group with the shortest walk between
          them.
        </p>
      </header>

      <main className="app__main">
        <Controls
          bookingCount={state.guestCount}
          onBook={book}
          onReset={reset}
          onRandomize={randomize}
        />

        <div className="app__body">
          <BuildingGrid rooms={state.rooms} lastBooking={state.lastBooking} />

          <aside className="app__side">
            <Legend rooms={state.rooms} />
            <BookingResult message={state.message} onBook={book} />
            <HowItWorks />
          </aside>
        </div>
      </main>
    </div>
  );
}
