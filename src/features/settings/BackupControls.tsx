import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAppState } from '../../app/useAppState';
import { CORE_NETWORK } from '../../config/network';
import {
  parsePersistedStateImport,
  serializePersistedStateExport,
} from '../../infrastructure/storage/localState';

function exportFileName(): string {
  return `conflux-assets-${CORE_NETWORK.id}-${new Date().toISOString().slice(0, 10)}.json`;
}

export function BackupControls() {
  const { exportState, importState } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleExport() {
    setError('');
    const blob = new Blob([serializePersistedStateExport(exportState())], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('已导出当前网络的本地数据。');
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setMessage('');

    try {
      const imported = parsePersistedStateImport(await file.text());
      importState(imported);
      setMessage(
        `已导入 ${imported.bookmarks.length} 个地址和 ${imported.customPools.length} 个 PoS 池。`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '导入失败');
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">本地数据</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            导出或导入当前 Core {CORE_NETWORK.label}范围内的收藏地址、PoS 池和排序偏好。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExport} className="secondary-button gap-2">
            <Download size={16} aria-hidden="true" />
            导出
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="secondary-button gap-2"
          >
            <Upload size={16} aria-hidden="true" />
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event)}
            className="sr-only"
            aria-label="导入本地数据文件"
          />
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
