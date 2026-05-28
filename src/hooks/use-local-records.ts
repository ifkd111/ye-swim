"use client";

import { useEffect, useState } from "react";

export function useLocalRecords<T>(key: string, initialRecords: T[]) {
  const [records, setRecords] = useState<T[]>(initialRecords);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        setRecords(JSON.parse(stored) as T[]);
      }
    } catch {
      setRecords(initialRecords);
    } finally {
      setReady(true);
    }
  }, [initialRecords, key]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(key, JSON.stringify(records));
  }, [key, ready, records]);

  function reset() {
    window.localStorage.removeItem(key);
    setRecords(initialRecords);
  }

  return { records, setRecords, reset, ready };
}

export function useRecords<T>(key: string, initialRecords: T[], persist: boolean) {
  const local = useLocalRecords(key, initialRecords);

  if (!persist) {
    return {
      records: initialRecords,
      setRecords: (() => undefined) as typeof local.setRecords,
      reset: () => undefined,
      ready: true
    };
  }

  return local;
}

export const storageKeys = {
  members: "swimops.members.v1",
  schedules: "swimops.schedules.v1",
  attendance: "swimops.attendance.v1"
};
