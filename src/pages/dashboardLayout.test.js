import fs from 'fs';
import path from 'path';

const DENSITY_CSS = fs.readFileSync(
  path.join(__dirname, '../styles/density.css'),
  'utf8',
);
const DASHBOARD_PAGE = fs.readFileSync(
  path.join(__dirname, 'DashboardPage.js'),
  'utf8',
);

describe('dashboard layout regression', () => {
  it('assigns portfolio to the left grid column and macro to the right on wide screens', () => {
    expect(DENSITY_CSS).toMatch(/grid-template-areas:\s*"portfolio macro"/);
    expect(DENSITY_CSS).not.toMatch(/grid-template-areas:\s*"macro portfolio"/);
  });

  it('renders the portfolio column before the macro column in markup', () => {
    const portfolioIdx = DASHBOARD_PAGE.indexOf('dashboard-layout__portfolio');
    const macroIdx = DASHBOARD_PAGE.indexOf('dashboard-layout__macro');
    expect(portfolioIdx).toBeGreaterThan(-1);
    expect(macroIdx).toBeGreaterThan(portfolioIdx);
  });

  it('keeps the macro treemap inside the macro column wrapper', () => {
    const macroStart = DASHBOARD_PAGE.indexOf('dashboard-layout__macro');
    const macroEnd = DASHBOARD_PAGE.indexOf('</div>', DASHBOARD_PAGE.indexOf('Macro Treemap'));
    expect(macroStart).toBeGreaterThan(-1);
    expect(macroEnd).toBeGreaterThan(macroStart);
    expect(DASHBOARD_PAGE.slice(macroStart, macroEnd)).toContain('Macro Treemap');
  });
});
