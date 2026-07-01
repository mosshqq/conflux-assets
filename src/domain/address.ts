import { address as addressUtils } from 'js-conflux-sdk';
import { CORE_NETWORK, type CoreNetwork } from '../config/network';

export interface DecodedCoreAddress {
  normalized: string;
  hex: string;
  type: 'user' | 'contract' | 'builtin' | 'null' | string;
  networkId: number;
}

export type QueryAddressSpace = 'core' | 'espace';

export interface NormalizedQueryAddress {
  address: string;
  space: QueryAddressSpace;
}

export function decodeCoreAddress(
  value: string,
  network: CoreNetwork = CORE_NETWORK,
): DecodedCoreAddress {
  const input = value.trim();
  if (!input.toLowerCase().startsWith(`${network.addressPrefix}:`)) {
    throw new Error(`仅支持 ${network.addressPrefix}: 开头的 Core Space ${network.label}地址`);
  }

  try {
    const decoded = addressUtils.decodeCfxAddress(input) as {
      hexAddress: Uint8Array;
      netId: number;
      type: string;
    };

    if (decoded.netId !== network.networkId) {
      throw new Error(`地址不属于 Conflux Core Space ${network.label}`);
    }

    return {
      normalized: addressUtils.simplifyCfxAddress(input).toLowerCase(),
      hex: `0x${Array.from(decoded.hexAddress, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
      type: decoded.type,
      networkId: decoded.netId,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('仅支持') || error.message.startsWith('地址不属于'))
    ) {
      throw error;
    }
    throw new Error('Core Space 地址格式或校验和无效');
  }
}

export function normalizeUserAddress(value: string, network: CoreNetwork = CORE_NETWORK): string {
  const decoded = decodeCoreAddress(value, network);
  if (decoded.type !== 'user') {
    throw new Error('查询地址必须是 Core Space 用户地址');
  }
  return decoded.normalized;
}

export function normalizeESpaceAddress(value: string): string {
  const input = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(input)) {
    throw new Error('eSpace 地址必须是 0x 开头的 20 字节十六进制地址');
  }
  return addressUtils.ethChecksumAddress(input);
}

export function normalizeQueryAddress(value: string): NormalizedQueryAddress {
  const input = value.trim();
  if (input.toLowerCase().startsWith(`${CORE_NETWORK.addressPrefix}:`)) {
    return { address: normalizeUserAddress(input), space: 'core' };
  }
  if (input.toLowerCase().startsWith('0x')) {
    return { address: normalizeESpaceAddress(input), space: 'espace' };
  }
  throw new Error(
    `请输入 ${CORE_NETWORK.addressPrefix}: 开头的 Core Space 地址或 0x 开头的 eSpace 地址`,
  );
}

export function normalizePoolAddress(value: string, network: CoreNetwork = CORE_NETWORK): string {
  const decoded = decodeCoreAddress(value, network);
  if (decoded.type !== 'contract') {
    throw new Error('池地址必须是 Core Space 合约地址');
  }
  return decoded.normalized;
}

export function addressesEqual(
  left?: string,
  right?: string,
  network: CoreNetwork = CORE_NETWORK,
): boolean {
  if (!left || !right) return false;
  try {
    return decodeCoreAddress(left, network).hex === decodeCoreAddress(right, network).hex;
  } catch {
    return false;
  }
}

export function shortenAddress(value: string, front = 10, back = 8): string {
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}…${value.slice(-back)}`;
}
