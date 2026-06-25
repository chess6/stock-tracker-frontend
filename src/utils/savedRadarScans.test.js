import {
  deleteSavedRadarScan,
  getSavedRadarScans,
  listRadarScanOptions,
  resetSavedRadarScansForTests,
  resolveRadarSelection,
  saveRadarScan,
} from './savedRadarScans';

describe('savedRadarScans', () => {
  beforeEach(() => {
    resetSavedRadarScansForTests();
  });

  it('saves and lists radar scans by lens', () => {
    saveRadarScan({ name: 'My insider scan', lens: 'radar_insider', sourcePresetId: 'insider_conviction' });
    const scans = getSavedRadarScans();
    expect(scans).toHaveLength(1);
    expect(scans[0].name).toBe('My insider scan');
    expect(scans[0].lens).toBe('radar_insider');
  });

  it('resolves preset and saved selections', () => {
    const saved = saveRadarScan({ name: 'Custom', lens: 'radar_unusual' });
    expect(resolveRadarSelection('unusual_volume')?.lens).toBe('radar_unusual');
    expect(resolveRadarSelection(saved.id)?.label).toBe('Custom');
  });

  it('deletes saved scans', () => {
    const saved = saveRadarScan({ name: 'Temp', lens: 'radar_distress' });
    deleteSavedRadarScan(saved.id);
    expect(getSavedRadarScans()).toHaveLength(0);
  });

  it('lists preset and saved option groups', () => {
    saveRadarScan({ name: 'Saved one', lens: 'radar_activist' });
    const { saved, presets } = listRadarScanOptions();
    expect(saved).toHaveLength(1);
    expect(presets.length).toBeGreaterThan(0);
  });
});
