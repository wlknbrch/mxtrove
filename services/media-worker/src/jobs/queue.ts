/** A failed task cannot stop later songs or become an unhandled rejection. */
export class MediaJobQueue {
  private readonly pending: string[] = [];
  private readonly known = new Set<string>();
  private active = 0;

  constructor(
    private readonly concurrency: number,
    private readonly process: (id: string) => Promise<void>,
    private readonly onError: (id: string, error: unknown) => Promise<void>,
  ) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Media job concurrency must be positive.");
  }

  has(id: string) { return this.known.has(id); }

  add(id: string) {
    if (this.known.has(id)) return;
    this.known.add(id);
    this.pending.push(id);
    this.drain();
  }

  private drain() {
    while (this.active < this.concurrency && this.pending.length) {
      const id = this.pending.shift()!;
      this.active += 1;
      void this.run(id);
    }
  }

  private async run(id: string) {
    try {
      await this.process(id);
    } catch (error) {
      try { await this.onError(id, error); }
      catch { console.error("Could not persist media job failure", { jobId: id }); }
    } finally {
      this.known.delete(id);
      this.active -= 1;
      this.drain();
    }
  }
}
