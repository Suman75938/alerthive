import { useEffect, useRef } from 'react';
import { tokenStore } from '../lib/api';
import { queryClient } from '../lib/queryClient';

const WS_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1')
  .replace(/^http/, 'ws')
  .replace('/api/v1', '/ws');

const INVALIDATION_MAP: Record<string, string[]> = {
  'alert.new':       ['alerts'],
  'alert.updated':   ['alerts'],
  'ticket.created':  ['tickets'],
  'ticket.updated':  ['tickets'],
  'incident.created':['incidents'],
  'incident.updated':['incidents'],
};

export function useRealtimeUpdates() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) return;

    const url = `${WS_URL}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const { event } = JSON.parse(evt.data) as { event: string };
        const keys = INVALIDATION_MAP[event];
        if (keys) keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => { /* silent – backend may not be running */ };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);
}
