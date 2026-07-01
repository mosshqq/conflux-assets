import { ESPACE_MAINNET } from '../../config/network';
import { toBigInt } from '../../domain/money';

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

export async function readESpaceBalance(address: string): Promise<bigint> {
  const response = await fetch(ESPACE_MAINNET.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });

  if (!response.ok) {
    throw new Error(`eSpace RPC 请求失败（HTTP ${response.status}）`);
  }

  const payload = (await response.json()) as JsonRpcResponse;
  if (payload.error) {
    throw new Error(
      `eSpace RPC 读取余额失败：${payload.error.message || payload.error.code || '未知错误'}`,
    );
  }
  if (typeof payload.result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(payload.result)) {
    throw new Error('eSpace RPC 返回了无效余额');
  }

  return toBigInt(payload.result);
}
