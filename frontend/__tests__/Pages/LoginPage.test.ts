import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../../src/components/pages/LoginPage.vue';


const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/register', component: { template: '<div>Register</div>' } },
  { path: '/login', component: LoginPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});


vi.mock('../../src/stores/AuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    setToken: vi.fn(),
    setUser: vi.fn(),
    token: null
  }))
}));


vi.mock('../../src/lib/config', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:3000')
}));

describe('LoginPage.vue', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };

  global.fetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    router.push('/login');

    
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the login page correctly', async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    expect(wrapper.find('h1').text()).toBe('Welcome Back');
    expect(wrapper.find('input#username').exists()).toBe(true);
    expect(wrapper.find('input#password').exists()).toBe(true);
    expect(wrapper.find('input#remember-me').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Login');
  });

  it('displays validation error when form is submitted with empty fields', async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Username and password are required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles successful login correctly', async () => {
    const mockUser = {
      uid: 123,
      username: 'johndoe',
      created_at: '2025-04-01T12:00:00.000Z',
      token: 'fake-token'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser)
    });

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    
    await wrapper.find('input#username').setValue('johndoe');
    await wrapper.find('input#password').setValue('johndoe');
    
    
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'johndoe',
        password: 'johndoe'
      })
    });
    
    
    const authStore = (await import('../../src/stores/AuthStore')).useAuthStore();
    expect(authStore.setToken).toHaveBeenCalledWith('fake-token', false);
    expect(authStore.setUser).toHaveBeenCalledWith(mockUser, false);
    
    
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('handles login with remember me checked', async () => {
    const mockUser = {
      uid: 123,
      username: 'testuser',
      created_at: '2025-04-01T12:00:00.000Z',
      token: 'fake-token'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser)
    });

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    
    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('password123');
    await wrapper.find('input#remember-me').setValue(true);
    
    
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    
    const authStore = (await import('../../src/stores/AuthStore')).useAuthStore();
    expect(authStore.setToken).toHaveBeenCalledWith('fake-token', true);
    expect(authStore.setUser).toHaveBeenCalledWith(mockUser, true);
  });

  it('handles login failure correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' })
    });

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    
    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('wrongpassword');
    
    
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    
    expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Invalid credentials');
    expect(router.currentRoute.value.path).toBe('/login'); 
  });

  it('shows loading state during login process', async () => {
    
    let resolvePromise;
    const waitForPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    global.fetch = vi.fn().mockImplementation(() => {
      return waitForPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve({
          uid: 123,
          username: 'testuser',
          created_at: '2025-04-01T12:00:00.000Z',
          token: 'fake-token'
        })
      }));
    });

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    
    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('password123');
    
    
    const submitPromise = wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    
    expect(wrapper.find('button[type="submit"]').text()).toContain('Logging in...');
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true);
    
    
    resolvePromise({
      ok: true,
      json: () => Promise.resolve({
        uid: 123,
        username: 'testuser',
        created_at: '2025-04-01T12:00:00.000Z',
        token: 'fake-token'
      })
    });
    
    await submitPromise;
    await flushPromises();
    
    
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('navigates to register page when register link is clicked', async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    await wrapper.find('a[href="/register"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/register');
  });

  it('handles network error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });
    
    
    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('password123');
    
    
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    
    expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Network error');
    expect(router.currentRoute.value.path).toBe('/login'); 
  });
});