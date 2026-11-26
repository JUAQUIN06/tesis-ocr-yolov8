import { RefreshCw, Server, WifiOff } from 'lucide-react'
import type { Connection } from '../hooks/useBackendHealth'
import { IconButton } from './ui'

export function BackendStatus({ connection, onRefresh }: { connection: Connection; onRefresh: () => void }) {
  return <div className={`connection-strip connection-${connection.status}`} role="status">
    {connection.status === 'offline' ? <WifiOff size={18} /> : <Server size={18} />}
    <span>{connection.message}</span>
    <IconButton label="Comprobar conexión" onClick={onRefresh} disabled={connection.status === 'checking'}><RefreshCw size={16} className={connection.status === 'checking' ? 'animate-spin' : ''} /></IconButton>
  </div>
}
