import { TS_WINDOW_MS } from './constants.js';

/**
 * Validates a client timestamp against the received timestamp.
 * Replaces the client timestamp with receivedAt if it is missing, invalid,
 * or skewed by more than 24 hours in either direction.
 */
export function resolveTs(
  clientTs: string | Date | undefined | null,
  receivedAt: string | Date = new Date(),
): Date {
  const receivedDate =
    receivedAt instanceof Date ? receivedAt : new Date(receivedAt);
  const receivedMs = receivedDate.getTime();

  if (!clientTs) {
    return receivedDate;
  }

  const clientDate = clientTs instanceof Date ? clientTs : new Date(clientTs);
  const clientMs = clientDate.getTime();

  if (Number.isNaN(clientMs)) {
    return receivedDate;
  }

  const diff = Math.abs(clientMs - receivedMs);
  if (diff <= TS_WINDOW_MS) {
    return clientDate;
  }

  return receivedDate;
}
