import type { PoolOverview, PoolPosition } from '../../domain/types';

export type HomePoolSort =
  'favorite' | 'apy-desc' | 'apy-asc' | 'total-staked-desc' | 'total-staked-asc';

export type PositionPoolSort =
  | 'favorite'
  | 'apy-desc'
  | 'apy-asc'
  | 'active-stake-desc'
  | 'active-stake-asc'
  | 'claimable-desc'
  | 'claimable-asc';

type SortDirection = 'asc' | 'desc';

function compareOptionalBigInt(
  left: bigint | null | undefined,
  right: bigint | null | undefined,
  direction: SortDirection,
): number {
  if (left === null || left === undefined) {
    return right === null || right === undefined ? 0 : 1;
  }
  if (right === null || right === undefined) return -1;
  if (left === right) return 0;

  const comparison = left < right ? -1 : 1;
  return direction === 'asc' ? comparison : -comparison;
}

function stableSortIndexes(
  indexes: number[],
  valueAt: (index: number) => bigint | null | undefined,
  direction: SortDirection,
): number[] {
  const originalOrder = new Map(indexes.map((index, order) => [index, order]));
  return [...indexes].sort(
    (left, right) =>
      compareOptionalBigInt(valueAt(left), valueAt(right), direction) ||
      originalOrder.get(left)! - originalOrder.get(right)!,
  );
}

export function sortPoolOverviewIndexes(
  indexes: number[],
  overviews: Array<PoolOverview | undefined>,
  sort: HomePoolSort,
): number[] {
  if (sort === 'favorite') return [...indexes];

  const direction = sort.endsWith('-asc') ? 'asc' : 'desc';
  const valueAt =
    sort === 'apy-asc' || sort === 'apy-desc'
      ? (index: number) => overviews[index]?.expectedApyBps
      : (index: number) => overviews[index]?.totalStakedVotes;

  return stableSortIndexes(indexes, valueAt, direction);
}

export function sortPositionIndexes(
  indexes: number[],
  positions: Array<PoolPosition | undefined>,
  sort: PositionPoolSort,
): number[] {
  if (sort === 'favorite') return [...indexes];

  const direction = sort.endsWith('-asc') ? 'asc' : 'desc';
  let valueAt: (index: number) => bigint | null | undefined;

  if (sort === 'apy-asc' || sort === 'apy-desc') {
    valueAt = (index) => positions[index]?.expectedApyBps;
  } else if (sort === 'active-stake-asc' || sort === 'active-stake-desc') {
    valueAt = (index) => positions[index]?.activeVotes;
  } else {
    valueAt = (index) => positions[index]?.claimableDrip;
  }

  return stableSortIndexes(indexes, valueAt, direction);
}
