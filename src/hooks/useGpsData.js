import { useState, useEffect } from 'react';

export function useGpsData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  return { data, loading, error };
}
