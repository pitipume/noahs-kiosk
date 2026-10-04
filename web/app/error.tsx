'use client'; // error boundaries must be Client Components

// Shown when the page throws, e.g. the API is down and the menu can't load.
export default function MenuError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main>
      <h1>The menu is unavailable right now.</h1>
      <p>Please try again in a moment.</p>
      <button onClick={() => retry()}>Try again</button>
    </main>
  );
}
