/**
 * The testbed is a development tool: always on in `next dev`, and in a production
 * build only when NEXT_PUBLIC_ENABLE_TESTBED=true was set at build time.
 */
export function isTestbedEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_TESTBED === 'true'
  );
}
