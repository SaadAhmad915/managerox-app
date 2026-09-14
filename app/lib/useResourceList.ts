"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The list behaviour every resource screen needs: debounced search, paging,
 * refetch after a write, and a loading flag.
 *
 * `loading` is derived rather than stored. Setting it synchronously inside the
 * fetch effect triggers cascading renders (React's lint rule rejects it), so
 * instead we compare the key the data was loaded for against the key we
 * currently want — which says the same thing for free.
 */
export function useResourceList<T>(
  fetcher: (args: { search: string; page: number }) => Promise<T>,
  /** Filter values that should reset paging and refetch when they change. */
  filters: Array<string | boolean | undefined> = [],
  errorMessage = "Could not load this list. Is the API running?",
) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; data: T } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  /*
   * A changed filter makes the current page number meaningless — page 7 of the
   * old result set says nothing about the new one. Adjusting during render is
   * React's documented pattern for this; doing it in an effect would render
   * once with the stale page and then again, which is the cascade the lint rule
   * is there to prevent.
   */
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const requestKey = `${filterKey}|${debouncedSearch}|${page}|${refreshKey}`;
  const loading = !error && loaded?.key !== requestKey;

  // Typing shouldn't fire a request per keystroke. setState here is inside a
  // timeout, so it is not a synchronous update during the effect.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  /*
   * Callers pass an inline arrow function, whose identity changes every render.
   * Keeping it in a ref stops that from re-triggering the fetch; the ref is
   * updated in an effect declared before the fetch effect, so it is always
   * current by the time the fetch runs.
   */
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;

    fetcherRef
      .current({ search: debouncedSearch, page })
      .then((data) => {
        if (!active) return;
        setLoaded({ key: requestKey, data });
        setError(null);
      })
      .catch(() => {
        if (active) setError(errorMessage);
      });

    return () => {
      active = false;
    };
  }, [requestKey, debouncedSearch, page, errorMessage]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return {
    data: loaded?.data ?? null,
    loading,
    error,
    setError,
    search,
    setSearch,
    page,
    setPage,
    reload,
  };
}
