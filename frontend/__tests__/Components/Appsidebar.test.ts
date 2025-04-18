import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AppSidebar from '../../src/components/ui/sidebar/AppSidebar.vue';
import { nextTick } from 'vue';


vi.mock('lucide-vue-next', () => ({
    Home: vi.fn(),
    Inbox: vi.fn(),
    Search: vi.fn(),
    Settings: vi.fn(),
    ChevronRight: vi.fn(),
    ChevronLeft: vi.fn(),
    MessageSquare: vi.fn(),
    Send: vi.fn(),
    ArrowLeft: vi.fn(),
}));

describe('AppSidebar.vue', () => {

    const sessionStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
    };


    global.fetch = vi.fn();


    vi.mock('import.meta', () => ({
        env: {
            VITE_BACKEND_URL: 'http://localhost:3000',

        },
    }));

    beforeEach(() => {

        vi.clearAllMocks();


        Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
        sessionStorageMock.getItem.mockImplementation((key) => {
            if (key === 'uid') return '1';
            if (key === 'token') return 'fake-token';
            return null;
        });


        global.fetch = vi.fn();


        document.documentElement.style.removeProperty('--sidebar-width');


        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });


    it('check if the sidebar is rendered correctly', async () => {
        const wrapper = mount(AppSidebar);
        await flushPromises();
        expect(wrapper.exists()).toBe(true);
    });

    it('check if the sidebar is closed by default', async () => {
        const wrapper = mount(AppSidebar);
        await flushPromises();
        expect(document.getElementsByTagName('html')[0].style.length).toBe(0);
    });

    it('check if sidebar closes when button is clicked', async () => {
        const wrapper = mount(AppSidebar);
        await flushPromises()

        const button = wrapper.find('#sidebar-toggle');
        await button.trigger('click');
        await nextTick();

        expect(document.getElementsByTagName('html')[0].style.length).toBe(1);
        expect(document.getElementsByTagName('html')[0].style.getPropertyValue('--sidebar-width')).toBe('48px');
    });

    it('check if sidebar opens when button is clicked twice', async () => {
        const wrapper = mount(AppSidebar);
        await flushPromises()

        const button = wrapper.find('#sidebar-toggle');
        await button.trigger('click');
        await button.trigger('click')
        await nextTick();

        expect(document.getElementsByTagName('html')[0].style.length).toBe(1);
        expect(document.getElementsByTagName('html')[0].style.getPropertyValue('--sidebar-width')).toBe('240px');
    });


    it('should have four navigation items', async () => {
        const wrapper = mount(AppSidebar);
        await flushPromises();

        const navItems = wrapper.findAll('ul li a');
        expect(navItems.length).toBe(4);
    });

    it('should show contacts when clicking the contacts button', async () => {

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([
                { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' },
                { uid: 3, username: 'User3', contactUserId: 3, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'pending' }
            ])
        });

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();


        const contactsPanel = wrapper.find('div.fixed.z-10.top-0.bottom-0.overflow-y-auto');
        expect(contactsPanel.exists()).toBe(true);
        expect(contactsPanel.isVisible()).toBe(true);


        const contactItems = wrapper.findAll('ul li.p-2.rounded-md.hover\\:bg-accent');
        expect(contactItems.length).toBe(2);


        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3000/contact/1',
            expect.objectContaining({
                method: 'GET',
                headers: { 'Authorization': 'Bearer fake-token' }
            })
        );
    });


    it('should show error message when contact fetch fails', async () => {

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized'
        });

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();


        const errorMessage = wrapper.find('div.bg-destructive\\/10.text-destructive');
        expect(errorMessage.exists()).toBe(true);
        expect(errorMessage.text()).toContain('Error 401: Unauthorized');
    });


    it('should open chat when contact is selected', async () => {

        global.fetch = vi.fn().mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
                { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' }
            ])
        }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            }));

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();


        const contactItem = wrapper.find('ul li.p-2.rounded-md.hover\\:bg-accent');
        await contactItem.trigger('click');
        await flushPromises();


        const chatInterface = wrapper.find('div.fixed.z-10.top-0.bottom-0.border-r.border-border.bg-background.flex.flex-col');
        expect(chatInterface.exists()).toBe(true);


        const contactName = wrapper.find('div.font-medium');
        expect(contactName.text()).toBe('Application');


        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith(
            'http://localhost:3000/message?sender_uid=1&receiver_uid=2',
            expect.objectContaining({
                headers: { 'Authorization': 'Bearer fake-token' }
            })
        );
    });


    it('should send a message when form is submitted', async () => {

        const mockMessage = {
            mid: 1,
            sender_uid: 1,
            receiver_uid: 2,
            content: 'Hello there',
            timestamp: '2025-04-12T12:00:00.000Z'
        };

        global.fetch = vi.fn()

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' }
                ])
            }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockMessage)
            }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([mockMessage])
            }));

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();

        const contactItem = wrapper.find('ul li.p-2.rounded-md.hover\\:bg-accent');
        await contactItem.trigger('click');
        await flushPromises();


        const messageInput = wrapper.find('input[type="text"]');
        await messageInput.setValue('Hello there');


        const form = wrapper.find('form');
        await form.trigger('submit.prevent');
        await flushPromises();


        expect(global.fetch).toHaveBeenCalledTimes(4);
        expect(global.fetch).toHaveBeenNthCalledWith(
            3,
            'http://localhost:3000/message',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer fake-token'
                }),
                body: JSON.stringify({
                    sender_uid: 1,
                    receiver_uid: 2,
                    content: 'Hello there'
                })
            })
        );


        expect(messageInput.element).toBeTruthy();
        expect((messageInput.element as HTMLInputElement).value).toBe('');
    });


    it('should display messages properly', async () => {

        const mockMessages = [
            {
                mid: 1,
                sender_uid: 1,
                receiver_uid: 2,
                content: 'Hello there',
                timestamp: '2025-04-12T12:00:00.000Z'
            },
            {
                mid: 2,
                sender_uid: 2,
                receiver_uid: 1,
                content: 'Hi! How are you?',
                timestamp: '2025-04-12T12:01:00.000Z'
            }
        ];

        global.fetch = vi.fn()

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' }
                ])
            }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockMessages)
            }));

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();

        const contactItem = wrapper.find('ul li.p-2.rounded-md.hover\\:bg-accent');
        await contactItem.trigger('click');
        await flushPromises();


        const messageBubbles = wrapper.findAll('div.max-w-\\[70\\%\\].rounded-lg.p-3.shadow-sm');
        expect(messageBubbles.length).toBe(2);


        expect(messageBubbles[0].find('p').text()).toBe('Hi! How are you?');
        expect(messageBubbles[1].find('p').text()).toBe('Hello there');


        const messageContainers = wrapper.findAll('div.flex.justify-end, div.flex.justify-start');
        expect(messageContainers[0].classes()).toContain('justify-start');
        expect(messageContainers[1].classes()).toContain('justify-end');
    });


    it('should close chat when back button is clicked', async () => {
        global.fetch = vi.fn()

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' }
                ])
            }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            }));

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();

        const contactItem = wrapper.find('ul li.p-2.rounded-md.hover\\:bg-accent');
        await contactItem.trigger('click');
        await flushPromises();


        const backButton = wrapper.find('button.mr-2.rounded-full.p-1\\.5.hover\\:bg-accent');
        await backButton.trigger('click');
        await flushPromises();


        const chatInterface = wrapper.find('div.fixed.z-10.top-0.bottom-0.border-r.border-border.bg-background.flex.flex-col');
        expect(chatInterface.exists()).toBe(false);
    });

    it('should display empty state when no messages exist', async () => {
        global.fetch = vi.fn()

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' }
                ])
            }))

            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            }));

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();

        const contactItem = wrapper.find('ul li.p-2.rounded-md.hover\\:bg-accent');
        await contactItem.trigger('click');
        await flushPromises();


        const emptyState = wrapper.find('div.flex.flex-col.items-center.justify-center.h-full.text-center');
        expect(emptyState.exists()).toBe(true);

        const emptyStateText = wrapper.find('p.mt-4.text-muted-foreground');
        expect(emptyStateText.text()).toContain('No messages yet with User2');
    });

    it('should disable send button when message input is empty', async () => {
        global.fetch = vi.fn()
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { uid: 2, username: 'User2', contactUserId: 2, userId: 1, createdAt: '2025-04-01T12:00:00.000Z', status: 'accepted' }
                ])
            }))
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            }));

        const wrapper = mount(AppSidebar);
        await flushPromises();


        const contactsButton = wrapper.findAll('ul li a').at(1);
        await contactsButton?.trigger('click');
        await flushPromises();

        const contactItem = wrapper.find('ul li.p-2.rounded-md.hover\\:bg-accent');
        await contactItem.trigger('click');
        await flushPromises();


        const sendButton = wrapper.find('button[type="submit"]');
        expect(sendButton.attributes('disabled')).toBeDefined();


        const messageInput = wrapper.find('input[type="text"]');
        await messageInput.setValue('Hello');
        await nextTick();

        expect(sendButton.attributes('disabled')).toBeUndefined();
    });
});
