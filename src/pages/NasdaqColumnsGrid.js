import React, { useEffect, useState, useMemo } from 'react';
import indicatorData from '../mock/sharadar_indicators.json';
import examplesData from '../mock/sharadar_examples.json';
import DataGrid from '../components/DataGrid';
import { formatUsd, formatDecimal, formatPercent, formatShares } from '../utils/formatters';

const extractFormula = (description) => {
    if (!description) return '';
  
    let formula = '';
    const patterns = [
      /calculated as (.+)/i,
      /measures the difference between \[(.*?)] and \[(.*?)]/i,
      /measures the ratio between \[(.*?)] and \[(.*?)]/i,
      /dividing \[(.*?)] by \[(.*?)]/i,
    ];
  
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        if (pattern.source.includes('difference between')) {
          formula = `${match[1]} - ${match[2]}`;
        } else if (pattern.source.includes('ratio between') || pattern.source.includes('dividing')) {
          formula = `${match[1]} / ${match[2]}`;
        } else if (pattern.source.includes('calculated as')) {
          formula = match[1];
          formula = formula.replace(/plus/ig, '+').replace(/minus/ig, '-').replace(/\[(.*?)\]/g, (m, p1) => p1.toLowerCase());
        }
        return formula.toLowerCase().replace(/[[\].]/g, '');
      }
    }
  
    return '';
  };

function NasdaqColumnsGrid() {
    const [groupedColumns, setGroupedColumns] = useState({});
    const [tableDescriptions, setTableDescriptions] = useState({});
    const [examples, setExamples] = useState({});
    // Shared controls across all DataGrids on this page
    const sharedColumnKeys = ['indicator','title','description','unittype','formula','example'];
    const [gridColumnVisibility, setGridColumnVisibility] = useState(sharedColumnKeys);
    const [gridColumnSizing, setGridColumnSizing] = useState({});

    useEffect(() => {
        const data = indicatorData.datatable.data;
        const columnsInfo = indicatorData.datatable.columns;

        const colObjects = data.map(row => {
            const obj = {};
            columnsInfo.forEach((col, i) => {
                obj[col.name] = row[i];
            });
            obj.formula = extractFormula(obj.description);
            return obj;
        });

        const descriptions = {};
        const grouped = colObjects.reduce((acc, col) => {
            if (col.table === 'TABLE-DESCRIPTIONS') {
                descriptions[col.indicator] = col.description;
                return acc;
            }
            if (!acc[col.table]) {
                acc[col.table] = [];
            }
            acc[col.table].push(col);
            return acc;
        }, {});

        // Sort indicators within each group
        for (const table in grouped) {
            grouped[table].sort((a, b) => a.indicator.localeCompare(b.indicator));
        }

        setGroupedColumns(grouped);
        setTableDescriptions(descriptions);

        // Aggregate examples from sharadar_examples.json
        const allExamples = {};
        Object.entries(examplesData).forEach(([table, tableData]) => {
            if (tableData?.datatable?.columns && tableData?.datatable?.data?.length > 0) {
                const cols = tableData.datatable.columns.map(c => c.name);
                const row = tableData.datatable.data[0];
                allExamples[table] = {};
                cols.forEach((colName, idx) => {
                    allExamples[table][colName] = row[idx];
                });
            }
        });
        setExamples(allExamples);

    }, []);

    const formatExample = (name, value) => {
        if (value === null || value === undefined) return '';
        const usdFields = ['accoci', 'assets', 'assetsavg', 'assetsc', 'assetsnc', 'cashneq', 'cashnequsd', 'debt', 'debtc', 'debtnc', 'debtusd', 'deferredrev', 'equity', 'equityavg', 'equityusd', 'ev', 'fcf', 'gp', 'intangibles', 'inventory', 'investments', 'investmentsc', 'investmentsnc', 'liabilities', 'liabilitiesc', 'liabilitiesnc', 'marketcap', 'ncf', 'ncfbus', 'ncfcommon', 'ncfdebt', 'ncfdiv', 'ncff', 'ncfi', 'ncfinv', 'ncfo', 'netinc', 'netinccmn', 'netinccmnusd', 'netincdis', 'netincnci', 'opex', 'opinc', 'payables', 'ppnenet', 'prefdivis', 'receivables', 'retearn', 'revenue', 'revenueusd', 'rnd', 'sbcomp', 'sgna', 'tangibles', 'taxassets', 'taxexp', 'taxliabilities', 'workingcapital', 'capex', 'depamor', 'deposits', 'intexp', 'invcap', 'invcapavg', 'cor', 'consolinc', 'ebit', 'ebitda', 'ebitdausd', 'ebitusd', 'ebt'];
        const sharesFields = ['sharesbas', 'shareswa', 'shareswadil'];
        const percentFields = ['assetturnover', 'currentratio', 'de', 'divyield', 'ebitdamargin', 'fcfps', 'grossmargin', 'netmargin', 'payoutratio', 'pb', 'pe', 'pe1', 'ps', 'ps1', 'roa', 'roe', 'roic', 'ros', 'sharefactor', 'evebitda', 'tbvps'];
        const decimalFields = ['bvps', 'eps', 'epsdil', 'epsusd', 'price', 'sps', 'evebit', 'evebitda', 'fcfps', 'pb', 'pe', 'pe1', 'ps', 'ps1', 'tbvps', 'fxusd'];

        if (usdFields.includes(name)) return formatUsd(value, 0);
        if (sharesFields.includes(name)) return formatShares(value);
        if (percentFields.includes(name)) return formatPercent(value);
        if (decimalFields.includes(name)) return formatDecimal(value);
        if (name.toLowerCase().includes('date')) return String(value);
        if (typeof value === 'string') return value;
        return String(value);
    };

    const columns = useMemo(() => [
        { accessorKey: 'indicator', header: 'Indicator', cell: info => <code>{info.getValue()}</code>, size: 150 },
        { accessorKey: 'title', header: 'Title', size: 250 },
        { accessorKey: 'description', header: 'Description', size: 600 },
        { accessorKey: 'unittype', header: 'Unit Type', size: 120 },
        {
            accessorKey: 'example',
            header: 'Example',
            cell: ({ row }) => {
                const indicator = row.original.indicator;
                const table = row.original.table;
                if (examples[table] && examples[table][indicator] !== undefined) {
                    return formatExample(indicator, examples[table][indicator]);
                }
                return '';
            },
            size: 150
        },
        { accessorKey: 'formula', header: 'Formula', cell: info => <code>{info.getValue()}</code>, size: 200 }
    ], [examples]);

    // Table of contents anchor
    const tocId = "nasdaq-toc";
    const tableNames = Object.keys(groupedColumns).sort();
    return (
        <div className="container-fluid col-lg-10 mt-4">
            <span id={tocId} />
            <h2>Column Reference</h2>
            <p className="text-muted">
              Legacy field glossary from the original Nasdaq Data Link (SHARADAR) export.
              Live portfolio metrics are computed from SEC EDGAR and cached prices — see column help (<code>?</code>) on the portfolio grid.
            </p>
            {/* Table of Contents */}
            <nav className="mb-4">
                <h5>Contents</h5>
                <ul className="list-unstyled">
                    {tableNames.map(table => (
                        <li key={table} className="mb-1">
                            <a href={`#section-${table}`} className="text-primary text-decoration-underline">
                                {table}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
            {tableNames.map(table => (
                <div key={table} className="mt-1">
                    <span id={`section-${table}`} />
                    <h3>
                        {table}
                        {' '}
                        <a href={`#${tocId}`} className="ms-2 text-secondary text-decoration-underline" style={{ fontSize: '0.8em' }} title="Back to top">
                            [back to top]
                        </a>
                    </h3>
                    <p>{tableDescriptions[table]}</p>
                    <DataGrid
                        columns={columns}
                        data={groupedColumns[table]}
                        getRowId={(row) => row.indicator}
                        enableRowSelection={false}
                        enableMultiRowSelection={false}
                        fixedColumnWidth={true}
                        tableClassName="table table-sm table-bordered nasdaq-columns-grid-table"
                        // Share column visibility and sizing across all grids on this page
                        useSharedColumnState={true}
                        columnVisibility={gridColumnVisibility}
                        onColumnVisibilityChange={setGridColumnVisibility}
                        columnSizing={gridColumnSizing}
                        onColumnSizingChange={setGridColumnSizing}
                    />
                </div>
            ))}
        </div>
    );
}

export default NasdaqColumnsGrid;
