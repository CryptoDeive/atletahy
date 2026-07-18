import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegalFooter } from './LegalFooter';
import { LegalPage } from './LegalPage';

describe('public legal information', () => {
  it('identifies the company and special-category data in the privacy policy', () => {
    render(<MemoryRouter><LegalPage document="privacy" /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Política de privacidad', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/B27636349/)).toBeInTheDocument();
    expect(screen.getByText(/categorías especiales/i)).toBeInTheDocument();
    expect(screen.getAllByText(/OpenAI/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Agencia Española de Protección de Datos/i)).toBeInTheDocument();
  });

  it('describes the real storage inventory and does not pretend to use advertising cookies', () => {
    render(<MemoryRouter><LegalPage document="cookies" /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Política de cookies y almacenamiento local', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/localStorage/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/sessionStorage/i)).toBeInTheDocument();
    expect(screen.getByText(/no utiliza actualmente cookies analíticas/i)).toBeInTheDocument();
  });

  it('exposes all legal destinations from the permanent footer', () => {
    render(<MemoryRouter><LegalFooter /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Aviso legal' })).toHaveAttribute('href', '/aviso-legal');
    expect(screen.getByRole('link', { name: 'Privacidad' })).toHaveAttribute('href', '/politica-privacidad');
    expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/politica-cookies');
  });
});
