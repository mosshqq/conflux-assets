import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCfx, votesToDrip } from '../../domain/money';
import { maxUnstakeVotes } from '../../domain/portfolio';
import type { PoolPosition } from '../../domain/types';
import { blockProgressLabel } from './stakingLifecycle';

export function StakingLifecycleTimeline({
  position,
  currentBlock,
}: {
  position: PoolPosition;
  currentBlock?: bigint;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();
  const unstakeableVotes = maxUnstakeVotes(position);
  const pendingStakeLocks =
    currentBlock === undefined
      ? []
      : position.stakeLockQueue.filter((item) => item.lockBlock > currentBlock);

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-semibold">质押生命周期</h2>
          <p className="mt-1 text-sm text-muted">
            从增加质押锁定、发起解质押到本金可提取的当前进度。
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-muted">
            {currentBlock === undefined ? '当前区块读取中…' : `当前区块 ${currentBlock.toString()}`}
          </span>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition hover:border-accent/40 hover:bg-surface"
          >
            {isExpanded ? (
              <>
                收起详情
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              <>
                展开详情
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div id={detailsId}>
          <ol className="mt-6 space-y-0">
            <TimelineStage title="1. 增加质押锁定">
              {currentBlock === undefined ? (
                <p className="text-sm text-muted">正在读取当前区块以确认锁定状态…</p>
              ) : pendingStakeLocks.length > 0 ? (
                <QueueList>
                  {pendingStakeLocks.map((item, index) => (
                    <QueueRow
                      key={`${item.lockBlock}-${index}`}
                      amount={`${formatCfx(votesToDrip(item.votes))} CFX`}
                      status={blockProgressLabel(item.lockBlock, currentBlock)}
                    />
                  ))}
                </QueueList>
              ) : (
                <p className="text-sm text-muted">当前没有锁定中的新增质押。</p>
              )}
            </TimelineStage>

            <TimelineStage title="2. 可发起解质押">
              <p className="text-sm">
                <span className="font-medium text-accent">
                  {formatCfx(votesToDrip(unstakeableVotes))} CFX
                </span>
                <span className="text-muted">（{unstakeableVotes.toString()} 票）</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                仅计算已完成锁定并扣除治理锁定的票数，不包含仍在入队锁定中的票。
              </p>
            </TimelineStage>

            <TimelineStage title="3. 解质押等待">
              {position.unlockQueue.length > 0 ? (
                <QueueList>
                  {position.unlockQueue.map((item, index) => (
                    <QueueRow
                      key={`${item.unlockBlock}-${index}`}
                      amount={`${formatCfx(votesToDrip(item.votes))} CFX`}
                      status={blockProgressLabel(item.unlockBlock, currentBlock)}
                    />
                  ))}
                </QueueList>
              ) : (
                <p className="text-sm text-muted">当前没有等待解锁的解质押批次。</p>
              )}
            </TimelineStage>

            <TimelineStage title="4. 提取本金" last>
              {position.unlockedVotes > 0n ? (
                <>
                  <p className="text-sm font-medium text-accent">
                    {formatCfx(votesToDrip(position.unlockedVotes))} CFX 可提取
                  </p>
                  <p className="mt-1 text-xs text-muted">连接匹配的 Fluent 账户后可提取本金。</p>
                </>
              ) : (
                <p className="text-sm text-muted">当前没有可提取本金。</p>
              )}
            </TimelineStage>
          </ol>

          <p className="mt-4 text-xs leading-5 text-muted">
            剩余时间按约 2 区块/秒估算，仅用于参考；实际状态以目标区块和链上读取结果为准。
          </p>
        </div>
      ) : null}
    </section>
  );
}

function TimelineStage({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
      <div className="relative flex justify-center">
        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
        {!last ? (
          <span className="absolute bottom-[-0.375rem] top-4 w-px bg-line" aria-hidden="true" />
        ) : null}
      </div>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}

function QueueList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-line rounded-xl bg-surface px-3">{children}</div>;
}

function QueueRow({ amount, status }: { amount: string; status: string }) {
  return (
    <div className="flex flex-col justify-between gap-1 py-2.5 text-sm sm:flex-row sm:items-center">
      <span className="font-medium">{amount}</span>
      <span className="text-xs text-muted">{status}</span>
    </div>
  );
}
