/** Sonner and BullMQ disallow ':' in custom ids — normalize user-facing ids. */
export function safeToastId(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

/** BullMQ custom jobId must not contain ':'. */
export function safeQueueJobId(input: string): string {
  return input.replace(/:/g, "_").replace(/\s+/g, "_").slice(0, 200);
}
