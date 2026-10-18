import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Home from '../Home';

describe('Home Page Component', () => {
  it('renders the hero section with call-to-action buttons', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Hero headline and copy
    expect(screen.getByText('Ace Your Next Technical Interview')).toBeInTheDocument();
    expect(screen.getByText(/Coach uses AI to analyze your resume/i)).toBeInTheDocument();

    // CTA links
    const getStartedLink = screen.getByRole('link', { name: /get started/i });
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink).toHaveAttribute('href', '/signup');

    const uploadLink = screen.getByRole('link', { name: /upload resume/i });
    expect(uploadLink).toBeInTheDocument();
    expect(uploadLink).toHaveAttribute('href', '/upload');
  });

  it('renders key feature cards', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Resume Analysis')).toBeInTheDocument();
    expect(screen.getByText('AI Resume Chat')).toBeInTheDocument();
  });
});