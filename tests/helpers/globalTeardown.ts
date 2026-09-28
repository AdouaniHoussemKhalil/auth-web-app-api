export default async function globalTeardown() {
  await (globalThis as any).__MONGO__?.stop();
}
