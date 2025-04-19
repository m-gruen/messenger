import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import RegisterPage from '../../src/components/pages/RegisterPage.vue';
import { ref, computed } from 'vue';

// First, mock the modules before using any variables
vi.mock('../../src/stores/AuthStore', () => ({
    useAuthStore: vi.fn()
}));

vi.mock('../../src/services/api.service', () => ({
    apiService: {
        register: vi.fn()
    }
}));

// Set up environment for testing
process.env.NODE_ENV = 'test';

// Create mock routes for testing
const routes = [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/register', component: RegisterPage },
    { path: '/login', component: { template: '<div>Login</div>' } }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

import { useAuthStore } from '../../src/stores/AuthStore';
import { apiService } from '../../src/services/api.service';

describe('RegisterPage.vue', () => {
    const mockSetToken = vi.fn();
    const mockSetUser = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        
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
        
        router.push('/register');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('renders the register page correctly', async () => {
        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        expect(wrapper.find('h1').text()).toBe('Create Account');
        expect(wrapper.find('input#username').exists()).toBe(true);
        expect(wrapper.find('input#password').exists()).toBe(true);
        expect(wrapper.find('input#confirmPassword').exists()).toBe(true);
        expect(wrapper.find('input#remember-me').exists()).toBe(true);
        expect(wrapper.find('button[type="submit"]').text()).toBe('Register');
    });

    it('displays validation error when form is submitted with empty fields', async () => {
        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Username and password are required');
        expect(apiService.register).not.toHaveBeenCalled();
    });

    it('displays validation error when passwords do not match', async () => {
        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('input#username').setValue('testuser');
        await wrapper.find('input#password').setValue('password123');
        await wrapper.find('input#confirmPassword').setValue('differentpassword');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Passwords do not match');
        expect(apiService.register).not.toHaveBeenCalled();
    });

    it('handles successful registration and login flow', async () => {
        const mockUser = {
            uid: 123,
            username: 'newuser',
            created_at: '2025-04-01T12:00:00.000Z',
            token: 'new-user-token'
        };

        // Mock the api service register method
        vi.mocked(apiService.register).mockResolvedValue(mockUser);

        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('input#username').setValue('newuser');
        await wrapper.find('input#password').setValue('password123');
        await wrapper.find('input#confirmPassword').setValue('password123');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        // Verify the API was called with correct params
        expect(apiService.register).toHaveBeenCalledWith('newuser', 'password123');
        
        // Verify auth store methods were called
        expect(mockSetToken).toHaveBeenCalledWith('new-user-token', false);
        expect(mockSetUser).toHaveBeenCalledWith(mockUser, false);

        // Check for navigation to home page
        expect(router.currentRoute.value.path).toBe('/');
    });

    it('handles registration with remember me checked', async () => {
        const mockUser = {
            uid: 123,
            username: 'newuser',
            created_at: '2025-04-01T12:00:00.000Z',
            token: 'new-user-token'
        };

        // Mock the api service register method
        vi.mocked(apiService.register).mockResolvedValue(mockUser);

        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('input#username').setValue('newuser');
        await wrapper.find('input#password').setValue('password123');
        await wrapper.find('input#confirmPassword').setValue('password123');
        await wrapper.find('input#remember-me').setValue(true);
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();
        
        // Verify auth store methods were called with remember=true
        expect(mockSetToken).toHaveBeenCalledWith('new-user-token', true);
        expect(mockSetUser).toHaveBeenCalledWith(mockUser, true);
    });

    it('handles registration failure correctly', async () => {
        // Mock the api service register method to reject with an error
        vi.mocked(apiService.register).mockRejectedValue(new Error('Username already taken'));

        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('input#username').setValue('existinguser');
        await wrapper.find('input#password').setValue('password123');
        await wrapper.find('input#confirmPassword').setValue('password123');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        // Verify error is displayed correctly
        expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Username already taken');
        expect(router.currentRoute.value.path).toBe('/register');
    });

    it('shows loading state during registration process', async () => {
        // Create a delayed promise for the registration
        let resolvePromise;
        const registerPromise = new Promise(resolve => {
            resolvePromise = resolve;
        });

        const mockUser = {
            uid: 123,
            username: 'newuser',
            created_at: '2025-04-01T12:00:00.000Z',
            token: 'new-user-token'
        };

        // Mock the api service register method with delayed resolution
        vi.mocked(apiService.register).mockImplementation(() => registerPromise);

        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('input#username').setValue('newuser');
        await wrapper.find('input#password').setValue('password123');
        await wrapper.find('input#confirmPassword').setValue('password123');

        // Submit form but don't wait for promise to resolve
        const formSubmit = wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        // Check loading state is shown
        expect(wrapper.find('button[type="submit"]').text()).toContain('Registering...');
        expect(wrapper.find('svg.animate-spin').exists()).toBe(true);

        // Now resolve the promise
        resolvePromise(mockUser);
        
        // Wait for the promise to resolve and UI to update
        await formSubmit;
        await flushPromises();
    });

    it('navigates to login page when login link is clicked', async () => {
        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('a[href="/login"]').trigger('click');
        await flushPromises();
        await router.isReady();
        
        expect(router.currentRoute.value.path).toBe('/login');
    });

    it('handles network error gracefully', async () => {
        // Mock the api service register method to reject with a network error
        vi.mocked(apiService.register).mockRejectedValue(new Error('Network error'));

        const wrapper = mount(RegisterPage, {
            global: {
                plugins: [router]
            }
        });

        await wrapper.find('input#username').setValue('newuser');
        await wrapper.find('input#password').setValue('password123');
        await wrapper.find('input#confirmPassword').setValue('password123');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        // Verify error is displayed correctly
        expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Network error');
        expect(router.currentRoute.value.path).toBe('/register');
    });
});
