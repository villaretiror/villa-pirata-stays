// 🔱 GLOBAL BLINDAGE: Protector of the Production Runtime
// This ensures 'process' is always defined before any other module runs.
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}
export {};
