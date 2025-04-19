import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../../src/components/pages/LoginPage.vue';
import { ref, computed } from 'vue';

// Mock dependencies before they are imported
vi.mock('../../src/services/api.service', () => ({
  apiService: {
    login: vi.fn()
  }
}));

vi.mock('../../src/stores/AuthStore', () => ({
  useAuthStore: vi.fn()
}));

// Create mock routes for testing
const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/login', component: LoginPage },
  { path: '/register', component: { template: '<div>Register</div>' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Import mocked functions AFTER vi.mock calls
import { apiService } from '../../src/services/api.service';
import { useAuthStore } from '../../src/stores/AuthStore';

describe('LoginPage.vue', () => {
  // Mock store functions
  const mockSetUser = vi.fn();
  const mockSetToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up auth store mock with a more complete structure
    vi.mocked(useAuthStore).mockReturnValue({
      token: ref(null),
      user: ref(null),
      isAuthenticated: computed(() => false),
      setToken: mockSetToken,
      setUser: mockSetUser,
      logout: vi.fn(),
      $id: 'auth',
      $reset: vi.fn(),
      $dispose: vi.fn(),
      $state: {},
      $patch: vi.fn(),
      $subscribe: vi.fn(),
      _p: undefined,
      _s: undefined,
      _customProperties: new Set()
    } as unknown as ReturnType<typeof useAuthStore>);

    router.push('/login');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the login form', () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.find('h1').text()).toBe('Welcome Back');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.findAll('input').length).toBe(3); // username, password, and remember me
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('has a link to register page', async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    // In the mounted component, router-link is rendered as an <a> element
    const registerLink = wrapper.find('a');
    expect(registerLink.exists()).toBe(true);
    expect(registerLink.text()).toBe('Register');
  });

  it('validates the form and shows errors when form is submitted with empty fields', async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    const errorMessage = wrapper.find('.bg-destructive\\/10');
    expect(errorMessage.exists()).toBe(true);
    expect(errorMessage.text()).toContain('Username and password are required');
  });

  it('calls login API when form is submitted with valid data', async () => {
    // Mock successful login API response
    vi.mocked(apiService.login).mockResolvedValueOnce({
      token: 'fake-token',
      user: {
        uid: 123,
        username: 'testuser',
        created_at: '2025-04-01T12:00:00.000Z'
      }
    });
    
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    // Fill in form fields
    const usernameInput = wrapper.find('input#username');
    const passwordInput = wrapper.find('input#password');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('password123');
    
    // Submit the form
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    // Verify API was called with correct data
    expect(apiService.login).toHaveBeenCalledWith('testuser', 'password123');
    
    // Verify store actions were called
    expect(mockSetToken).toHaveBeenCalledWith('fake-token', false);
    expect(mockSetUser).toHaveBeenCalledWith({
      token: 'fake-token',
      user: {
        uid: 123,
        username: 'testuser',
        created_at: '2025-04-01T12:00:00.000Z'
      }
    }, false);
    
    // Check that we navigate to home page
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('shows error message when login fails', async () => {
    // Mock failed login API response
    vi.mocked(apiService.login).mockRejectedValueOnce(new Error('Invalid credentials'));
    
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    // Fill in form fields
    const usernameInput = wrapper.find('input#username');
    const passwordInput = wrapper.find('input#password');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('wrongpassword');
    
    // Submit the form
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    // Verify error message is displayed
    const errorAlert = wrapper.find('.bg-destructive\\/10');
    expect(errorAlert.exists()).toBe(true);
    expect(errorAlert.text()).toContain('Invalid credentials');
    
    // Verify we stay on login page
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('handles remember me functionality', async () => {
    // Mock successful login API response
    vi.mocked(apiService.login).mockResolvedValueOnce({
      token: 'fake-token',
      user: {
        uid: 123,
        username: 'testuser',
        created_at: '2025-04-01T12:00:00.000Z'
      }
    });
    
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    // Fill in form fields and check remember me
    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('password123');
    await wrapper.find('input#remember-me').setValue(true);
    
    // Submit the form
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    
    // Verify store actions were called with remember=true
    expect(mockSetToken).toHaveBeenCalledWith('fake-token', true);
    expect(mockSetUser).toHaveBeenCalledWith({
      token: 'fake-token',
      user: {
        uid: 123,
        username: 'testuser',
        created_at: '2025-04-01T12:00:00.000Z'
      }
    }, true);
  });
});
