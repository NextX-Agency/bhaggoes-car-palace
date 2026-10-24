import { startTransition, type FormEvent } from "react";

// React clears uncontrolled fields after a form `action`, even when the server rejected the input, so staff would lose
// everything they typed. Submitting through a transition keeps the fields as they are and still reports pending state.
export function keepFormValues(dispatch: (payload: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
}
