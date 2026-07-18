import { useState } from 'react';
import {
  ACCOUNT_DELETION_CONFIRMATION,
  clearLocalAccountData,
  downloadLocalAccountExport,
} from '../../privacy/accountPrivacy';
import { requestAccountDeletion, type AccountDeletionInput, type AccountDeletionResult } from '../../privacy/accountDeletionService';
import type { StorageContext } from '../../repositories/storageKeys';

interface PrivacyAccountPanelProps {
  storageContext: StorageContext;
  authenticated: boolean;
  onExport?: () => void;
  onDeleteAccount?: (input: AccountDeletionInput) => Promise<AccountDeletionResult>;
}

export function PrivacyAccountPanel({ storageContext, authenticated, onExport, onDeleteAccount = requestAccountDeletion }: PrivacyAccountPanelProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);
  const canDelete = authenticated && acknowledged && phrase === ACCOUNT_DELETION_CONFIRMATION && currentPassword.length > 0 && !deleting;

  function handleExport() {
    if (onExport) onExport();
    else downloadLocalAccountExport(storageContext);
  }

  async function handleDeleteAccount() {
    if (!canDelete) return;
    setDeleting(true);
    setDeletionStatus(null);
    try {
      const result = await onDeleteAccount({ confirmation: phrase, currentPassword });
      if (result.ok) {
        clearLocalAccountData(storageContext);
        setPhrase('');
        setCurrentPassword('');
        setAcknowledged(false);
      }
      setDeletionStatus(result.message);
    } catch {
      setDeletionStatus('No se pudo eliminar la cuenta. Inténtalo de nuevo más tarde.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="privacy-account-title" className="space-y-5 rounded-2xl border border-white/10 bg-black/30 p-5 shadow-panel sm:p-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-hyrox-gold">Control de datos</p>
        <h3 id="privacy-account-title" className="mt-2 font-display text-3xl uppercase text-white">Privacidad y cuenta</h3>
        <p className="mt-2 text-sm text-white/70">Tus exportaciones locales se limitan al espacio de datos de esta cuenta o demo. No incluyen tokens de autenticación.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="font-bold text-white">Términos de uso</h4>
          <p className="mt-2 text-sm text-white/70">Usa AtletaHY como herramienta de apoyo. Eres responsable de revisar los entrenamientos y de usar información veraz.</p>
        </article>
        <article className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
          <h4 className="font-bold text-amber-100">Aviso médico</h4>
          <p className="mt-2 text-sm text-amber-50/75">Las recomendaciones no sustituyen diagnóstico ni atención médica. Detén el ejercicio y busca ayuda profesional ante dolor intenso o síntomas de alarma.</p>
        </article>
      </div>

      <div className="rounded-xl border border-white/10 p-4">
        <h4 className="font-bold text-white">Exportación local</h4>
        <p className="mt-2 text-sm text-white/70">Descarga un JSON con los recursos locales permitidos para la identidad activa.</p>
        <button type="button" onClick={handleExport} className="mt-3 rounded-full bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-black">
          Exportar mis datos locales
        </button>
      </div>

      <div className="rounded-xl border border-red-400/30 bg-red-950/20 p-4">
        <h4 className="font-bold text-red-100">Eliminación de cuenta</h4>
        <p className="mt-2 text-sm text-red-100/75">Esta operación elimina definitivamente la cuenta y sus datos asociados. Requiere confirmar dos veces y verificar de nuevo tu contraseña.</p>
        <label className="mt-4 flex items-start gap-3 text-sm text-red-50/85">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 accent-red-400" />
          Entiendo que la eliminación definitiva es irreversible y que perderé los datos asociados.
        </label>
        <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-red-100">
          Contraseña actual para verificar tu identidad
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={!authenticated || deleting} className="mt-2 w-full rounded-xl border border-red-300/30 bg-black/35 px-3 py-2 text-base text-white outline-none focus:border-red-300 disabled:opacity-45" />
        </label>
        <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-red-100">
          Escribe exactamente “{ACCOUNT_DELETION_CONFIRMATION}”
          <input value={phrase} onChange={(event) => setPhrase(event.target.value)} disabled={!authenticated} className="mt-2 w-full rounded-xl border border-red-300/30 bg-black/35 px-3 py-2 text-base text-white outline-none focus:border-red-300 disabled:opacity-45" />
        </label>
        {!authenticated ? <p className="mt-2 text-sm text-red-100/75">Inicia sesión para preparar una solicitud asociada a una cuenta.</p> : null}
        <button type="button" disabled={!canDelete} aria-busy={deleting} onClick={handleDeleteAccount} className="mt-4 rounded-full border border-red-300/60 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-100 disabled:cursor-not-allowed disabled:opacity-40">
          {deleting ? 'Eliminando cuenta...' : 'Eliminar cuenta definitivamente'}
        </button>
        {deletionStatus ? <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-red-100">{deletionStatus}</p> : null}
      </div>
    </section>
  );
}
