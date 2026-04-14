"use client";

import { useEffect, useState } from "react";
import type { Manifest } from "@/types/activity";
import { loadManifest } from "@/lib/dataLoader";

interface ManifestState {
  manifest: Manifest | null;
  isLoading: boolean;
  error: Error | null;
}

// Module-level cache so multiple hook consumers share a single fetch.
let cachedManifest: Manifest | null = null;
let inflight: Promise<Manifest> | null = null;

function fetchOnce(): Promise<Manifest> {
  if (cachedManifest) return Promise.resolve(cachedManifest);
  if (inflight) return inflight;
  inflight = loadManifest()
    .then((m) => {
      cachedManifest = m;
      return m;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

interface AsyncResult {
  manifest: Manifest | null;
  error: Error | null;
}

export function useManifest(): ManifestState {
  const [asyncResult, setAsyncResult] = useState<AsyncResult | null>(null);

  let state: ManifestState;
  if (cachedManifest) {
    state = { manifest: cachedManifest, isLoading: false, error: null };
  } else if (asyncResult) {
    state = {
      manifest: asyncResult.manifest,
      isLoading: false,
      error: asyncResult.error,
    };
  } else {
    state = { manifest: null, isLoading: true, error: null };
  }

  useEffect(() => {
    if (cachedManifest) return;
    let cancelled = false;
    fetchOnce()
      .then((manifest) => {
        if (cancelled) return;
        setAsyncResult({ manifest, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAsyncResult({
          manifest: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
