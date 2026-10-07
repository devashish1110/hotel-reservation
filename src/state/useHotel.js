import { useCallback, useReducer } from "react";
import {
  BOOK,
  RANDOMIZE,
  RESET,
  createInitialState,
  hotelReducer,
} from "./hotelReducer";

export function useHotel() {
  const [state, dispatch] = useReducer(
    hotelReducer,
    undefined,
    createInitialState
  );

  const book = useCallback(count => dispatch({ type: BOOK, count }), []);
  const reset = useCallback(() => dispatch({ type: RESET }), []);
  const randomize = useCallback(() => dispatch({ type: RANDOMIZE }), []);

  return { state, book, reset, randomize };
}
