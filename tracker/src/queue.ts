import { MAX_BATCH, QUEUE_CAP } from '@cf/shared/constants';

export class EventQueue<T> {
  #events: T[] = [];

  get length(): number {
    return this.#events.length;
  }

  push(event: T): void {
    this.#events.push(event);
    if (this.#events.length > QUEUE_CAP) {
      this.#events = this.#events.slice(-QUEUE_CAP);
    }
  }

  drainBatches(serialize: (events: T[]) => string, byteLimit: number): T[][] {
    const batches: T[][] = [];
    while (this.#events.length) {
      const batch: T[] = [];
      while (this.#events.length && batch.length < MAX_BATCH) {
        const candidate = [...batch, this.#events[0]];
        if (new Blob([serialize(candidate)]).size > byteLimit) {
          if (batch.length) break;
          this.#events.shift();
          continue;
        }
        batch.push(this.#events.shift() as T);
      }
      if (batch.length) batches.push(batch);
    }
    return batches;
  }
}
