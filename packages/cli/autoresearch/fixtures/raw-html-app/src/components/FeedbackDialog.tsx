import React, { useRef, useState } from 'react';

export function FeedbackDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('');

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()}>
        Give Feedback
      </button>
      <dialog ref={dialogRef}>
        <h3>Feedback</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you think..."
        />
        <div>
          <button onClick={() => dialogRef.current?.close()}>Cancel</button>
          <button onClick={() => { alert(message); dialogRef.current?.close(); }}>
            Submit
          </button>
        </div>
      </dialog>
    </>
  );
}
