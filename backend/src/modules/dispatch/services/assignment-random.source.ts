import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

/**
 * R4 Step 30 — injectable randomness.
 *
 * The dispatch engine MUST never call Math.random() (predictable, not
 * crypto-secure). Production uses crypto.randomInt; tests inject a
 * deterministic sequence via the token.
 */
export interface AssignmentRandomSource {
  /** Uniform integer in [0, maxExclusive). */
  pickIndex(maxExclusive: number): number;
}

@Injectable()
export class CryptoAssignmentRandomSource implements AssignmentRandomSource {
  pickIndex(maxExclusive: number): number {
    return randomInt(maxExclusive);
  }
}

/**
 * Deterministic stub for tests: consumes a preset sequence, then falls back
 * to 0 (stable but biased — fine for assertions, never for production).
 */
export class FixedSequenceRandomSource implements AssignmentRandomSource {
  private cursor = 0;

  constructor(private readonly sequence: number[]) {}

  pickIndex(maxExclusive: number): number {
    const value = this.sequence[this.cursor];
    this.cursor += 1;
    if (value === undefined) return 0;
    return Math.min(Math.max(0, value), maxExclusive - 1);
  }

  reset(): void {
    this.cursor = 0;
  }
}
