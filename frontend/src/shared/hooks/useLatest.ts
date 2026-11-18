import { useEffect, useRef } from "react";

/** A ref that always holds the value of the latest render, for callbacks and effects that must not re-run when it changes. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
