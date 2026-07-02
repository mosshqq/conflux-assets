import { describe, expect, it } from 'vitest';
import {
  blockProgressLabel,
  formatEstimatedBlockDuration,
  remainingBlocks,
} from './stakingLifecycle';

describe('staking lifecycle', () => {
  it('calculates remaining blocks without going below zero', () => {
    expect(remainingBlocks(120n, 100n)).toBe(20n);
    expect(remainingBlocks(100n, 120n)).toBe(0n);
    expect(remainingBlocks(100n)).toBeNull();
  });

  it('formats approximate durations at two blocks per second', () => {
    expect(formatEstimatedBlockDuration(60n)).toBe('不到 1 分钟');
    expect(formatEstimatedBlockDuration(120n)).toBe('1 分钟');
    expect(formatEstimatedBlockDuration(7_200n)).toBe('1 小时');
    expect(formatEstimatedBlockDuration(172_800n)).toBe('1 天');
  });

  it('marks reached target blocks as completed', () => {
    expect(blockProgressLabel(100n, 99n)).toBe('区块 100 · 约不到 1 分钟');
    expect(blockProgressLabel(100n, 100n)).toBe('区块 100 · 已完成');
    expect(blockProgressLabel(100n)).toBe('目标区块 100');
  });
});
