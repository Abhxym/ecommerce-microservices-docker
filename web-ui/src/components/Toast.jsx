import { useEffect, useState } from 'react';

// Short message at the bottom of the screen, hides itself after 2 seconds.
export default function Toast({ message, onDone }) {
  // keep the last text so it does not disappear while the toast fades out
  const [text, setText] = useState('');

  useEffect(() => {
    if (!message) return undefined;
    setText(message);
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div className={`toast ${message ? 'show' : ''}`} role="status" aria-live="polite">
      <span className="toast-tick">&#10003;</span>
      {text}
    </div>
  );
}
