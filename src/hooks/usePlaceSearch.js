import { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../api/geocode';

export function usePlaceSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);
  const skipRef = useRef(false);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    clearTimeout(debounceRef.current);

    if (query.length < 3) {
      debounceRef.current = setTimeout(() => {
        setResults([]);
        setSearched(false);
      }, 0);
      return () => clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchPlaces(query);
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const select = displayName => {
    clearTimeout(debounceRef.current);
    skipRef.current = true;
    setQuery(displayName);
    setResults([]);
    setSearched(false);
  };

  return { query, setQuery, results, searched, select };
}
