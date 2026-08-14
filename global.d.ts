export {};

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}
