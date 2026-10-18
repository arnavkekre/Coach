import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navbar from '../Navbar';
import { supabase } from '../../services/supabase';

// Mock Supabase Auth
vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login and signup links when user is NOT logged in', async () => {
    // Simulate logged out state
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Assert Logo and public links exist
    expect(screen.getByText('Coach')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Signup')).toBeInTheDocument();

    // Assert protected links are NOT in the document
    expect(screen.queryByText('Interview')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload Resume')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('renders protected navigation and logout button when user IS logged in', async () => {
    // Simulate logged in user
    const mockUser = { id: 'user-123', email: 'candidate@example.com' };
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Wait for the session state update to render protected links
    expect(await screen.findByText('Upload Resume')).toBeInTheDocument();
    expect(screen.getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();

    // Assert Login / Signup are now hidden
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Signup')).not.toBeInTheDocument();
  });

  it('calls supabase.auth.signOut when clicking the Logout button', async () => {
    const mockUser = { id: 'user-123' };
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const logoutButton = await screen.findByText('Logout');
    fireEvent.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
