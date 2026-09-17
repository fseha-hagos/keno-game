import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DrawResult {
  draw: number[];
  hash: string;
  seed: string;
}

@Injectable()
export class RngService {
  /**
   * Cryptographically Secure Random Number Generator for Keno Draws.
   * Uses crypto.randomInt (CSPRNG) and Fisher-Yates shuffle to sample 20 unique numbers from 1..80.
   *
   * Absolute Independence Guarantee:
   * - No player state is accepted or read.
   * - No house profit / RTP compensation logic exists.
   * - The sampling is strictly uniform without replacement.
   */
  generateAuthoritativeDraw(): DrawResult {
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    const drawn: number[] = [];

    // Fisher-Yates unbiased selection of 20 numbers
    for (let i = 0; i < 20; i++) {
      const remaining = pool.length;
      // crypto.randomInt is cryptographically secure and avoids modulo bias
      const randomIndex = crypto.randomInt(0, remaining);
      const selectedNumber = pool[randomIndex]!;
      drawn.push(selectedNumber);

      // O(1) swap with last element
      pool[randomIndex] = pool[remaining - 1]!;
      pool.pop();
    }

    // Generate cryptographic proof (SHA-256 hash of draw + server salt seed)
    const seed = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(`${seed}:${drawn.join(',')}`)
      .digest('hex');

    return {
      draw: drawn,
      hash,
      seed,
    };
  }
}
