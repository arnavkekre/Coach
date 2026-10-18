import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Chat from '../Chat';
import api from '../../services/api';
import { supabase } from '../../services/supabase';

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('Chat Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders initial greeting message from Coach and input area', () => {
    render(<Chat />);

    expect(screen.getByText(/Hi! I've analyzed your resume/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask something about your resume/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
  });

  it('sends question to /chat and appends answer to message history', async () => {
    const mockUser = { id: 'chat-user-1' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post.mockResolvedValue({
      data: { answer: 'Based on your resume, you have 2 years of React experience.' },
    });

    render(<Chat />);

    const input = screen.getByPlaceholderText(/Ask something about your resume/i);
    fireEvent.change(input, { target: { value: 'How many years of React do I have?' } });

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    // Verify user message appears immediately in chat
    expect(screen.getByText('How many years of React do I have?')).toBeInTheDocument();

    // Verify API called
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/chat', {
        user_id: 'chat-user-1',
        question: 'How many years of React do I have?',
      });
    });

    // Verify AI response appears in chat
    expect(await screen.findByText('Based on your resume, you have 2 years of React experience.')).toBeInTheDocument();
  });
});
