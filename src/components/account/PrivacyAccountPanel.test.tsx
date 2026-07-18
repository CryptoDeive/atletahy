import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { guestStorageContext } from '../../repositories/storageKeys';
import { ACCOUNT_DELETION_CONFIRMATION } from '../../privacy/accountPrivacy';
import { PrivacyAccountPanel } from './PrivacyAccountPanel';

describe('PrivacyAccountPanel', () => {
  it('shows legal information and lets the athlete export local data', () => {
    const onExport = vi.fn();
    render(<PrivacyAccountPanel storageContext={guestStorageContext} authenticated={false} onExport={onExport} />);

    expect(screen.getByRole('heading', { name: 'Privacidad y cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Términos de uso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aviso médico' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar mis datos locales' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('uses acknowledgement, exact phrase and explicit reauthentication before server deletion', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue({ ok: true, code: 'ACCOUNT_DELETED', message: 'Tu cuenta y sus datos asociados se han eliminado.' });
    render(<PrivacyAccountPanel storageContext={guestStorageContext} authenticated onDeleteAccount={onDeleteAccount} />);

    const requestButton = screen.getByRole('button', { name: 'Eliminar cuenta definitivamente' });
    expect(requestButton).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /entiendo que la eliminación/i }));
    fireEvent.change(screen.getByLabelText(/escribe exactamente/i), { target: { value: ACCOUNT_DELETION_CONFIRMATION } });
    fireEvent.change(screen.getByLabelText(/contraseña actual/i), { target: { value: 'password-123' } });
    expect(requestButton).toBeEnabled();
    fireEvent.click(requestButton);

    expect(onDeleteAccount).toHaveBeenCalledWith({ confirmation: ACCOUNT_DELETION_CONFIRMATION, currentPassword: 'password-123' });
    expect(await screen.findByRole('status')).toHaveTextContent('Tu cuenta y sus datos asociados se han eliminado.');
  });
});
