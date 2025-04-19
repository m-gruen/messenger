import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import AppSidebar from '../../src/components/ui/sidebar/AppSidebar.vue';

// First, mock the modules before using any variables
vi.mock('../../src/stores/AuthStore', () => ({
    useAuthStore: vi.fn()
}));

vi.mock('../../src/services/api.service', () => ({
    apiService: {
        getContacts: vi.fn(),
        getContactRequests: vi.fn(),
        getMessages: vi.fn(),
        sendMessage: vi.fn()
    }
}));

vi.mock('../../src/services/storage.service', () => ({
    storageService: {
        getUser: vi.fn(),
        getToken: vi.fn()
    }
}));

// Mock for Lucide icons
vi.mock('lucide-vue-next', () => ({
    Home: { render: () => {} },
    Inbox: { render: () => {} },
    Search: { render: () => {} },
    Settings: { render: () => {} },
    ChevronRight: { render: () => {} },
    ChevronLeft: { render: () => {} },
    MessageSquare: { render: () => {} },
    Send: { render: () => {} },
    ArrowLeft: { render: () => {} }
}));

// Set up environment for testing
process.env.NODE_ENV = 'test';

// Create mock routes for testing
const routes = [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/add-contact', component: { template: '<div>Add Contact</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// Get references to mocked functions AFTER the mocks are set up
import { useAuthStore } from '../../src/stores/AuthStore';
import { apiService } from '../../src/services/api.service';
import { storageService } from '../../src/services/storage.service';
import { Contact } from '../../src/models/contact-model';

describe('AppSidebar.vue', () => {
    // Create mock user and token
    const mockUser = {
        uid: 123,
        username: 'testuser',
        created_at: '2025-04-01T12:00:00.000Z'
    };
    const mockToken = 'fake-token';
    
    // Set up testing environment
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Set up storage service mock
        vi.mocked(storageService.getUser).mockReturnValue(mockUser);
        vi.mocked(storageService.getToken).mockReturnValue(mockToken);
        
        router.push('/');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('renders the sidebar with navigation items', async () => {
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    'Home': true,
                    'Inbox': true,
                    'Search': true,
                    'Settings': true,
                    'ChevronLeft': true,
                    'ChevronRight': true
                }
            }
        });
        
        await flushPromises();
        
        // Check for sidebar header
        expect(wrapper.text()).toContain('Application');
        
        // Check for navigation items
        expect(wrapper.text()).toContain('Home');
        expect(wrapper.text()).toContain('Contacts');
        expect(wrapper.text()).toContain('Search');
        expect(wrapper.text()).toContain('Settings');
    });

    it('toggles the contacts panel when Contacts is clicked', async () => {
        // Mock contacts data
        const mockContacts = [
            {
                userId: 456,
                contactUserId: 456,
                username: 'friend1',
                status: 'ACCEPTED',
                createdAt: '2025-03-01T12:00:00.000Z'
            },
            {
                userId: 789,
                contactUserId: 789,
                username: 'friend2',
                status: 'ACCEPTED',
                createdAt: '2025-03-15T12:00:00.000Z'
            }
        ];
        
        // Mock API response
        vi.mocked(apiService.getContacts).mockResolvedValue(mockContacts);
        
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    'Home': true,
                    'Inbox': true,
                    'Search': true,
                    'Settings': true,
                    'ChevronLeft': true,
                    'ChevronRight': true
                }
            }
        });
        
        // Initially contacts panel should be hidden
        expect(wrapper.find('h2').exists()).toBe(false);
        
        // Find and click the Contacts navigation item
        const contactsLink = wrapper.findAll('a')[1];
        await contactsLink.trigger('click');
        await flushPromises();
        
        // Contacts panel should now be visible with the title
        expect(wrapper.find('h2').exists()).toBe(true);
        expect(wrapper.find('h2').text()).toBe('Contacts');
        
        // API should have been called
        expect(apiService.getContacts).toHaveBeenCalledWith(123, mockToken);
        
        // Contacts should be displayed
        expect(wrapper.text()).toContain('friend1');
        expect(wrapper.text()).toContain('friend2');
    });
    
    it('shows loading state when fetching contacts', async () => {
        // Create a delayed promise that we can control
        let resolveContacts!: (value: any) => void;  // Using the definite assignment assertion
        const contactsPromise = new Promise<Contact[]>(resolve => {
            resolveContacts = resolve;
        });
        
        // Mock API with delayed response
        vi.mocked(apiService.getContacts).mockReturnValue(contactsPromise);
        
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    'Home': true,
                    'Inbox': true,
                    'Search': true,
                    'Settings': true,
                    'ChevronLeft': true,
                    'ChevronRight': true
                }
            }
        });
        
        // Click the Contacts navigation item
        const contactsLink = wrapper.findAll('a')[1];
        await contactsLink.trigger('click');
        await flushPromises();
        
        // Loading indicator should be visible
        expect(wrapper.text()).toContain('Loading contacts...');
        
        // Resolve the contacts promise
        resolveContacts([]);
        await flushPromises();
        
        // Loading indicator should be gone, empty state should be shown
        expect(wrapper.text()).not.toContain('Loading contacts...');
        expect(wrapper.text()).toContain('No contacts found.');
    });
    
    it('handles API errors when fetching contacts', async () => {
        // Mock API error
        vi.mocked(apiService.getContacts).mockRejectedValue(new Error('Network error'));
        
        // We need to spy on console.error to prevent test output pollution
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    'Home': true,
                    'Inbox': true,
                    'Search': true,
                    'Settings': true,
                    'ChevronLeft': true,
                    'ChevronRight': true
                }
            }
        });
        
        // Click the Contacts navigation item
        const contactsLink = wrapper.findAll('a')[1];
        await contactsLink.trigger('click');
        await flushPromises();
        
        // Error should have been logged
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        // Error message should be visible to user
        expect(wrapper.find('.bg-destructive\\/10').exists()).toBe(true);
        expect(wrapper.find('.bg-destructive\\/10').text()).toContain('Network error');
        
        // Restore console.error
        consoleErrorSpy.mockRestore();
    });
    
    it('toggles sidebar collapse state', async () => {
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    'Home': true,
                    'Inbox': true,
                    'Search': true,
                    'Settings': true,
                    'ChevronLeft': true,
                    'ChevronRight': true
                }
            }
        });
        
        // Check initial state
        expect(wrapper.find('aside').classes()).not.toContain('w-12');
        
        // Find and click the sidebar toggle button
        const toggleButton = wrapper.find('#sidebar-toggle');
        await toggleButton.trigger('click');
        
        // Sidebar should now be collapsed
        expect(wrapper.find('aside').classes()).toContain('w-12');
        
        // Click again to expand
        await toggleButton.trigger('click');
        
        // Should be expanded again
        expect(wrapper.find('aside').classes()).not.toContain('w-12');
    });
    
    it('shows chat interface when a contact is selected', async () => {
        // Mock contacts and messages
        const mockContacts = [
            {
                userId: 456,
                contactUserId: 456,
                username: 'friend1',
                status: 'ACCEPTED',
                createdAt: '2025-03-01T12:00:00.000Z'
            }
        ];
        
        const mockMessages = [
            {
                mid: 1,
                sender_uid: 123,
                receiver_uid: 456,
                content: 'Hello there!',
                timestamp: '2025-04-01T12:00:00.000Z',
                is_read: true
            },
            {
                mid: 2,
                sender_uid: 456,
                receiver_uid: 123,
                content: 'Hi! How are you?',
                timestamp: '2025-04-01T12:05:00.000Z',
                is_read: true
            }
        ];
        
        // Mock API responses
        vi.mocked(apiService.getContacts).mockResolvedValue(mockContacts);
        vi.mocked(apiService.getMessages).mockResolvedValue(mockMessages);
        
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    'Home': true,
                    'Inbox': true,
                    'Search': true,
                    'Settings': true,
                    'ChevronLeft': true,
                    'ChevronRight': true,
                    'MessageSquare': true,
                    'Send': true,
                    'ArrowLeft': true
                }
            }
        });
        
        // Click contacts to show the panel
        const contactsLink = wrapper.findAll('a')[1];
        await contactsLink.trigger('click');
        await flushPromises();
        
        // Chat interface should not be visible yet
        expect(wrapper.find('input[type="text"]').exists()).toBe(false);
        
        // Click on a contact
        const contactElement = wrapper.find('li.cursor-pointer');
        await contactElement.trigger('click');
        await flushPromises();
        
        // Chat interface should now be visible
        expect(wrapper.text()).toContain('friend1');
        // Check for the message input field
        expect(wrapper.find('form input[type="text"]').exists()).toBe(true);
        
        // Messages should be displayed
        expect(wrapper.text()).toContain('Hello there!');
        expect(wrapper.text()).toContain('Hi! How are you?');
        
        // Check API calls
        expect(apiService.getMessages).toHaveBeenCalledWith(123, 456, mockToken);
    });
});
