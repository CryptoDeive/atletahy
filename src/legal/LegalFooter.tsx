export function LegalFooter() {
  return (
    <footer className="relative mt-auto border-t border-white/10 bg-black/35 px-4 py-6 text-white/55">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs font-semibold sm:flex-row sm:text-left">
        <p>© 2026 AtletaHY · Servicio exclusivo para mayores de 18 años.</p>
        <nav aria-label="Información legal" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a className="transition hover:text-hyrox-gold" href="/aviso-legal">Aviso legal</a>
          <a className="transition hover:text-hyrox-gold" href="/politica-privacidad">Privacidad</a>
          <a className="transition hover:text-hyrox-gold" href="/politica-cookies">Cookies</a>
        </nav>
      </div>
    </footer>
  );
}
