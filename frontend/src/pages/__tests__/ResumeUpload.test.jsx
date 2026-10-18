import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResumeUpload from '../ResumeUpload';
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

describe('ResumeUpload Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders upload instructions and file input initially', () => {
    const { container: root } = render(<ResumeUpload />);

    expect(screen.getByText('Resume Upload')).toBeInTheDocument();
    expect(screen.getByText(/Upload your resume so Coach can analyze it/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size: 5 MB/i)).toBeInTheDocument();

    const fileInput = root.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('displays selected resume details and action buttons when a file is chosen', () => {
    const { container } = render(<ResumeUpload />);

    const file = new File(['dummy-content'], 'my_resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Selected Resume')).toBeInTheDocument();
    expect(screen.getByText('my_resume.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Resume/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
  });

  it('resets file selection when clicking the Remove button', () => {
    const { container } = render(<ResumeUpload />);

    const file = new File(['dummy-content'], 'my_resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText('Selected Resume')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload Resume/i })).not.toBeInTheDocument();
  });

  it('uploads selected resume to /upload-resume successfully when logged in', async () => {
    const mockUser = { id: 'user-resume-101' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    api.post.mockResolvedValue({ data: { message: 'uploaded', chunks: 4 } });

    const { container } = render(<ResumeUpload />);

    const file = new File(['dummy-content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByRole('button', { name: /Upload Resume/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/upload-resume', expect.any(FormData));
      expect(window.alert).toHaveBeenCalledWith('Upload Successful');
    });
  });

  it('alerts if user tries to upload when not logged in', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { container } = render(<ResumeUpload />);
    const file = new File(['dummy-content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByRole('button', { name: /Upload Resume/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please login first');
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('triggers window.open when clicking View Resume', () => {
    vi.spyOn(window, 'open').mockImplementation(() => {});

    const { container } = render(<ResumeUpload />);
    const file = new File(['dummy-content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const viewBtn = screen.getByRole('button', { name: /View Resume/i });
    fireEvent.click(viewBtn);

    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('blob:'), '_blank');
  });

  it('triggers file input click when clicking Edit Resume', () => {
    const { container } = render(<ResumeUpload />);
    const file = new File(['dummy-content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const clickSpy = vi.spyOn(fileInput, 'click');
    const editBtn = screen.getByRole('button', { name: /Edit Resume/i });
    fireEvent.click(editBtn);

    expect(clickSpy).toHaveBeenCalled();
  });
});