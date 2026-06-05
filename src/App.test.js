import API_ENDPOINTS from './apiConfig';

test('exposes admin api endpoints', () => {
  expect(API_ENDPOINTS.ADMIN_STATUS).toBe('/api/admin/status');
  expect(API_ENDPOINTS.ADMIN_BOOTSTRAP).toBe('/api/admin/bootstrap');
});
