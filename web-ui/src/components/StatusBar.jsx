import { useEffect, useState } from 'react';
import { SERVICES, serviceStatus } from '../api.js';

// Shows the health of each backend service, refreshed every 10 seconds.
export default function StatusBar() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    let alive = true;
    async function check() {
      const results = await Promise.all(SERVICES.map(serviceStatus));
      if (alive) setStatus(Object.fromEntries(SERVICES.map((s, i) => [s, results[i]])));
    }
    check();
    const timer = setInterval(check, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="status-bar">
      {SERVICES.map((s) => (
        <span key={s} className={`status ${status[s] === undefined ? '' : status[s] ? 'up' : 'down'}`}>
          <i />
          {s}
        </span>
      ))}
    </div>
  );
}
