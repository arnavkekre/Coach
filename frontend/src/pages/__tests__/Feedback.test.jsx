import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Feedback from '../Feedback';
import api from '../../services/api';
import { supabase } from '../../services/supabase';

// Mock Supabase Auth
vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock API
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('Feedback Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders heading, description, textarea and submit button', () => {
    render(<Feedback />);

    expect(screen.getByText('Feedback')).toBeInTheDocument();
    expect(screen.getByText('Help us improve Coach.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write your feedback...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('updates textarea value when user types into it', () => {
    render(<Feedback />);

    const textarea = screen.getByPlaceholderText('Write your feedback...');
    fireEvent.change(textarea, { target: { value: 'The mock interview was very realistic!' } });

    expect(textarea.value).toBe('The mock interview was very realistic!');
  });

  it('alerts the user if they try submitting without being logged in', async () => {
    // Simulate unauthenticated user
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    render(<Feedback />);

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please login first');
    });
    // Ensure API was NOT called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits feedback to /feedback and switches to thank you screen when logged in', async () => {
    const mockUser = { id: 'user-456' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post.mockResolvedValue({ data: { message: 'Feedback submitted successfully' } });

    render(<Feedback />);

    const textarea = screen.getByPlaceholderText('Write your feedback...');
    fireEvent.change(textarea, { target: { value: 'Great speech synthesis speed controls!' } });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/feedback', {
        user_id: 'user-456',
        message: 'Great speech synthesis speed controls!',
      });
    });

    // Assert form is replaced with thank you message
    expect(await screen.findByText('Thanks for your feedback!')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Write your feedback...')).not.toBeInTheDocument();
  });
});