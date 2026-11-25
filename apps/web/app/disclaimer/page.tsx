import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Editorial Disclaimer & Fair Use Notice - Newspaper Pro',
  description: 'Legal disclaimer, publisher citations, reference image attribution, and Fair Dealing disclosure for Newspaper Pro.',
}

export default function DisclaimerPage() {
  return (
    <main style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '40px 0 60px 0' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="td-crumb-container" style={{ marginBottom: '24px' }}>
          <a href="/">Home</a>
          <span className="td-crumb-sep">›</span>
          <span style={{ color: '#999999' }}>Disclaimer & Fair Use Notice</span>
        </nav>

        {/* Header Block */}
        <div className="td-block-title-wrap" style={{ marginBottom: '24px' }}>
          <h1 className="td-block-title blue-accent" style={{ fontSize: '24px', letterSpacing: '0.5px' }}>
            EDITORIAL DISCLAIMER &amp; COPYRIGHT DISCLOSURE
          </h1>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid #4db2ec',
          padding: '18px 24px',
          borderRadius: '2px',
          marginBottom: '32px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#334155'
        }}>
          <strong>Important Reader Notice:</strong> Newspaper Pro is an independent digital news aggregation, editorial synthesis, and research publication. The headlines, story briefings, and visual assets indexed on this platform are curated strictly for public information, news reporting, educational research, and current affairs commentary.
        </div>

        {/* Section 1: Fair Use and Reference Policy */}
        <section style={{ marginBottom: '32px', color: '#2d3748', lineHeight: '1.7', fontSize: '15px' }}>
          <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, color: '#111', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px' }}>
            1. Fair Dealing &amp; Fair Use Declaration
          </h2>
          <p style={{ marginBottom: '14px' }}>
            All content published or referenced on this platform is utilized in compliance with the doctrine of <strong>Fair Dealing</strong> under <em>Section 52(1)(a) &amp; (b) of the Indian Copyright Act, 1957</em> (reporting of current events and affairs, criticism, and review) and international <strong>Fair Use</strong> standards (17 U.S. Code § 107).
          </p>
          <p>
            Newspaper Pro does not claim proprietary copyright over syndicated source briefings, wire statements, or public press communiques. Content has been edited, summarized, and contextualized by our editorial team to provide informative overviews to our readers.
          </p>
        </section>

        {/* Section 2: Four Core Publisher Citations */}
        <section style={{ marginBottom: '32px', color: '#2d3748', lineHeight: '1.7', fontSize: '15px' }}>
          <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, color: '#111', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px' }}>
            2. Publisher Sources &amp; Reference Citations
          </h2>
          <p style={{ marginBottom: '16px' }}>
            For public transparency and journalistic integrity, we acknowledge that specific news reports, public feeds, facts, and event developments are monitored, referenced, or cross-verified from the following leading national and international publishing networks:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginBottom: '6px' }}>
                <i className="fa-solid fa-newspaper" style={{ color: '#4db2ec', marginRight: '8px' }}></i>
                The Times of India
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Published by Bennett, Coleman &amp; Co. Ltd. Referenced for national developments, civic reports, and metropolitan affairs.
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginBottom: '6px' }}>
                <i className="fa-solid fa-scroll" style={{ color: '#4db2ec', marginRight: '8px' }}></i>
                The Indian Express
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Published by The Indian Express Ltd. Referenced for sports analysis, legal journalism, and investigative reporting.
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginBottom: '6px' }}>
                <i className="fa-solid fa-tv" style={{ color: '#4db2ec', marginRight: '8px' }}></i>
                NDTV (New Delhi TV)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Published by NDTV Convergence Ltd. Referenced for breaking bulletins, international diplomacy, and economy updates.
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginBottom: '6px' }}>
                <i className="fa-solid fa-satellite-dish" style={{ color: '#4db2ec', marginRight: '8px' }}></i>
                Hindustan Times &amp; Airtel Feeds
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Published by HT Media Ltd &amp; partner digital telecom syndications (including Airtel News reference streams).
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Visual Assets & Image Credits */}
        <section style={{ marginBottom: '32px', color: '#2d3748', lineHeight: '1.7', fontSize: '15px' }}>
          <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, color: '#111', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px' }}>
            3. Photographic &amp; Media Assets Attribution
          </h2>
          <p style={{ marginBottom: '12px' }}>
            All photographic images, news agency thumbnails, infographics, and broadcast stills shown across the platform remain the intellectual property of their original creators, syndication partners, and respective photographic agencies (including PTI, ANI, Reuters, Getty Images, and publisher wire services).
          </p>
          <p>
            Images are displayed exclusively for editorial visualization and context. No commercial resale, redistribution, or ownership claim is made over these third-party photographic assets.
          </p>
        </section>

        {/* Section 4: Trademark Warning */}
        <section style={{ marginBottom: '32px', color: '#2d3748', lineHeight: '1.7', fontSize: '15px' }}>
          <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, color: '#111', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px' }}>
            4. Non-Affiliation &amp; Trademark Notice
          </h2>
          <p>
            All brand names, publisher trademarks, service marks, and trade designations (including <em>The Times of India</em>, <em>The Indian Express</em>, <em>NDTV</em>, <em>Hindustan Times</em>, and <em>Airtel</em>) are the registered property of their respective corporate owners. Use of these names on Newspaper Pro does not denote or imply any affiliation, sponsorship, endorsement, or commercial joint venture.
          </p>
        </section>

        {/* Section 5: Notice & Takedown Policy */}
        <section style={{ marginBottom: '40px', color: '#2d3748', lineHeight: '1.7', fontSize: '15px' }}>
          <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, color: '#111', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px' }}>
            5. Notice &amp; Takedown Policy (24-Hour SLA)
          </h2>
          <p style={{ marginBottom: '12px' }}>
            We strictly respect the intellectual property rights of all content publishers and journalists. If you are an authorized copyright holder or representative and believe that any syndicated summary, text excerpt, or image reference on this site infringes upon your copyright or requires updated credit, please contact our Legal &amp; Editorial Grievance desk:
          </p>
          <div style={{ background: '#f1f5f9', padding: '16px 20px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#0f172a' }}>
              <i className="fa-solid fa-envelope" style={{ color: '#4db2ec', marginRight: '8px' }}></i>
              Email: <a href="mailto:editorial@newspaperpro.com" style={{ color: '#4db2ec', textDecoration: 'underline' }}>editorial@newspaperpro.com</a>
            </p>
            <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>
              Please include the article URL, specific material in question, and proof of representation. Our team will review and honor takedown or modification requests within 24 business hours.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
