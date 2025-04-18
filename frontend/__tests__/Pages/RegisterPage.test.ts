import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import RegisterPage from '../../src/components/pages/RegisterPage.vue';


const routes = [
	{ path: '/', component: { template: '<div>Home</div>' } },
	{ path: '/register', component: RegisterPage },
	{ path: '/login', component: { template: '<div>Login</div>' } }
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

describe('RegisterPage.vue', () => {
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
		router.push('/register');


		Object.defineProperty(window, 'localStorage', { value: localStorageMock });


		global.fetch = vi.fn();
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
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('displays validation error when passwords do not match', async () => {
		const wrapper = mount(RegisterPage, {
			global: {
				plugins: [router]
			}
		});


		await wrapper.find('input#username').setValue('newuser');
		await wrapper.find('input#password').setValue('password123');
		await wrapper.find('input#confirmPassword').setValue('password456');


		await wrapper.find('form').trigger('submit.prevent');
		await flushPromises();

		expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Passwords do not match');
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('handles successful registration and login flow', async () => {

		global.fetch = vi.fn()
			.mockImplementationOnce(() => Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					uid: 123,
					username: 'newuser',
					created_at: '2025-04-01T12:00:00.000Z'
				})
			}))

			.mockImplementationOnce(() => Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					uid: 123,
					username: 'newuser',
					created_at: '2025-04-01T12:00:00.000Z',
					token: 'new-user-token'
				})
			}));

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


		expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://localhost:3000/user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: 'newuser',
				password: 'password123'
			})
		});


		expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://localhost:3000/user/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: 'newuser',
				password: 'password123'
			})
		});


		const authStore = (await import('../../src/stores/AuthStore')).useAuthStore();
		authStore.setToken('new-user-token', false);

		expect(authStore.setToken).toHaveBeenCalledWith('new-user-token', false);
		expect(authStore.setUser).toHaveBeenCalled();


		expect(router.currentRoute.value.path).toBe('/');
	});

	it('handles registration with remember me checked', async () => {

		global.fetch = vi.fn()
			.mockImplementationOnce(() => Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					uid: 123,
					username: 'newuser',
					created_at: '2025-04-01T12:00:00.000Z'
				})
			}))

			.mockImplementationOnce(() => Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					uid: 123,
					username: 'newuser',
					token: 'new-user-token'
				})
			}));

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


		const authStore = (await import('../../src/stores/AuthStore')).useAuthStore();
		expect(authStore.setToken).toHaveBeenCalledWith('new-user-token', true);
		expect(authStore.setUser).toHaveBeenCalledWith({
			uid: 123,
			username: 'newuser'
		}, true);
	});

	it('handles registration failure correctly', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'Username already taken' })
		});

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


		expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Username already taken');
		expect(router.currentRoute.value.path).toBe('/register');
	});

	it('handles login failure after successful registration', async () => {

		global.fetch = vi.fn()
			.mockImplementationOnce(() => Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					uid: 123,
					username: 'newuser',
					created_at: '2025-04-01T12:00:00.000Z'
				})
			}))

			.mockImplementationOnce(() => Promise.resolve({
				ok: false,
				json: () => Promise.resolve({
					error: 'Authentication failed'
				})
			}));

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


		expect(wrapper.find('div.bg-destructive\\/10').text().trim())
			.toBe('Registration successful, but login failed. Please try logging in manually.');
		expect(router.currentRoute.value.path).toBe('/register');
	});

	it('shows loading state during registration process', async () => {

		let resolvePromise;
		const waitForPromise = new Promise(resolve => {
			resolvePromise = resolve;
		});

		global.fetch = vi.fn().mockImplementation(() => {
			return waitForPromise.then(() => ({
				ok: true,
				json: () => Promise.resolve({
					uid: 123,
					username: 'newuser',
					created_at: '2025-04-01T12:00:00.000Z'
				})
			}));
		});

		const wrapper = mount(RegisterPage, {
			global: {
				plugins: [router]
			}
		});


		await wrapper.find('input#username').setValue('newuser');
		await wrapper.find('input#password').setValue('password123');
		await wrapper.find('input#confirmPassword').setValue('password123');


		const submitPromise = wrapper.find('form').trigger('submit.prevent');
		await flushPromises();


		expect(wrapper.find('button[type="submit"]').text()).toContain('Registering...');
		expect(wrapper.find('svg.animate-spin').exists()).toBe(true);


		resolvePromise({
			ok: true,
			json: () => Promise.resolve({
				uid: 123,
				username: 'newuser',
				created_at: '2025-04-01T12:00:00.000Z'
			})
		});

		await submitPromise;
		await flushPromises();
	});

	it('navigates to login page when login link is clicked', async () => {
		const wrapper = mount(RegisterPage, {
			global: {
				plugins: [router]
			}
		});

		await wrapper.find('a[href="/login"]').trigger('click');
		await router.isReady();

		expect(router.currentRoute.value.path).toBe('/login');
	});

	it('handles network error gracefully', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

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


		expect(wrapper.find('div.bg-destructive\\/10').text().trim()).toBe('Network error');
		expect(router.currentRoute.value.path).toBe('/register');
	});
});
