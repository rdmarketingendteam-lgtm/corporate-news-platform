export default function NotFound() {
  return (
    <main className="site-shell narrow">
      <h1 className="listing-title">Page not found</h1>
      <p>The story may have moved or been removed.</p>
      <form action="/search" role="search" className="search-form">
        <input name="q" type="search" placeholder="Search stories" aria-label="Search stories" />
        <button className="btn">Search</button>
      </form>
      <p>
        <a href="/">← Back to the homepage</a>
      </p>
    </main>
  )
}
