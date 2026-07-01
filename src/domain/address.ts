import { address as addressUtils } from 'js-conflux-sdk';

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

export function decodeCoreAddress(value: string): DecodedCoreAddress {
  const input = value.trim();
  if (!input.toLowerCase().startsWith('cfx:')) {
    throw new Error('仅支持 cfx: 开头的 Core Space 主网地址');
  }

  try {
    const decoded = addressUtils.decodeCfxAddress(input) as {
      hexAddress: Uint8Array;
      netId: number;
      type: string;
    };

    if (decoded.netId !== 1029) {
      throw new Error('地址不属于 Conflux Core Space 主网');
    }

    return {
      normalized: addressUtils.simplifyCfxAddress(input).toLowerCase(),
      hex: `0x${Array.from(decoded.hexAddress, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
      type: decoded.type,
      networkId: decoded.netId,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('主网')) throw error;
    throw new Error('Core Space 地址格式或校验和无效');
  }
}

export function normalizeUserAddress(value: string): string {
  const decoded = decodeCoreAddress(value);
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
  if (input.toLowerCase().startsWith('cfx:')) {
    return { address: normalizeUserAddress(input), space: 'core' };
  }
  if (input.toLowerCase().startsWith('0x')) {
    return { address: normalizeESpaceAddress(input), space: 'espace' };
  }
  throw new Error('请输入 cfx: 开头的 Core Space 地址或 0x 开头的 eSpace 地址');
}

export function normalizePoolAddress(value: string): string {
  const decoded = decodeCoreAddress(value);
  if (decoded.type !== 'contract') {
    throw new Error('池地址必须是 Core Space 合约地址');
  }
  return decoded.normalized;
}

export function addressesEqual(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  try {
    return decodeCoreAddress(left).hex === decodeCoreAddress(right).hex;
  } catch {
    return false;
  }
}

export function shortenAddress(value: string, front = 10, back = 8): string {
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}…${value.slice(-back)}`;
}
