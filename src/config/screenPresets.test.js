import {
  DEFAULT_SCREEN_PRESET_ID,
  SCREEN_DEFAULT_VISIBLE_COLUMNS,
  SCREEN_PRESETS,
  buildDefaultVisibleColumns,
  buildScreenRequestSpec,
  formatScreenFilter,
  getScreenPreset,
  groupsFromSpec,
  metricToColumnId,
} from './screenPresets';

describe('screenPresets', () => {
  it('exposes eleven built-in presets', () => {
    expect(SCREEN_PRESETS).toHaveLength(11);
    expect(getScreenPreset(DEFAULT_SCREEN_PRESET_ID).id).toBe('deep_value');
  });

  it('formats filter specs for display', () => {
    expect(formatScreenFilter({ metric: 'pb', op: 'lt', value: 0.7 })).toBe('pb < 0.7');
    expect(formatScreenFilter({ metric: 'buy6m', op: 'gte', value: 500000 })).toBe('buy6m ≥ 500000');
  });

  it('each preset has universe, filters, and sort', () => {
    SCREEN_PRESETS.forEach((preset) => {
      expect(preset.spec.universe).toBeTruthy();
      expect(preset.spec.filters.length).toBeGreaterThan(0);
      expect(preset.spec.sort?.metric).toBeTruthy();
    });
  });

  it('groupsFromSpec wraps legacy flat filters as a single AND group', () => {
    const groups = groupsFromSpec({
      filters: [{ metric: 'pb', op: 'lt', value: 0.7 }],
    });
    expect(groups).toEqual([
      { op: 'AND', filters: [{ metric: 'pb', op: 'lt', value: 0.7 }] },
    ]);
  });

  it('buildDefaultVisibleColumns keeps standard columns and adds filter metrics', () => {
    const insiderCols = buildDefaultVisibleColumns(
      groupsFromSpec(getScreenPreset('insider_accumulation').spec),
      getScreenPreset('insider_accumulation').spec.sort,
    );
    SCREEN_DEFAULT_VISIBLE_COLUMNS.forEach((colId) => {
      expect(insiderCols).toContain(colId);
    });
    expect(insiderCols).toContain('buy6m');
    expect(insiderCols).toContain('cluster_count');
  });

  it('every preset includes standard columns plus filter and sort metric columns', () => {
    SCREEN_PRESETS.forEach((preset) => {
      const groups = groupsFromSpec(preset.spec);
      const visible = buildDefaultVisibleColumns(groups, preset.spec.sort);
      SCREEN_DEFAULT_VISIBLE_COLUMNS.forEach((colId) => {
        expect(visible).toContain(colId);
      });
      const expectedMetrics = new Set([
        ...preset.spec.filters.map((f) => f.metric),
        preset.spec.sort?.metric,
      ].filter(Boolean));
      expectedMetrics.forEach((metric) => {
        expect(visible).toContain(metricToColumnId(metric));
      });
    });
  });

  it('buildScreenRequestSpec emits filter_groups and drops empty filters', () => {
    const spec = buildScreenRequestSpec({
      universe: 'sp500',
      filterGroups: [
        {
          op: 'OR',
          filters: [
            { metric: 'buy6m', op: 'gte', value: 500000 },
            { metric: '', op: 'gte', value: 0 },
          ],
        },
      ],
      sort: { metric: 'pb', dir: 'asc' },
      limit: 50,
    });
    expect(spec).toEqual({
      universe: 'sp500',
      filter_groups: [
        {
          op: 'OR',
          filters: [{ metric: 'buy6m', op: 'gte', value: 500000 }],
        },
      ],
      sort: { metric: 'pb', dir: 'asc' },
      limit: 50,
    });
  });
});
