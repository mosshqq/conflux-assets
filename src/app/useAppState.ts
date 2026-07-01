import { useContext } from 'react';
import { AppStateContext, type AppStateValue } from './AppStateContext';

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState 必须在 AppStateProvider 中使用');
  return context;
}
