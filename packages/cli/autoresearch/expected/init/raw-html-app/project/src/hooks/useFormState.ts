import { useState } from 'react';

export function useFormState<T>(initial: T) {
  const [values, setValues] = useState(initial);

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setValues(initial);

  return { values, update, reset };
}
