import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  ArrowLeft,
  Lock,
  Database,
  ExternalLink,
  Cpu,
  RefreshCw,
  Trash2,
  Mail,
  CheckCircle2,
} from 'lucide-react';

interface LegalDocumentsPageProps {
  initialTab?: 'privacy' | 'terms';
  onNavigateHome: () => void;
  onNavigateToTab?: (tab: 'privacy' | 'terms') => void;
}

export const LegalDocumentsPage: React.FC<LegalDocumentsPageProps> = ({
  initialTab = 'privacy',
  onNavigateHome,
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: 'privacy' | 'terms') => {
    setActiveTab(tab);
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    } else {
      const path = tab === 'privacy' ? '/privacidad' : '/politicas';
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Barra superior de navegación */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors py-2 px-3 rounded-xl hover:bg-slate-100 cursor-pointer"
            title="Volver a la aplicación"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a GASTONAPP</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => handleTabChange('privacy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'privacy'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacidad (/privacidad)</span>
            </button>
            <button
              onClick={() => handleTabChange('terms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'terms'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Condiciones (/politicas)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {activeTab === 'privacy' ? (
          <article className="space-y-8 animate-in fade-in duration-300">
            {/* Cabecera de Privacidad */}
            <div className="border-b border-slate-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Documento Oficial de Privacidad</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Política de Privacidad de GASTONAPP
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Última actualización: 8 de octubre de 2026 • Accesible públicamente en /privacidad
              </p>
            </div>

            {/* Aviso especial de cumplimiento con Google API Services */}
            <div className="p-4 sm:p-5 bg-indigo-50 border border-indigo-200 rounded-2xl text-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
                <Lock className="w-4 h-4 text-indigo-700" />
                <span>Declaración de Uso Limitado de las APIs de Google (Google Limited Use Disclosure)</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-indigo-950">
                El uso y la transferencia que hace GASTONAPP de la información recibida a través de las APIs de Google a cualquier otra aplicación se adhiere estrictamente a la{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-700 underline inline-flex items-center gap-0.5"
                >
                  Política de Datos de Usuario de los Servicios de API de Google (Google API Services User Data Policy)
                  <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                </a>
                , incluidos los requisitos de Uso Limitado (Limited Use requirements).
              </p>
            </div>

            {/* 1. Responsable del Tratamiento */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">1</span>
                Identidad y Propósito de GASTONAPP
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                GASTONAPP es una aplicación web orientada al control financiero personal, planificación de presupuestos, registro de ingresos, control de gastos y simulación de compras. La aplicación está diseñada bajo el principio de soberanía del usuario: tus datos financieros no se concentran en servidores de terceros ni en bases de datos compartidas, sino en tus propios servicios personales vinculados.
              </p>
            </section>

            {/* 2. Datos recopilados */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">2</span>
                Datos de Usuario que se Procesan
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Perfil Básico de Google:</strong> Nombre completo, dirección de correo electrónico y fotografía de perfil pública para autenticar tu identidad y mostrarte tus finanzas personalizadas.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Registros Financieros Personales:</strong> Ingresos, gastos fijos, gastos variables, metas de ahorro e inversiones que introduces voluntariamente en la aplicación.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Comprobantes y Recibos:</strong> Imágenes o fotografías de facturas que decides subir para respaldar tus gastos, almacenadas en una carpeta dedicada de tu propio Google Drive.
                  </span>
                </li>
              </ul>
            </section>

            {/* 3. Permisos de Google Scopes */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">3</span>
                Permisos y Alcances de Google (OAuth 2.0 Scopes)
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Para funcionar de forma autónoma y sin servidores intermediarios, GASTONAPP solicita únicamente los permisos estrictamente necesarios:
              </p>
              <div className="space-y-2 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <code className="text-xs font-mono font-bold text-indigo-600">https://www.googleapis.com/auth/userinfo.profile</code>
                  <p className="text-xs text-slate-600 mt-1">
                    Permite identificar tu nombre en la interfaz y adaptar los mensajes del asesor financiero para no cruzar información con otros usuarios.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <code className="text-xs font-mono font-bold text-indigo-600">https://www.googleapis.com/auth/userinfo.email</code>
                  <p className="text-xs text-slate-600 mt-1">
                    Permite asociar de manera unívoca tu sesión y tu hoja de cálculo a tu cuenta de Google.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <code className="text-xs font-mono font-bold text-indigo-600">https://www.googleapis.com/auth/spreadsheets</code>
                  <p className="text-xs text-slate-600 mt-1">
                    Permite crear, leer y actualizar las filas de gastos, ingresos, ahorros e inversiones en tu planilla privada de Google Sheets dentro de tu propia cuenta de Google Drive.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <code className="text-xs font-mono font-bold text-indigo-600">https://www.googleapis.com/auth/drive.file</code>
                  <p className="text-xs text-slate-600 mt-1">
                    Permite crear y gestionar únicamente la carpeta específica «GASTONAPP - Comprobantes» en tu Google Drive para almacenar las fotos de los recibos que decidas cargar. GASTONAPP <strong>no</strong> accede a tus demás archivos personales en Drive.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Almacenamiento y No Venta de Datos */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">4</span>
                Almacenamiento, Resguardo y Prohibición de Venta
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tus datos financieros residen exclusivamente en:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 pl-2">
                <li>Tu propia cuenta de Google (Google Sheets y Google Drive).</li>
                <li>El almacenamiento local seguro de tu navegador web (localStorage).</li>
              </ul>
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs sm:text-sm font-medium mt-2">
                GASTONAPP no vende, no alquila, no monetiza ni comparte tus datos financieros o información de Google con terceros, empresas de publicidad, corredores de datos ni agentes crediticios.
              </div>
            </section>

            {/* 5. Procesamiento con Inteligencia Artificial */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">5</span>
                Procesamiento de Inteligencia Artificial (Asesor IA GASTON)
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Cuando utilizas el chat del Asesor IA:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    Se envían al motor de inferencia únicamente las métricas numéricas agregadas (ingresos registrados, gastos devengados y presupuesto restante) requeridas para darte el veredicto matemático y evitar que te quedes sin presupuesto antes de fin de mes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    No se transfieren claves bancarias, contraseñas ni números de tarjeta. Los datos no se utilizan para entrenar modelos públicos de inteligencia artificial.
                  </span>
                </li>
              </ul>
            </section>

            {/* 6. Revocación y Eliminación de Datos */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">6</span>
                Revocación de Permisos y Eliminación Definitiva
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tienes el control total en todo momento:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Revocar acceso a Google:</strong> Puedes desconectar la aplicación directamente pulsando «Cerrar Sesión» en GASTONAPP o ingresando a la configuración de seguridad de tu cuenta de Google en{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline font-semibold"
                    >
                      myaccount.google.com/permissions
                    </a>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Borrar datos:</strong> Puedes eliminar los datos locales desde el botón «Formatear Datos» en GASTONAPP. Dado que tu planilla y comprobantes están en tu Google Drive, puedes borrarlos directamente cuando lo desees sin intervención de nadie.
                  </span>
                </li>
              </ul>
            </section>

            {/* 7. Contacto */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">7</span>
                Contacto y Soporte
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ante cualquier duda, solicitud de aclaración o consulta sobre esta política de privacidad, puedes contactar al responsable del proyecto a través del repositorio oficial de código abierto o enviando un correo a soporte técnico.
              </p>
            </section>
          </article>
        ) : (
          <article className="space-y-8 animate-in fade-in duration-300">
            {/* Cabecera de Condiciones */}
            <div className="border-b border-slate-200 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200 mb-3">
                <FileText className="w-3.5 h-3.5" />
                <span>Condiciones del Servicio</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Condiciones de Servicio de GASTONAPP
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Última actualización: 8 de octubre de 2026 • Accesible públicamente en /politicas
              </p>
            </div>

            {/* 1. Aceptación */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">1</span>
                Aceptación de las Condiciones
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Al acceder y utilizar GASTONAPP, aceptas estar sujeto a estas Condiciones de Servicio. Si no estás de acuerdo con alguno de los términos aquí expuestos, debes abstenerte de utilizar la aplicación.
              </p>
            </section>

            {/* 2. Finalidad del servicio */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">2</span>
                Finalidad y Naturaleza de la Herramienta
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                GASTONAPP es una herramienta de software destinada a la gestión, simulación, proyección y organización financiera a título personal. Provee una interfaz para sincronizar datos con Google Sheets y Google Drive, así como diagnósticos matemáticos automáticos basados en la información proporcionada por el usuario.
              </p>
            </section>

            {/* 3. Descargo de responsabilidad financiera */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">3</span>
                Descargo de Responsabilidad Financiera
              </h2>
              <div className="p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs sm:text-sm leading-relaxed space-y-2">
                <p>
                  <strong>No constituye asesoría profesional regulada:</strong> Ni GASTONAPP ni el agente conversacional GASTON constituyen entidades bancarias, corredoras de bolsa, firmas de auditoría ni asesorías de inversión con matrícula profesional.
                </p>
                <p>
                  Las respuestas del asesor financiero y los simuladores de compra representan cálculos aritméticos y proyecciones basadas en los datos que tú ingresas. Eres el único y exclusivo responsable de tus decisiones económicas, contratos de deuda, gastos y planes de ahorro.
                </p>
              </div>
            </section>

            {/* 4. Uso de APIs y Servicios de Terceros */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">4</span>
                Uso de Servicios de Google y Terceros
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                El usuario es responsable de contar con una cuenta válida de Google para habilitar la persistencia en Google Sheets y Google Drive. GASTONAPP no asume responsabilidad por interrupciones de servicio atribuibles a Google Cloud, caídas de conectividad de internet o fallas en endpoints de proveedores LLM externos configurados por el usuario.
              </p>
            </section>

            {/* 5. Licencia y Código Abierto */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">5</span>
                Propiedad Intelectual y Licenciamiento
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                GASTONAPP se distribuye bajo un esquema de código abierto. Tienes derecho a inspeccionar el código fuente, ejecutar tu propia instancia en servidores privados y contribuir al proyecto respetando los términos de la licencia del repositorio.
              </p>
            </section>

            {/* 6. Modificaciones */}
            <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-700 font-bold">6</span>
                Actualización de las Condiciones
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nos reservamos el derecho de actualizar estas condiciones para adecuarlas a cambios regulatorios, nuevos requisitos de verificación de Google o incorporaciones funcionales en la aplicación. Toda modificación se reflejará públicamente en esta misma sección.
              </p>
            </section>
          </article>
        )}
      </main>

      {/* Pie de página con enlaces legales cruzados */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>GASTONAPP • Documentación Legal Oficial para Verificación de Google Cloud</p>
          <div className="flex items-center gap-4 font-semibold">
            <button
              onClick={() => handleTabChange('privacy')}
              className={`hover:underline cursor-pointer ${
                activeTab === 'privacy' ? 'text-indigo-600 font-bold' : 'text-slate-600'
              }`}
            >
              Política de Privacidad (/privacidad)
            </button>
            <span>•</span>
            <button
              onClick={() => handleTabChange('terms')}
              className={`hover:underline cursor-pointer ${
                activeTab === 'terms' ? 'text-indigo-600 font-bold' : 'text-slate-600'
              }`}
            >
              Condiciones de Servicio (/politicas)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
