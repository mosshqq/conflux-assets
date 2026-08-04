import { z } from 'zod';
import { CORE_NETWORK, type CoreNetwork } from '../../config/network';

const claimSettingsSchema = z.object({
  version: z.literal(1),
  minimumClaimDrip: z.string().regex(/^\d+$/),
});

export function claimSettingsStorageKeyForCoreNetwork(network: CoreNetwork): string {
  return network.id === 'testnet'
    ? 'conflux-pos-dashboard:core-testnet:claim-settings:v1'
    : 'conflux-pos-dashboard:claim-settings:v1';
}

export function readMinimumClaimDrip(
  storage: Storage = window.localStorage,
  network: CoreNetwork = CORE_NETWORK,
): bigint {
  try {
    const raw = storage.getItem(claimSettingsStorageKeyForCoreNetwork(network));
    if (!raw) return 0n;
    const result = claimSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? BigInt(result.data.minimumClaimDrip) : 0n;
  } catch {
    return 0n;
  }
}

export function writeMinimumClaimDrip(
  minimumClaimDrip: bigint,
  storage: Storage = window.localStorage,
  network: CoreNetwork = CORE_NETWORK,
): void {
  if (minimumClaimDrip < 0n) throw new Error('最低领取收益不能为负数');
  storage.setItem(
    claimSettingsStorageKeyForCoreNetwork(network),
    JSON.stringify({ version: 1, minimumClaimDrip: minimumClaimDrip.toString() }),
  );
}
