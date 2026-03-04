import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <header>
        <h1>Airport simulation</h1>
        <h2>Home page</h2>
      </header>

      <main style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
        <Link href="/configure">
          <button style={{ padding: '10px 20px', cursor: 'pointer', width: '200px' }}>
            Configure Scenario
          </button>
        </Link>

        <Link href="/load">
          <button style={{ padding: '10px 20px', cursor: 'pointer', width: '200px' }}>
            Load Scenario
          </button>
        </Link>

        <Link href="/compare">
          <button style={{ padding: '10px 20px', cursor: 'pointer', width: '200px' }}>
            Compare Scenario
          </button>
        </Link>
      </main>
    </div>
  );
}