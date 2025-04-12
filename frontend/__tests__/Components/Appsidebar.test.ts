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
      VITE_BACKEND_URL: 'http://test-api.com',
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the sidebar component', () => {
    const wrapper = mount(AppSidebar);
    expect(wrapper.exists()).toBe(true);
  });
});