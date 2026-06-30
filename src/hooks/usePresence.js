import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeCollab } from '../lib/realtimeCollab';

export function usePresence(pageId) {
  const [users, setUsers] = useState([]);
  const [ownStatus, setOwnStatus] = useState('viewing');
  const pageRef = useRef(pageId);
  pageRef.current = pageId;

  useEffect(() => {
    if (!pageId || !realtimeCollab.isJoined()) return;

    const unsubs = [
      realtimeCollab.on('presence:sync', ({ pageId: pid, users: u }) => {
        if (pid === pageRef.current) {
          setUsers(u.filter(us => us.userId !== realtimeCollab.getUser().userId));
        }
      }),
      realtimeCollab.on('presence:join', ({ pageId: pid, user }) => {
        if (pid === pageRef.current && user.userId !== realtimeCollab.getUser().userId) {
          setUsers(prev => {
            if (prev.some(u => u.id === user.id)) return prev;
            return [...prev, user];
          });
        }
      }),
      realtimeCollab.on('presence:leave', ({ pageId: pid, userId }) => {
        if (pid === pageRef.current) {
          setUsers(prev => prev.filter(u => u.userId !== userId && u.id !== userId));
        }
      })
    ];

    realtimeCollab.joinPage(pageId);

    return () => {
      unsubs.forEach(fn => fn());
      realtimeCollab.leavePage(pageId);
    };
  }, [pageId]);

  const setStatus = useCallback((status) => {
    setOwnStatus(status);
    realtimeCollab.updateStatus(pageRef.current, status);
  }, []);

  return { users, ownStatus, setStatus, onlineCount: users.length + 1 };
}
