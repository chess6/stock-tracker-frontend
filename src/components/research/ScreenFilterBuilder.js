import { useState } from 'react';
import {
  SCREEN_FILTER_OPS,
  createEmptyFilter,
  createEmptyGroup,
  formatScreenFilter,
} from '../../config/screenPresets';

function FilterRow({ filter, groupIndex, filterIndex, onChange, onRemove, canRemove }) {
  return (
    <div className="screen-filter-row d-flex flex-wrap align-items-center gap-2">
      <input
        type="text"
        className="form-control form-control-sm screen-filter-metric"
        placeholder="metric"
        value={filter.metric}
        onChange={(e) => onChange(groupIndex, filterIndex, { metric: e.target.value })}
        aria-label="Filter metric"
      />
      <select
        className="form-select form-select-sm screen-filter-op"
        value={filter.op}
        onChange={(e) => onChange(groupIndex, filterIndex, { op: e.target.value })}
        aria-label="Filter operator"
      >
        {SCREEN_FILTER_OPS.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
      <input
        type="text"
        className="form-control form-control-sm screen-filter-value"
        placeholder="value"
        value={filter.value}
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = raw === '' ? '' : Number.isNaN(Number(raw)) ? raw : Number(raw);
          onChange(groupIndex, filterIndex, { value: parsed });
        }}
        aria-label="Filter value"
      />
      {canRemove && (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onRemove(groupIndex, filterIndex)}
          aria-label="Remove filter"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function ScreenFilterBuilder({ groups, onChange }) {
  const [collapsed, setCollapsed] = useState({});

  const updateGroup = (groupIndex, patch) => {
    onChange(groups.map((group, idx) => (idx === groupIndex ? { ...group, ...patch } : group)));
  };

  const updateFilter = (groupIndex, filterIndex, patch) => {
    onChange(groups.map((group, gIdx) => {
      if (gIdx !== groupIndex) return group;
      return {
        ...group,
        filters: group.filters.map((filter, fIdx) => (
          fIdx === filterIndex ? { ...filter, ...patch } : filter
        )),
      };
    }));
  };

  const addFilter = (groupIndex) => {
    onChange(groups.map((group, idx) => (
      idx === groupIndex
        ? { ...group, filters: [...group.filters, createEmptyFilter()] }
        : group
    )));
  };

  const removeFilter = (groupIndex, filterIndex) => {
    onChange(groups.map((group, gIdx) => {
      if (gIdx !== groupIndex) return group;
      const nextFilters = group.filters.filter((_, fIdx) => fIdx !== filterIndex);
      return { ...group, filters: nextFilters.length ? nextFilters : [createEmptyFilter()] };
    }));
  };

  const addGroup = () => {
    onChange([...groups, createEmptyGroup('AND')]);
  };

  const removeGroup = (groupIndex) => {
    if (groups.length <= 1) return;
    onChange(groups.filter((_, idx) => idx !== groupIndex));
  };

  const toggleCollapsed = (groupIndex) => {
    setCollapsed((prev) => ({ ...prev, [groupIndex]: !prev[groupIndex] }));
  };

  return (
    <div className="screen-filter-builder">
      {groups.map((group, groupIndex) => {
        const isCollapsed = collapsed[groupIndex];
        const summary = group.filters
          .filter((filter) => filter.metric)
          .map((filter) => formatScreenFilter(filter))
          .join(group.op === 'OR' ? ' OR ' : ' AND ') || 'No filters';

        return (
          <div key={`group-${groupIndex}`} className="screen-filter-group">
            <div className="screen-filter-group-header d-flex flex-wrap align-items-center gap-2">
              <button
                type="button"
                className="btn btn-link btn-sm screen-filter-group-toggle p-0"
                onClick={() => toggleCollapsed(groupIndex)}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? '▸' : '▾'}
                {' '}
                Group
                {' '}
                {groupIndex + 1}
              </button>
              <select
                className="form-select form-select-sm screen-filter-group-op"
                value={group.op}
                onChange={(e) => updateGroup(groupIndex, { op: e.target.value })}
                aria-label={`Group ${groupIndex + 1} operator`}
              >
                <option value="AND">AND (all must pass)</option>
                <option value="OR">OR (any may pass)</option>
              </select>
              {isCollapsed && (
                <span className="small text-muted screen-filter-group-summary">{summary}</span>
              )}
              {groups.length > 1 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm ms-auto"
                  onClick={() => removeGroup(groupIndex)}
                >
                  Remove group
                </button>
              )}
            </div>
            {!isCollapsed && (
              <div className="screen-filter-group-body">
                {group.filters.map((filter, filterIndex) => (
                  <FilterRow
                    key={`filter-${groupIndex}-${filterIndex}`}
                    filter={filter}
                    groupIndex={groupIndex}
                    filterIndex={filterIndex}
                    onChange={updateFilter}
                    onRemove={removeFilter}
                    canRemove={group.filters.length > 1}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={() => addFilter(groupIndex)}
                >
                  Add filter
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm mt-2"
        onClick={addGroup}
      >
        Add filter group
      </button>
      {groups.length > 1 && (
        <p className="small text-muted mb-0 mt-2">
          Groups are combined with AND — each group must pass for a ticker to match.
        </p>
      )}
    </div>
  );
}
