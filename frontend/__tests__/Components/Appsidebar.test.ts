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
      if (key === 'token') return '';
      return null;
    });
    
    
    global.fetch = vi.fn();
    
    
    document.documentElement.style.removeProperty('--sidebar-width');
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
  

});