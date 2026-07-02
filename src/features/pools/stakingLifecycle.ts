const BLOCKS_PER_SECOND = 2n;

export function remainingBlocks(targetBlock: bigint, currentBlock?: bigint): bigint | null {
  if (currentBlock === undefined) return null;
  return targetBlock > currentBlock ? targetBlock - currentBlock : 0n;
}

export function formatEstimatedBlockDuration(blocks: bigint): string {
  const seconds = (blocks + BLOCKS_PER_SECOND - 1n) / BLOCKS_PER_SECOND;
  const days = seconds / 86_400n;
  if (days > 0n) return `${days.toString()} 天`;
  const hours = seconds / 3_600n;
  if (hours > 0n) return `${hours.toString()} 小时`;
  const minutes = seconds / 60n;
  if (minutes > 0n) return `${minutes.toString()} 分钟`;
  return '不到 1 分钟';
}

export function blockProgressLabel(targetBlock: bigint, currentBlock?: bigint): string {
  const remaining = remainingBlocks(targetBlock, currentBlock);
  if (remaining === null) return `目标区块 ${targetBlock.toString()}`;
  if (remaining === 0n) return `区块 ${targetBlock.toString()} · 已完成`;
  const duration = formatEstimatedBlockDuration(remaining);
  return `区块 ${targetBlock.toString()} · ${duration.startsWith('不到') ? '约' : '约 '}${duration}`;
}
