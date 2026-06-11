function ThesisStatements({ items, emptyLabel }) {
  if (!items?.length) {
    return <div className="small text-muted">{emptyLabel}</div>;
  }
  return (
    <ul className="thesis-statement-list">
      {items.map((item, idx) => (
        <li key={item.factorKey || item.source || idx}>
          {item.text || item.rebuttal || item.statement}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children, defaultOpen = false }) {
  return (
    <details className="st-details thesis-section" open={defaultOpen}>
      <summary className="st-details-summary">{title}</summary>
      <div className="thesis-section-body">{children}</div>
    </details>
  );
}

export default function ThesisPanel({ thesisData, loading = false }) {
  if (loading) {
    return <div className="research-chart-empty">Loading thesis…</div>;
  }

  if (!thesisData) {
    return <div className="research-chart-empty">No thesis available for this ticker.</div>;
  }

  const sections = thesisData.sections || {};
  const preMortem = sections.preMortem || {};
  const coverage = sections.evidenceCoverage || {};
  const independence = sections.signalIndependence || {};
  const notice = thesisData.disqualificationNotice || {};
  const disqualified = Boolean(thesisData.disqualified);

  return (
    <div className="thesis-panel">
      {disqualified && (
        <div className="thesis-disqualified-banner">
          Disqualified — gate failure. Pre-mortem is the primary output.
          {(notice.failedGates || []).length > 0 && (
            <div className="small text-muted mt-1">
              Failed gates: {(notice.failedGates || []).join(', ')}
            </div>
          )}
        </div>
      )}

      <Section title={preMortem.headline || 'Pre-mortem'} defaultOpen>
        <ThesisStatements items={preMortem.statements} emptyLabel="No pre-mortem statements." />
      </Section>

      {!disqualified && (
        <>
          <Section title="Bear case">
            <ThesisStatements items={sections.bearCase} emptyLabel="No bear factors with evidence." />
          </Section>

          <Section title="Bull case (rebuttal)">
            {sections.bullCase?.length ? (
              <ul className="thesis-statement-list">
                {sections.bullCase.map((item, idx) => (
                  <li key={item.factorKey || idx}>
                    {item.addressesBear && (
                      <span className="thesis-rebuttal-context small text-muted">
                        Re: {item.addressesBear}
                        <br />
                      </span>
                    )}
                    {item.rebuttal}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="small text-muted">No bull rebuttals with evidence.</div>
            )}
          </Section>

          <Section title="Valuation assessment">
            <p className="thesis-valuation-summary">{sections.valuationAssessment?.summary}</p>
            {sections.valuationAssessment?.assumptions?.length > 0 && (
              <ul className="thesis-statement-list">
                {sections.valuationAssessment.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Catalyst watchlist">
            {sections.catalystWatchlist?.length ? (
              <ul className="thesis-watchlist">
                {sections.catalystWatchlist.map((item) => (
                  <li key={`${item.type}-${item.direction}`}>
                    <strong>{item.type}</strong>
                    {' · '}
                    {item.direction}
                    {' · '}
                    {item.dataBasis}
                    {' · '}
                    {item.horizon}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="small text-muted">No catalysts observed.</div>
            )}
          </Section>

          <Section title="Disconfirming conditions">
            <ThesisStatements
              items={(sections.disconfirmingConditions || []).map((item) => ({
                text: item.text,
                factorKey: item.factorKey,
              }))}
              emptyLabel="No disconfirming conditions."
            />
          </Section>

          <Section title="Evidence coverage & signal independence">
            <div className="thesis-meta-grid">
              <div>
                <div className="small text-muted">Evidence coverage (overall)</div>
                <div className="st-num">{Math.round((coverage.overall || 0) * 100)}%</div>
              </div>
              <div>
                <div className="small text-muted">Orthogonal signal classes</div>
                <div className="st-num">{independence.orthogonalClassCount ?? '—'}</div>
                <div className="small">{independence.label}</div>
              </div>
            </div>
            {independence.description && (
              <p className="small text-muted mt-1">{independence.description}</p>
            )}
            {independence.warning && (
              <p className="thesis-warning small">{independence.warning}</p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
