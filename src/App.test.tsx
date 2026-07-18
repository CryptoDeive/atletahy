import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import App from './App';
import { validGeneratedTrainingPlan } from './test/planTestUtils';

describe('HYROX Planner UI', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  function renderDemoApp() {
    const result = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver demo' }));
    return result;
  }

  it('shows the public Home when there is no session', () => {
    render(<App />);

    expect(screen.getByText('ATLETAHY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Prepara tu HYROX con un plan que se adapta a ti/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Define tu competici.n, registra c.mo llegas cada d.a/i)).toBeInTheDocument();
    expect(screen.queryByText(/Supabase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Persistencia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Qu. analiza la IA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Todo lo que ya vive en tu semana/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Crear cuenta' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Iniciar sesi.n/ })).toBeInTheDocument();
    expect(screen.getByText(/AtletaHY es una aplicaci.n independiente/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Dashboard semanal/i })).not.toBeInTheDocument();
  });

  it('opens the compact access form on demand without technical copy', () => {
    render(<App />);

    expect(screen.queryByRole('region', { name: /Acceso a AtletaHY/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesi.n/ }));

    const authRegion = screen.getByRole('region', { name: /Acceso a AtletaHY/i });
    expect(within(authRegion).getByLabelText('Email')).toBeInTheDocument();
    expect(within(authRegion).getByLabelText(/Contrase.a/i)).toBeInTheDocument();
    expect(within(authRegion).getByRole('button', { name: /Iniciar sesi.n/ })).toBeInTheDocument();
    expect(within(authRegion).getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.queryByText(/Supabase|Persistencia|modo local/i)).not.toBeInTheDocument();
  });

  it('uses a public header on Home and a private header in the planner', () => {
    render(<App />);

    const publicHeader = screen.getByRole('banner');
    expect(within(publicHeader).getByText('ATLETAHY')).toBeInTheDocument();
    expect(within(publicHeader).getByText('HYBRID TRAINING WITH AI')).toBeInTheDocument();
    expect(within(publicHeader).getByRole('link', { name: /C.mo funciona/i })).toBeInTheDocument();
    expect(within(publicHeader).getByRole('link', { name: /Iniciar sesi.n/ })).toBeInTheDocument();
    expect(within(publicHeader).queryByRole('link', { name: 'Funcionalidades' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver demo' }));

    const privateHeader = screen.getByRole('banner');
    expect(within(privateHeader).getByText('HYROX Planner')).toBeInTheDocument();
    expect(within(privateHeader).getByRole('link', { name: 'Entrenamientos' })).toBeInTheDocument();
    expect(within(privateHeader).getByRole('link', { name: 'Tests & Ergs' })).toBeInTheDocument();
    expect(within(privateHeader).getByRole('link', { name: 'Mi perfil' })).toBeInTheDocument();
  });

  it('focuses AuthPanel in register mode from Crear cuenta CTA', () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Crear cuenta' })[0]);

    const authRegion = screen.getByRole('region', { name: /Acceso a AtletaHY/i });
    expect(authRegion).toHaveAttribute('data-auth-mode', 'register');
    expect(within(authRegion).getByLabelText('Email')).toHaveFocus();
  });

  it('renders the Tests & Ergs catalog from private navigation', async () => {
    renderDemoApp();

    fireEvent.click(screen.getByRole('link', { name: 'Tests & Ergs' }));

    expect(await screen.findByRole('heading', { name: 'Tests & Ergómetros', level: 2 })).toBeInTheDocument();
    expect(await screen.findByText('Test 2K SkiErg')).toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });

  it('removes the promotional hero and starts with a compact weekly planner', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T10:00:00'));

    renderDemoApp();

    expect(screen.queryByText(/PLANIFICA LA SEMANA\. ATACA EL SÁBADO\./i)).not.toBeInTheDocument();
    expect(screen.queryByText('Bienvenida')).not.toBeInTheDocument();

    const header = screen.getByRole('banner');
    const weekMeta = screen.getByText('Pretemporada · Preparatorio Base · Semana 5');
    const weekSelector = screen.getByRole('region', { name: /selector semanal/i });
    const training = document.getElementById('training');

    expect(header.compareDocumentPosition(weekMeta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weekMeta.compareDocumentPosition(weekSelector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(training).not.toBeNull();
    expect(weekSelector.compareDocumentPosition(training!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('selects Semana 5 by default when current date is between 2026-06-29 and 2026-07-05', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T10:00:00'));

    renderDemoApp();

    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 5 · Día 7')).toBeInTheDocument();
    expect(screen.getByText('Pretemporada · Preparatorio Base · Semana 5')).toBeInTheDocument();
  });

  it('selects Semana 6 by default when current date is between 2026-07-06 and 2026-07-12', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T10:00:00'));

    renderDemoApp();

    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 6 · Día 7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rodaje regenerativo', level: 2 })).toHaveClass('text-3xl');
    expect(screen.getByText('8 km Run')).toBeInTheDocument();
  });

  it('falls back to Semana 6 when current date is outside available weeks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T10:00:00'));

    renderDemoApp();

    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 6 · Día 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fuerza básica + Fuerza accesoria + Metcon', level: 2 })).toBeInTheDocument();
  });

  it('opens the calendar popup and changes active week from Semana 6 to Semana 5 and back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T10:00:00'));

    renderDemoApp();

    const calendarButton = screen.getByRole('button', { name: /abrir selector de semana/i });
    fireEvent.click(calendarButton);

    expect(screen.getByText('Julio de 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Semana 5 · 29 jun - 5 jul/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Semana 6 · 6 jul - 12 jul/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^5, Semana 5$/i }));

    expect(screen.queryByText('Julio de 2026')).not.toBeInTheDocument();
    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 5 · Día 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Base aeróbica + movilidad', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /abrir selector de semana/i }));
    fireEvent.click(screen.getByRole('button', { name: /Semana 6 · 6 jul - 12 jul/i }));

    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 6 · Día 7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rodaje regenerativo', level: 2 })).toBeInTheDocument();
  });

  it('shows unavailable calendar days as disabled buttons in the week picker', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T10:00:00'));

    renderDemoApp();

    fireEvent.click(screen.getByRole('button', { name: /abrir selector de semana/i }));

    const unavailableDay = screen.getByRole('button', { name: /^13, no disponible$/i });
    expect(unavailableDay).toBeDisabled();
    expect(screen.getAllByRole('button').filter((button) => button.hasAttribute('disabled')).length).toBeGreaterThan(0);

    fireEvent.click(unavailableDay);

    expect(screen.getByText('Julio de 2026')).toBeInTheDocument();
    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 6 · Día 7')).toBeInTheDocument();
  });

  it('changes training when the user manually selects another day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T10:00:00'));

    renderDemoApp();

    fireEvent.click(screen.getByRole('button', { name: /martes/i }));

    expect(screen.getByText('PRETEMPORADA · Preparatorio Base · Semana 6 · Día 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Jim Vance', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('30’ a la máxima intensidad sostenible')).toBeInTheDocument();
    expect(screen.getByText('LTHR = FC media de los últimos 20’')).toBeInTheDocument();
  });

  it('uses an active generated plan as the calendar source and renders its day details', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-07-15T10:00:00'));
    window.localStorage.setItem('atletahy:guest:training-plans', JSON.stringify({
      'plan-1': {
        id: 'plan-1',
        title: validGeneratedTrainingPlan.title,
        status: 'active',
        targetRaceDate: validGeneratedTrainingPlan.targetRaceDate,
        generatedAt: validGeneratedTrainingPlan.generatedAt,
        inputSnapshotJson: {},
        planJson: validGeneratedTrainingPlan,
        createdAt: validGeneratedTrainingPlan.generatedAt,
        updatedAt: validGeneratedTrainingPlan.generatedAt,
      },
    }));

    renderDemoApp();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Descanso activo', level: 2 })).toBeInTheDocument());
    expect(screen.getAllByText(/PLAN IA · Base aeróbica y técnica HYROX · Semana 1/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Pretemporada · Preparatorio Base · Semana 5/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /jueves/i }));
    expect(screen.getByRole('heading', { name: 'Circuito HYROX controlado', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Coach IA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Registro del entrenamiento', level: 3 })).toBeInTheDocument();
    expect(screen.queryByText(/Resumen del bloque/i)).not.toBeInTheDocument();
  });

  it('does not render the Bienvenida section or introductory Saturday copy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T10:00:00'));

    renderDemoApp();

    expect(screen.queryByText('Bienvenida')).not.toBeInTheDocument();
    expect(screen.queryByText('Sesión híbrida enfocada en resistencia específica HYROX.')).not.toBeInTheDocument();
    expect(screen.queryByText('Controla el ritmo y evita salir demasiado fuerte.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Engine', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strength/i })).toBeInTheDocument();
    expect(screen.getByText('Cargas PRO')).toBeInTheDocument();
    expect(screen.getByText('Sandbag: 70 / 45 kg')).toBeInTheDocument();
    expect(screen.getByText('Cargas Normal')).toBeInTheDocument();
  });

  it('shows Activo on the selected day even when that day is completed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T10:00:00'));

    renderDemoApp();

    const mondayCard = screen.getByRole('button', { name: /lunes/i });
    expect(within(mondayCard).getByText('Activo')).toBeInTheDocument();
    expect(within(mondayCard).queryByText('Completado')).not.toBeInTheDocument();
  });

  it('uses section collapsed state as accordion initial state and toggles it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T10:00:00'));

    renderDemoApp();

    const enduranceButton = screen.getByRole('button', { name: /Endurance/i });
    expect(enduranceButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('200 m SkiErg')).toBeInTheDocument();

    fireEvent.click(enduranceButton);

    expect(enduranceButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('200 m SkiErg')).not.toBeInTheDocument();
  });

  it('does not render placeholder question marks for icons or corrupted labels', () => {
    renderDemoApp();

    expect(screen.queryByText('?')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Preparaci' + '?' + 'n');
    expect(document.body.textContent).not.toContain('D' + '?' + 'a');
    expect(document.body.textContent).not.toContain('S' + '?' + 'bado');
    expect(document.body.textContent).not.toContain('Ã');
    expect(document.body.textContent).not.toContain('Â');
  });

  it('keeps the private navigation with trainings, tests and account', () => {
    renderDemoApp();

    const nav = screen.getByRole('navigation', { name: /principal/i });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
    expect(within(nav).getByRole('link', { name: 'Entrenamientos' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Plan IA' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Tests & Ergs' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Mi cuenta' })).not.toBeInTheDocument();
  });

  it('opens Mi perfil without technical persistence copy and keeps access back to training', async () => {
    renderDemoApp();

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));

    expect(await screen.findByRole('heading', { name: 'Mi perfil', level: 2 })).toBeInTheDocument();
    for (const tab of ['Perfil', 'Fisiología', 'Disponibilidad', 'Material', 'Lesiones', 'Nutrición', 'Check-in']) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar configuración inicial' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Mi cuenta|Supabase|localStorage|Persistencia|Resumen local/i);

    fireEvent.click(screen.getByRole('button', { name: /volver a entrenamientos/i }));

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByText(/Pretemporada · Preparatorio Base · Semana/i).length).toBeGreaterThan(0);
  });

  it('renders the main basic profile fields in Mi perfil', async () => {
    renderDemoApp();

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));

    expect((await screen.findAllByText('Nombre')).length).toBeGreaterThan(0);
    expect(screen.getByText('Edad')).toBeInTheDocument();
    expect(screen.getAllByText('Peso').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Categoría HYROX').length).toBeGreaterThan(0);
    expect(screen.getByText('Objetivo')).toBeInTheDocument();
    expect(screen.getByText('Fecha de competición')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de nacimiento')).toBeInTheDocument();
    expect(screen.getByText('Edad calculada')).toBeInTheDocument();
    expect(screen.getByLabelText('Altura (cm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Peso (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('Sexo')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoría HYROX')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha objetivo')).toBeInTheDocument();
    expect(screen.getByLabelText('Objetivo principal')).toBeInTheDocument();
  });

  it('shows Mi perfil summary and profile save feedback', async () => {
    renderDemoApp();

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));

    fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Deivi' } });
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1990-05-10' } });
    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '78' } });
    fireEvent.change(screen.getByLabelText('Fecha objetivo'), { target: { value: '2026-11-22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('Deivi')).toBeInTheDocument();
    expect(screen.getByText('78 kg')).toBeInTheDocument();
    expect(screen.getAllByText('2026-11-22').length).toBeGreaterThan(0);
    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument();
  });

  it('saves a daily check-in in local state', async () => {
    renderDemoApp();

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Check-in' }));

    fireEvent.change(screen.getByLabelText('Horas de sueño'), { target: { value: '7.5' } });
    fireEvent.change(screen.getByLabelText('Estrés (1-5)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Motivación (1-5)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Notas del check-in'), { target: { value: 'Piernas frescas.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar check-in' }));

    expect(screen.getByText('Check-in guardado para hoy.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Piernas frescas.')).toBeInTheDocument();
  });

  it('saves a workout log from the active training view', () => {
    renderDemoApp();

    expect(screen.getByRole('heading', { name: 'Registro del entrenamiento', level: 3 })).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /abrir registro del entrenamiento/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Duración (min)')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText('Estado del entrenamiento'), { target: { value: 'completado' } });
    fireEvent.change(screen.getByLabelText('Duración (min)'), { target: { value: '62' } });
    fireEvent.change(screen.getByLabelText('RPE sesión (1-10)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Porcentaje completado'), { target: { value: '95' } });
    fireEvent.change(screen.getByLabelText('Qué fue bien'), { target: { value: 'Ritmo estable.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));

    expect(screen.getByText('Registro guardado')).toBeInTheDocument();
    expect(screen.getByText('62 min')).toBeInTheDocument();
    expect(screen.getByText('RPE 8')).toBeInTheDocument();
    expect(screen.getByText('95% completado')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ritmo estable.')).toBeInTheDocument();
  });

  it('renders weekly dashboard with empty-week message without hiding Coach IA', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T10:00:00'));

    renderDemoApp();

    const dashboard = screen.getByRole('region', { name: /dashboard semanal/i });
    expect(within(dashboard).getByText('Semana 6')).toBeInTheDocument();
    expect(within(dashboard).getByText('Sin registros esta semana')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Coach IA' })).toBeInTheDocument();
  });

  it('updates day card and weekly dashboard after saving a completed workout log', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T10:00:00'));

    renderDemoApp();

    fireEvent.click(screen.getByRole('button', { name: /abrir registro del entrenamiento/i }));
    fireEvent.change(screen.getByLabelText('Estado del entrenamiento'), { target: { value: 'completado' } });
    fireEvent.change(screen.getByLabelText(/Duraci/), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/RPE sesi/), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));

    const mondayCard = screen.getByRole('button', { name: /lunes/i });
    expect(within(mondayCard).getByText('Completado')).toBeInTheDocument();
    const dashboard = screen.getByRole('region', { name: /dashboard semanal/i });
    expect(within(dashboard).getByText('1 / 7')).toBeInTheDocument();
    expect(within(dashboard).getByText('350')).toBeInTheDocument();
  });

  it('updates day card and dashboard after saving a partial workout log', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T10:00:00'));

    renderDemoApp();

    fireEvent.click(screen.getByRole('button', { name: /abrir registro del entrenamiento/i }));
    fireEvent.change(screen.getByLabelText('Estado del entrenamiento'), { target: { value: 'parcial' } });
    fireEvent.change(screen.getByLabelText(/Duraci/), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/RPE sesi/), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));

    const mondayCard = screen.getByRole('button', { name: /lunes/i });
    expect(within(mondayCard).getByText('Parcial')).toBeInTheDocument();
    const dashboard = screen.getByRole('region', { name: /dashboard semanal/i });
    expect(within(dashboard).getByText(/Parciales/)).toBeInTheDocument();
    expect(within(dashboard).getByText('1')).toBeInTheDocument();
  });

  it('starts Coach IA collapsed and compact', () => {
    renderDemoApp();

    const region = screen.getByRole('region', { name: 'Coach IA' });
    const button = within(region).getByRole('button', { name: /Generar consejo/i });
    const toggle = within(region).getByRole('button', { name: /abrir coach ia/i });

    expect(button).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Genera una estrategia personalizada para este entrenamiento.')).toBeInTheDocument();
    expect(screen.queryByText(/Resumen/i)).not.toBeInTheDocument();
  });

  it('opens Coach IA after generating advice', async () => {
    renderDemoApp();

    const region = screen.getByRole('region', { name: 'Coach IA' });
    const button = within(region).getByRole('button', { name: /Generar consejo/i });

    fireEvent.click(button);

    expect((await screen.findAllByText(/Estado Verde|Estado Amarillo|Estado Rojo/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nutrición/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pacing/i).length).toBeGreaterThan(0);

    const closeButton = within(region).getByRole('button', { name: /cerrar coach ia/i });
    expect(closeButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows a check-in reminder before generating Coach IA advice when daily check-in is empty', () => {
    renderDemoApp();

    expect(screen.getByText('Completa el check-in diario en Mi cuenta para recibir un consejo más preciso.')).toBeInTheDocument();
  });
});





