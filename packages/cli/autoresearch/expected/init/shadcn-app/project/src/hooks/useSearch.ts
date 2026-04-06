import { useState, useMemo } from 'react';

export function useSearch<T>(items: T[], searchFn: (item: T, query: string) => boolean) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => (query ? items.filter((item) => searchFn(item, query)) : items),
    [items, query, searchFn]
  );

  return { query, setQuery, filtered };
}
