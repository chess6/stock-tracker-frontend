import API_ENDPOINTS from './apiConfig';

test('exposes admin api endpoints', () => {
  expect(API_ENDPOINTS.ADMIN_STATUS).toBe('/api/admin/status');
  expect(API_ENDPOINTS.ADMIN_CONFIG).toBe('/api/admin/config');
  expect(API_ENDPOINTS.ADMIN_PIPELINE_STATUS).toBe('/api/admin/pipeline-status');
  expect(API_ENDPOINTS.RESEARCH_SCREEN).toBe('/api/research/screen');
  expect(API_ENDPOINTS.ADMIN_BOOTSTRAP).toBe('/api/admin/bootstrap');
});
