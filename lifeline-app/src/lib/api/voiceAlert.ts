export async function testNotify(userId: string) {
  const res = await fetch('/voice-alert/testNotify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}


