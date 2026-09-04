import { useCallback, useSyncExternalStore } from "react";
import type { BackgroundAiRunStore } from "./backgroundAiRun";

export function useBackgroundAiRun<Input, Result>(
  store: BackgroundAiRunStore<Input, Result>,
  key: string,
) {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(key, listener),
    [key, store],
  );
  const getSnapshot = useCallback(() => store.get(key), [key, store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useBackgroundAiRunsVersion<Input, Result>(
  store: BackgroundAiRunStore<Input, Result>,
) {
  const subscribe = useCallback((listener: () => void) => store.subscribeAll(listener), [store]);
  const getSnapshot = useCallback(() => store.getVersion(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
