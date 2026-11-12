import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './ToastContext';
import { AUTH_REQUIRED_EVENT, AuthProvider } from './AuthContext';
import LoginPage from '../pages/LoginPage';
import OwnerOnly from '../components/OwnerOnly';

jest.mock('axios', () => ({
  interceptors: { response: { use: jest.fn(() => 1) } },
}));

const GUEST = { authRequired: true, authenticated: false, role: 'guest' };
const OWNER = { authRequired: true, authenticated: true, role: 'owner' };

function mockFetch(handler) {
  global.fetch = jest.fn((url, options = {}) => {
    const { status = 200, body = {} } = handler(url, options) || {};
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  });
}

function renderApp(initialPath = '/admin') {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/" element={<div>Portfolio home</div>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<OwnerOnly title="Admin console"><div>Admin tools</div></OwnerOnly>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('owner sign-in', () => {
  it('treats a backend without auth endpoints as open (local mode)', async () => {
    mockFetch(() => ({ status: 404, body: { error: 'not found' } }));
    renderApp('/admin');
    expect(await screen.findByText('Admin tools')).toBeInTheDocument();
  });

  it('shows a sign-in prompt instead of admin tools to guests', async () => {
    mockFetch(() => ({ body: GUEST }));
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admin console' })).toBeInTheDocument();
    expect(screen.queryByText('Admin tools')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('shows the error for a wrong password', async () => {
    mockFetch((url) => (url.endsWith('/auth/login')
      ? { status: 401, body: { error: 'Incorrect password' } }
      : { body: GUEST }));
    renderApp('/login');

    userEvent.type(await screen.findByLabelText('Owner password'), 'nope');
    userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password');
  });

  it('signs in and returns home', async () => {
    let loginBody = null;
    mockFetch((url, options) => {
      if (url.endsWith('/auth/login')) {
        loginBody = JSON.parse(options.body);
        return { body: OWNER };
      }
      return { body: GUEST };
    });
    renderApp('/login');

    userEvent.type(await screen.findByLabelText('Owner password'), 'correct horse');
    userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Portfolio home')).toBeInTheDocument();
    expect(loginBody).toEqual({ password: 'correct horse' });
  });

  it('turns a burst of 401s into a single read-only toast', async () => {
    mockFetch(() => ({ body: GUEST }));
    renderApp('/');
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
      window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
    });

    const toasts = await screen.findAllByText(/read-only demo/i);
    expect(toasts).toHaveLength(1);
  });
});
