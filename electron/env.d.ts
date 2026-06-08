export {};

declare global {
  interface Window {
    electronAPI: {
      _phase: 1;
    };
  }
}
