import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { COMPANY, LEGAL_UPDATED_AT } from './legalConfig';

export type LegalDocument = 'notice' | 'privacy' | 'cookies';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 py-7 first:border-0 first:pt-0">
      <h2 className="font-display text-2xl uppercase leading-tight text-white sm:text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.98rem] font-medium leading-7 text-white/72">{children}</div>
    </section>
  );
}

function Identity() {
  return <p><strong className="text-white">{COMPANY.name}</strong>, NIF {COMPANY.nif}, domicilio en {COMPANY.address}, correo <a className="text-hyrox-gold underline-offset-4 hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>;
}

function Notice() {
  return <>
    <Section title="1. Titular del sitio"><Identity /><p>Datos registrales: {COMPANY.registry}. El sitio se presta en <strong className="text-white">{COMPANY.domain}</strong>.</p></Section>
    <Section title="2. Objeto y condiciones de uso"><p>AtletaHY facilita planificación de entrenamiento híbrido, registro de actividad y funciones de apoyo basadas en inteligencia artificial. El acceso implica utilizar el servicio de forma lícita, diligente y sin perjudicar a terceros o a la seguridad de la plataforma.</p><p>El servicio está dirigido exclusivamente a personas mayores de 18 años. Actualmente es gratuito, no incluye pagos, newsletter ni comunicaciones comerciales. Estas condiciones podrán actualizarse cuando cambie el servicio.</p></Section>
    <Section title="3. Salud, deporte e inteligencia artificial"><p>Los planes y recomendaciones son información general de apoyo deportivo. No constituyen diagnóstico, prescripción, tratamiento médico ni sustituyen la valoración de profesionales sanitarios o del deporte. Ante lesión, dolor intenso, mareo, dificultad respiratoria u otros síntomas de alarma, detén el ejercicio y solicita asistencia profesional.</p><p>La IA puede producir resultados inexactos. Revisa siempre las cargas y adaptaciones antes de aplicarlas. AtletaHY no adopta decisiones automatizadas que produzcan efectos jurídicos o similares sobre la persona usuaria.</p></Section>
    <Section title="4. Propiedad intelectual y marcas"><p>Los contenidos propios, diseño y software están protegidos por la normativa aplicable. No se autoriza su reproducción o explotación salvo permiso o límites legales. HYROX y sus signos distintivos pertenecen a sus titulares. AtletaHY es un proyecto independiente y no está afiliado, patrocinado ni aprobado por HYROX.</p></Section>
    <Section title="5. Responsabilidad y disponibilidad"><p>Se adoptan medidas razonables para mantener el servicio seguro y disponible, pero no se garantiza la ausencia absoluta de interrupciones, errores o pérdida de datos. La persona usuaria es responsable de facilitar información correcta, proteger sus credenciales y entrenar dentro de sus capacidades.</p></Section>
    <Section title="6. Legislación y jurisdicción"><p>Se aplica la legislación española. Cuando la persona usuaria tenga la condición de consumidora, serán competentes los juzgados y tribunales que establezca la normativa imperativa de consumidores, normalmente los de su domicilio; no se impone una renuncia a ese fuero. En los demás casos, se estará a las reglas legales de competencia.</p></Section>
  </>;
}

function Privacy() {
  return <>
    <Section title="1. Responsable del tratamiento"><Identity /><p>No existe un delegado de protección de datos designado. Las consultas y el ejercicio de derechos se atienden en {COMPANY.email}.</p></Section>
    <Section title="2. Datos tratados"><p>Según el uso que hagas del servicio podremos tratar: identificadores y contacto (cuenta y correo); perfil deportivo y objetivo; disponibilidad y equipamiento; registros de entrenamientos y pruebas; y datos técnicos imprescindibles para seguridad y sesión.</p><p>Si decides aportarlos, también se tratarán datos de salud —por ejemplo lesiones, dolor, alergias, frecuencia cardiaca, HRV, fatiga, sueño o recuperación— que son <strong className="text-white">categorías especiales de datos conforme al artículo 9 del RGPD</strong>.</p></Section>
    <Section title="3. Finalidades y bases jurídicas"><ul className="list-disc space-y-2 pl-5"><li>Crear y gestionar la cuenta y prestar las funciones solicitadas: ejecución de la relación de servicio.</li><li>Seguridad, prevención de abuso y defensa de reclamaciones: interés legítimo y obligaciones legales aplicables.</li><li>Tratar datos de salud para personalizar el entrenamiento: únicamente con consentimiento explícito, específico y revocable.</li><li>Comunicar datos de salud a servicios de IA para generar planes o consejos: consentimiento explícito separado. Rechazarlo no impide usar las funciones que no necesiten IA remota.</li></ul><p>La aceptación de los textos legales y la declaración de mayoría de edad se recaban separadamente de los consentimientos opcionales de salud e IA.</p></Section>
    <Section title="4. Inteligencia artificial"><p>Cuando activas expresamente la función de IA, los datos necesarios del perfil, estado, lesiones y actividad pueden enviarse desde Supabase a OpenAI para generar una respuesta. Se aplica minimización, pero no introduzcas datos de terceros ni información innecesaria. La respuesta se usa como apoyo y no existe una decisión automatizada con efectos jurídicos o equivalentes.</p></Section>
    <Section title="5. Destinatarios y proveedores"><p>Intervienen como proveedores tecnológicos: <strong className="text-white">Supabase</strong> para autenticación, base de datos y funciones (proyecto indicado en Irlanda); <strong className="text-white">Vercel</strong> para alojamiento web; y <strong className="text-white">OpenAI</strong> únicamente al solicitar funciones remotas de IA con el consentimiento correspondiente. También podrán comunicarse datos a autoridades cuando exista obligación legal.</p></Section>
    <Section title="6. Transferencias internacionales"><p>Algunos proveedores o subencargados pueden tratar datos fuera del Espacio Económico Europeo. Cuando ocurra, el responsable exigirá un mecanismo válido del capítulo V del RGPD —como decisión de adecuación o cláusulas contractuales tipo y, cuando proceda, medidas adicionales—. La localización principal en Irlanda no excluye por sí sola accesos o subencargados internacionales. Puedes solicitar información sobre las garantías aplicables.</p></Section>
    <Section title="7. Conservación"><p>Los datos se conservarán mientras la cuenta permanezca activa y sean necesarios para el servicio. Al solicitar la supresión o retirar un consentimiento se eliminarán o dejarán de tratar los datos afectados, salvo bloqueo durante los plazos necesarios para obligaciones legales o reclamaciones. Las copias de seguridad de proveedores pueden persistir de forma limitada hasta su rotación segura.</p></Section>
    <Section title="8. Derechos"><p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, así como retirar el consentimiento en cualquier momento sin afectar a la licitud del tratamiento previo. Escribe a {COMPANY.email}; podremos pedir información proporcionada para verificar tu identidad.</p><p>Si consideras que tus derechos no han sido atendidos, puedes reclamar ante la <a className="text-hyrox-gold underline-offset-4 hover:underline" href="https://www.aepd.es" rel="noreferrer" target="_blank">Agencia Española de Protección de Datos</a> (AEPD), en aepd.es.</p></Section>
    <Section title="9. Seguridad y personas menores"><p>Se aplican controles de acceso, aislamiento de datos por cuenta y medidas técnicas razonables, sin que ningún sistema conectado a Internet sea infalible. No deben utilizar el servicio menores de 18 años. Si se detecta una cuenta de una persona menor se adoptarán medidas para suprimirla.</p></Section>
  </>;
}

function Cookies() {
  return <>
    <Section title="1. Qué utiliza AtletaHY"><p>La aplicación no utiliza actualmente cookies analíticas, publicitarias, de personalización comercial ni píxeles de seguimiento. Por ello no se muestra un panel de consentimiento para cookies no esenciales. Si en el futuro se incorporan, se solicitará consentimiento antes de activarlas cuando sea obligatorio.</p></Section>
    <Section title="2. Inventario técnico"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-white"><tr><th className="border-b border-white/15 p-2">Tecnología</th><th className="border-b border-white/15 p-2">Finalidad</th><th className="border-b border-white/15 p-2">Duración</th></tr></thead><tbody><tr><td className="p-2 align-top">Supabase Auth / localStorage</td><td className="p-2 align-top">Mantener de forma estrictamente necesaria la sesión autenticada.</td><td className="p-2 align-top">Hasta cerrar sesión, caducar o borrar el almacenamiento.</td></tr><tr><td className="p-2 align-top">localStorage de AtletaHY</td><td className="p-2 align-top">Guardar preferencias y datos de entrenamiento en modo local/demo, separados por identidad.</td><td className="p-2 align-top">Hasta que se borren los datos locales o la cuenta.</td></tr><tr><td className="p-2 align-top">sessionStorage</td><td className="p-2 align-top">Conservar temporalmente la ruta de retorno y borradores de onboarding.</td><td className="p-2 align-top">Durante la sesión del navegador.</td></tr></tbody></table></div><p>El navegador o la infraestructura de Vercel/Supabase pueden generar datos técnicos o aplicar mecanismos imprescindibles de seguridad y balanceo. AtletaHY no usa esos datos para publicidad comportamental.</p></Section>
    <Section title="3. Cómo gestionar el almacenamiento"><p>Puedes borrar cookies y datos del sitio desde la configuración del navegador. Si bloqueas el almacenamiento estrictamente necesario, el inicio de sesión, la demo o los borradores pueden dejar de funcionar. También puedes cerrar sesión y utilizar las opciones de exportación o eliminación disponibles en la cuenta.</p></Section>
    <Section title="4. Fuentes y servicios externos"><p>AtletaHY no carga tipografías desde Google Fonts: utiliza fuentes instaladas en el dispositivo para evitar una conexión externa innecesaria. Los servicios de Supabase, Vercel y OpenAI se describen en la política de privacidad.</p></Section>
  </>;
}

const metadata = {
  notice: { eyebrow: 'Información del prestador', title: 'Aviso legal', content: <Notice /> },
  privacy: { eyebrow: 'Protección de datos', title: 'Política de privacidad', content: <Privacy /> },
  cookies: { eyebrow: 'Transparencia técnica', title: 'Política de cookies y almacenamiento local', content: <Cookies /> },
} satisfies Record<LegalDocument, { eyebrow: string; title: string; content: ReactNode }>;

export function LegalPage({ document }: { document: LegalDocument }) {
  const page = metadata[document];
  return (
    <article className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-hyrox-gold/20 bg-[linear-gradient(135deg,rgba(18,20,24,.98),rgba(5,5,5,.99))] p-6 shadow-panel sm:p-9">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-hyrox-gold/10 blur-3xl" aria-hidden="true" />
        <div className="relative"><p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.26em] text-hyrox-gold">{page.eyebrow}</p><h1 className="mt-4 max-w-4xl font-display text-4xl uppercase leading-[0.95] text-white sm:text-6xl">{page.title}</h1><p className="mt-5 text-sm font-semibold text-white/50">Última actualización: {LEGAL_UPDATED_AT}</p></div>
      </header>
      <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-hyrox-panel/75 p-5 shadow-panel sm:p-8">{page.content}</div>
      <div className="mt-6 flex flex-wrap gap-3"><Link className="rounded-full bg-hyrox-gold px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white" to="/">Volver a AtletaHY</Link><a className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold" href={`mailto:${COMPANY.email}`}>Contactar</a></div>
    </article>
  );
}
