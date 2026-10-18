import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Interview from '../Interview';
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

describe('Interview Page & Voice Engine Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders start interview button initially', () => {
    render(<Interview />);
    expect(screen.getByRole('button', { name: /Start Interview/i })).toBeInTheDocument();
  });

  it('starts the interview, displays questions, and renders the Voice Toolbar', async () => {
    const mockUser = { id: 'candidate-99' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post.mockResolvedValue({
      data: {
        interview_id: 'inv-test-id',
        question: 'Explain how Docker containers differ from Virtual Machines.',
      },
    });

    render(<Interview />);

    const startBtn = screen.getByRole('button', { name: /Start Interview/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('Explain how Docker containers differ from Virtual Machines.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /⏹️ Stop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /⏸️ Pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔊 Mute/i })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /^1x$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1\.25x$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1\.5x$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^2x$/i })).toBeInTheDocument();
  });

  it('toggles mute/unmute and updates status badge in toolbar', async () => {
    const mockUser = { id: 'candidate-99' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post.mockResolvedValue({
      data: {
        interview_id: 'inv-test-id',
        question: 'What is database indexing?',
      },
    });

    render(<Interview />);

    const startBtn = screen.getByRole('button', { name: /Start Interview/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('What is database indexing?')).toBeInTheDocument();
    });

    const muteBtn = screen.getByRole('button', { name: /🔊 Mute/i });
    fireEvent.click(muteBtn);

    expect(screen.getByRole('button', { name: /🔇 Unmute/i })).toBeInTheDocument();
    expect(screen.getByText('🔇 Muted')).toBeInTheDocument();
  });

  it('submits an answer to /interview/answer and receives next question', async () => {
    const mockUser = { id: 'candidate-99' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post
      .mockResolvedValueOnce({
        data: { interview_id: 'inv-123', question: 'Question 1: What is REST?' },
      })
      .mockResolvedValueOnce({
        data: {
          finished: false,
          question: 'Question 2: What is GraphQL?',
          feedback: 'Good explanation of HTTP methods. Score: 8/10',
        },
      });

    render(<Interview />);

    const startBtn = screen.getByRole('button', { name: /Start Interview/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('Question 1: What is REST?')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Type your answer\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'REST stands for Representational State Transfer.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Answer/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/interview/answer', {
        interview_id: 'inv-123',
        answer: 'REST stands for Representational State Transfer.',
      });
      expect(screen.getByText('Question 2: What is GraphQL?')).toBeInTheDocument();
      expect(screen.getByText(/Good explanation of HTTP methods/i)).toBeInTheDocument();
    });
  });

  it('updates speech rate when clicking speed buttons (1.5x)', async () => {
    const mockUser = { id: 'candidate-99' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post.mockResolvedValue({
      data: { interview_id: 'inv-123', question: 'What is CORS?' },
    });

    render(<Interview />);

    const startBtn = screen.getByRole('button', { name: /Start Interview/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('What is CORS?')).toBeInTheDocument();
    });

    const speed15Btn = screen.getByRole('button', { name: /^1\.5x$/i });
    fireEvent.click(speed15Btn);

    expect(speed15Btn).toHaveClass('bg-cyan-500');
  });
});