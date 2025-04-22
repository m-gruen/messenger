import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import AppSidebar from '../../src/components/ui/sidebar/AppSidebar.vue';
import { ContactStatus } from '../../src/models/contact-model';

// Mock the AuthStore
vi.mock('../../src/stores/AuthStore', () => ({
    useAuthStore: vi.fn(() => ({
        user: {
            uid: 123,
            username: 'testuser',
            token: 'fake-token'
        }
    }))
}));

// Mock the ContactStore with necessary methods and properties
vi.mock('../../src/stores/ContactStore', () => ({
    useContactStore: vi.fn(() => ({
        contacts: [],
        loading: false,
        error: null,
        acceptedContacts: [],
        incomingRequests: [],
        outgoingRequests: [],
        fetchAllContacts: vi.fn().mockResolvedValue([]),
        getContactStatus: vi.fn(),
        isExistingContact: vi.fn(),
        addContact: vi.fn(),
        acceptContactRequest: vi.fn(),
        rejectContactRequest: vi.fn(),
        cancelOutgoingRequest: vi.fn(),
        deleteContact: vi.fn(),
        isPending: vi.fn()
    }))
}));

vi.mock('../../src/services/api.service', () => ({
    apiService: {
        getContacts: vi.fn(),
        getIncomingContactRequests: vi.fn(),
        getOutgoingContactRequests: vi.fn(),
        getMessages: vi.fn(),
        sendMessage: vi.fn()
    }
}));

vi.mock('../../src/services/storage.service', () => ({
    storageService: {
        getUser: vi.fn(),
        getToken: vi.fn(),
        isAuthenticated: vi.fn()
    }
}));

// Mock the child components
vi.mock('../../src/components/ui/ContactList.vue', () => ({
    default: {
        name: 'ContactList',
        props: ['visible'],
        template: '<div class="contact-list-mock">Contact List Mock</div>'
    }
}));

vi.mock('../../src/components/ui/ContactRequests.vue', () => ({
    default: {
        name: 'ContactRequests',
        props: ['visible'],
        template: '<div class="contact-requests-mock">Contact Requests Mock</div>'
    }
}));

vi.mock('../../src/components/ui/UserSearch.vue', () => ({
    default: {
        name: 'UserSearch',
        template: '<div class="user-search-mock">User Search Mock</div>'
    }
}));

// Mock for Lucide icons
vi.mock('lucide-vue-next', () => ({
    Home: { render: () => null },
    Inbox: { render: () => null },
    Search: { render: () => null },
    Settings: { render: () => null },
    ChevronRight: { render: () => null },
    ChevronLeft: { render: () => null },
    MessageSquare: { render: () => null },
    Send: { render: () => null },
    ArrowLeft: { render: () => null },
    UserPlus: { render: () => null }
}));

// Set up environment for testing
process.env.NODE_ENV = 'test';

// Create mock routes for testing
const routes = [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// Get references to mocked functions AFTER the mocks are set up
import { useAuthStore } from '../../src/stores/AuthStore';
import { useContactStore } from '../../src/stores/ContactStore';
import { apiService } from '../../src/services/api.service';
import { storageService } from '../../src/services/storage.service';
import type { Contact } from '../../src/models/contact-model';

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
                    'ChevronRight': true,
                    'UserPlus': true
                }
            }
        });
        
        await flushPromises();
        
        // Check for sidebar header
        expect(wrapper.text()).toContain('Application');
        
        // Check for navigation items
        expect(wrapper.text()).toContain('Home');
        expect(wrapper.text()).toContain('Contacts');
        expect(wrapper.text()).toContain('Requests');
        expect(wrapper.text()).toContain('Search');
        expect(wrapper.text()).toContain('Settings');
    });

    it('toggles the contacts panel when Contacts is clicked', async () => {
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    ContactList: {
                        template: '<div class="contact-list-mock">Contact List Mock</div>',
                        props: ['visible']
                    },
                    ContactRequests: true,
                    UserSearch: true,
                    Home: true,
                    Inbox: true,
                    Search: true,
                    Settings: true,
                    ChevronLeft: true,
                    ChevronRight: true,
                    UserPlus: true
                }
            }
        });
        
        // Verify the contacts panel is not visible initially
        expect(wrapper.html()).not.toContain('contact-list-mock');
        
        // Find and click the Contacts navigation item
        const contactsLink = wrapper.findAll('a')[1];
        await contactsLink.trigger('click');
        await flushPromises();
        
        // Contacts panel should now be visible
        expect(wrapper.html()).toContain('contact-list-mock');
        
        // Click again to hide the panel
        await contactsLink.trigger('click');
        await flushPromises();
        
        // Contacts panel should now be hidden
        expect(wrapper.html()).not.toContain('contact-list-mock');
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
                    'ChevronRight': true,
                    'UserPlus': true
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
    
    it('toggles requests panel when Requests is clicked', async () => {
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    ContactRequests: {
                        template: '<div class="contact-requests-mock">Contact Requests Mock</div>',
                        props: ['visible']
                    },
                    ContactList: true,
                    UserSearch: true,
                    Home: true,
                    Inbox: true,
                    Search: true,
                    Settings: true,
                    ChevronLeft: true,
                    ChevronRight: true,
                    UserPlus: true
                }
            }
        });
        
        // Find and click the Requests navigation item
        const requestsLink = wrapper.findAll('a')[2];
        await requestsLink.trigger('click');
        await flushPromises();
        
        // Requests panel should now be visible
        expect(wrapper.html()).toContain('contact-requests-mock');
    });
    
    it('toggles search panel when Search is clicked', async () => {
        // Mount the component
        const wrapper = mount(AppSidebar, {
            global: {
                plugins: [router],
                stubs: {
                    UserSearch: {
                        template: '<div class="user-search-mock">User Search Mock</div>'
                    },
                    ContactList: true,
                    ContactRequests: true,
                    Home: true,
                    Inbox: true,
                    Search: true,
                    Settings: true,
                    ChevronLeft: true,
                    ChevronRight: true,
                    UserPlus: true
                }
            }
        });
        
        // Find and click the Search navigation item
        const searchLink = wrapper.findAll('a')[3];
        await searchLink.trigger('click');
        await flushPromises();
        
        // Search panel should now be visible
        expect(wrapper.html()).toContain('user-search-mock');
    });
});
