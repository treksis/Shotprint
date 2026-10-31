export function useLiveGate(isJudgeMode: boolean, openGate: (reason: string, retry?: () => void) => void) {
  return <T extends unknown[]>(reason: string, fn: (...a: T) => Promise<void> | void) =>
    (...a: T) => {
      if (isJudgeMode) {
        return fn(...a);
      }
      openGate(reason, () => {
        void fn(...a);
      });
    };
}
