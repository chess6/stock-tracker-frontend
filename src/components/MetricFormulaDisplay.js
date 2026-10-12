/**
 * Renders structured formula trees (ratio bars, sums, weighted models, etc.).
 */

function Label({ node }) {
  if (!node?.text) return null;
  return <span className="st-formula-label">{node.text}</span>;
}

function Group({ node, renderNode }) {
  return (
    <span className="st-formula-group">
      <span className="st-formula-paren">(</span>
      {renderNode(node.inner)}
      <span className="st-formula-paren">)</span>
    </span>
  );
}

function RatioStack({ num, den, renderNode }) {
  return (
    <span className="st-metric-fraction-stack">
      <span className="st-metric-fraction-num st-num">{renderNode(num)}</span>
      <span className="st-metric-fraction-bar" aria-hidden="true" />
      <span className="st-metric-fraction-den st-num">{renderNode(den)}</span>
    </span>
  );
}

function Ratio({ node, result, renderNode }) {
  return (
    <span className="st-metric-fraction">
      <RatioStack num={node.num} den={node.den} renderNode={renderNode} />
      {result ? (
        <span className="st-metric-fraction-eq st-num">
          =
          {' '}
          {result}
        </span>
      ) : null}
    </span>
  );
}

function Difference({ node, renderNode }) {
  return (
    <span className="st-formula-difference">
      <span className="st-formula-difference-term">{renderNode(node.left)}</span>
      <span className="st-formula-operator" aria-hidden="true">−</span>
      <span className="st-formula-difference-term">{renderNode(node.right)}</span>
      {node.note ? <span className="st-formula-note">({node.note})</span> : null}
    </span>
  );
}

function Sum({ node, renderNode }) {
  return (
    <span className="st-formula-sum">
      {node.terms.map((term, idx) => (
        <span key={`${term.text || idx}-${idx}`} className="st-formula-sum-term">
          {idx > 0 && (
            <span className="st-formula-operator" aria-hidden="true">
              {term.sign === '-' ? '−' : '+'}
            </span>
          )}
          {renderNode(term)}
        </span>
      ))}
      {node.note ? <span className="st-formula-note">({node.note})</span> : null}
    </span>
  );
}

function Product({ node, renderNode }) {
  return (
    <span className="st-formula-product">
      {node.factors.map((factor, idx) => (
        <span key={`factor-${idx}`} className="st-formula-product-factor">
          {idx > 0 && <span className="st-formula-operator" aria-hidden="true">×</span>}
          {renderNode(factor)}
        </span>
      ))}
    </span>
  );
}

function WeightedSum({ node, renderNode }) {
  return (
    <span className="st-formula-weighted-sum">
      {node.terms.map((term, idx) => (
        <span key={`${term.coef}-${idx}`} className="st-formula-weighted-term">
          {idx > 0 && <span className="st-formula-operator" aria-hidden="true">+</span>}
          <span className="st-formula-coef st-num">{term.coef}</span>
          <span className="st-formula-operator" aria-hidden="true">×</span>
          <RatioStack num={term.num} den={term.den} renderNode={renderNode} />
        </span>
      ))}
    </span>
  );
}

function Alternatives({ node, renderNode }) {
  return (
    <span className="st-formula-alternatives">
      {node.options.map((option, idx) => (
        <span key={`alt-${idx}`} className="st-formula-alternative">
          {idx > 0 && <span className="st-formula-alt-sep">or</span>}
          {renderNode(option)}
        </span>
      ))}
    </span>
  );
}

function Text({ node }) {
  return <span className="st-formula-text">{node.text}</span>;
}

export default function MetricFormulaDisplay({ spec, result }) {
  if (!spec) return null;

  const renderNode = (node) => {
    if (!node) return null;
    switch (node.type) {
      case 'label':
        return <Label node={node} />;
      case 'group':
        return <Group node={node} renderNode={renderNode} />;
      case 'ratio':
        return <Ratio node={node} result={result} renderNode={renderNode} />;
      case 'difference':
        return <Difference node={node} renderNode={renderNode} />;
      case 'sum':
        return <Sum node={node} renderNode={renderNode} />;
      case 'product':
        return <Product node={node} renderNode={renderNode} />;
      case 'weighted_sum':
        return <WeightedSum node={node} renderNode={renderNode} />;
      case 'alternatives':
        return <Alternatives node={node} renderNode={renderNode} />;
      case 'text':
      default:
        return <Text node={node} />;
    }
  };

  return (
    <span className="st-formula-display">
      {renderNode(spec)}
    </span>
  );
}
