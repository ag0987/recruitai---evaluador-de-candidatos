import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  TrendingUp, 
  Trophy, 
  Target,
  ChevronRight,
  ClipboardList,
  Zap
} from 'lucide-react';
import { evaluateCandidate, CandidateEvaluation } from './lib/gemini';
import { parsePDF, parseDOCX } from './lib/fileParser';

// --- Types ---
interface FileWithContent {
  id: string;
  name: string;
  fileType: string; // ej: 'txt', 'pdf', 'docx', 'doc'
  content: string;
  evaluation?: CandidateEvaluation;
  status: 'loading' | 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

// --- Components ---

const RecommendationBadge = ({ rec }: { rec: CandidateEvaluation['recommendation'] }) => {
  const styles = {
    Avanzar: 'bg-success-green/10 text-success-green border-success-green/20',
    Considerar: 'bg-warning-yellow/10 text-warning-yellow border-warning-yellow/20',
    Descartar: 'bg-danger-red/10 text-danger-red border-danger-red/20',
  };

  const Icons = {
    Avanzar: CheckCircle2,
    Considerar: AlertCircle,
    Descartar: XCircle,
  };

  const Icon = Icons[rec];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${styles[rec]}`}>
      <Icon size={12} />
      {rec}
    </span>
  );
};

export default function App() {
  const [jd, setJd] = useState('');
  const [candidates, setCandidates] = useState<FileWithContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files) as File[];
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      fileType: getFileType(file),
      content: '',
      status: 'loading' as const,
    }));

    setCandidates(prev => [...prev, ...newFiles]);

    files.forEach(async (file, index) => {
      const fileId = newFiles[index].id;
      const name = file.name.toLowerCase();

      try {
        if (name.endsWith('.txt')) {
          const content = await file.text();
          setCandidates(prev => prev.map(c =>
            c.id === fileId ? { ...c, content, status: 'idle' } : c
          ));
        } else if (name.endsWith('.pdf')) {
          const { text, isScanned } = await parsePDF(file);
          if (isScanned) {
            setCandidates(prev => prev.map(c =>
              c.id === fileId ? {
                ...c,
                status: 'error',
                errorMessage: 'PDF escaneado: no contiene texto digital. Pide al candidato una versión editable de su CV.',
              } : c
            ));
          } else {
            setCandidates(prev => prev.map(c =>
              c.id === fileId ? { ...c, content: text, status: 'idle' } : c
            ));
          }
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          const content = await parseDOCX(file);
          setCandidates(prev => prev.map(c =>
            c.id === fileId ? { ...c, content, status: 'idle' } : c
          ));
        } else {
          setCandidates(prev => prev.map(c =>
            c.id === fileId ? { ...c, status: 'error', errorMessage: 'Formato no soportado. Usa .txt, .pdf o .docx' } : c
          ));
        }
      } catch {
        setCandidates(prev => prev.map(c =>
          c.id === fileId ? { ...c, status: 'error', errorMessage: 'Error al procesar el archivo.' } : c
        ));
      }
    });
  };

  const getFileType = (file: File): string => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt')) return 'TXT';
    if (name.endsWith('.pdf')) return 'PDF';
    if (name.endsWith('.docx')) return 'DOCX';
    if (name.endsWith('.doc')) return 'DOC';
    return 'OTRO';
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const runEvaluation = async () => {
    if (!jd.trim() || candidates.length === 0) return;

    setIsProcessing(true);
    
    // Mark all as processing
    setCandidates(prev => prev.map(c => 
      c.status === 'completed' ? c : { ...c, status: 'processing' }
    ));

    try {
      await Promise.all(candidates.map(async (candidate, index) => {
        if (candidate.status === 'completed') return;

        try {
          const evalResult = await evaluateCandidate(jd, candidate.content);
          setCandidates(prev => prev.map(c => 
            c.id === candidate.id 
              ? { ...c, evaluation: evalResult, status: 'completed' } 
              : c
          ));
        } catch (error) {
          console.error(`Error evaluating ${candidate.name}:`, error);
          setCandidates(prev => prev.map(c => 
            c.id === candidate.id ? { ...c, status: 'error' } : c
          ));
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDemoData = () => {
    // Clear previous results first
    setCandidates([]);
    setJd('');

    const demoJd = `Puesto: Senior Frontend Developer (React/TypeScript)

Descripción:
Buscamos un Ingeniero de Software Senior especializado en Frontend para liderar el desarrollo de nuestras interfaces de usuario de alta fidelidad. Serás responsable de la arquitectura de componentes, la optimización del rendimiento y la mentoría de desarrolladores junior.

Requisitos Obligatorios:
- Más de 5 años de experiencia comprobable en desarrollo web.
- Dominio experto de React.js y su ecosistema (Hooks, Context, Redux).
- Experiencia sólida con TypeScript en entornos de producción.
- Conocimientos profundos de CSS moderno (Tailwind CSS, Styled Components).
- Experiencia en integración de APIs RESTful y GraphQL.

Deseable:
- Conocimientos en servicios de nube (AWS o Azure).
- Experiencia en testing unitario y de integración (Jest, Cypress).
- Mentalidad de diseño y atención al detalle.

Idiomas:
- Inglés técnico fluido (leído y escrito).`;

    const demoCandidates: FileWithContent[] = [
      {
        id: 'demo-1',
        name: 'CV_Carlos_Ruiz.docx',
        fileType: 'DOCX',
        content: `Nombre: Carlos Javier Ruiz
Perfil: Ingeniero de Software Senior con más de 8 años de experiencia.

Experiencia Profesional:
- Principal Frontend Engineer en TechGlobal (2020 - Actualidad):
  Arquitectura de micro-frontends usando React y TypeScript. Implementación de sistemas de diseño corporativos con Tailwind CSS. Optimización de bundles reduciendo el tiempo de carga en un 40%.
- Senior Web Developer en InnovaSoft (2016 - 2020):
  Desarrollo de SPAs complejas con React y Redux. Liderazgo de un equipo de 5 personas.

Habilidades Técnicas:
- React (Experto), TypeScript (Experto), Next.js, GraphQL, AWS Lambda.
- Testing: Jest, React Testing Library, Cypress.
- Herramientas: Docker, CI/CD, Git.

Formación:
- Grado en Ingeniería Informática, Universidad Politécnica.

Idiomas:
- Inglés: C1 (Avanzado).`,
        status: 'idle'
      },
      {
        id: 'demo-2',
        name: 'CV_Elena_Mendez.txt',
        fileType: 'TXT',
        content: `Elena Méndez Silva
Desarrolladora Frontend Especialista en React

Resumen:
Apasionada por la creación de interfaces de usuario hermosas y funcionales. 6 años enfocada exclusivamente en el ecosistema de React.

Experiencia:
- Senior Frontend Developer en PixelCreative (2019 - Presente):
  Desarrollo de interfaces visuales de alta precisión basándose en diseños de Figma. Uso constante de React Hooks y Context API para la gestión de estados.
- Frontend Developer en StartUpX (2017 - 2019):
  Creación de componentes reutilizables y mantenimiento de bibliotecas de UI internas.

Habilidades:
- React.js, JavaScript (ES6+), HTML5, CSS3, SASS.
- Manejo fluido de Tailwind CSS y Framer Motion para animaciones.
- Integración de APIs REST.

Educación:
- Licenciatura en Diseño y Desarrollo Web.

Logros:
- Rediseño completo del portal de e-commerce de la empresa, aumentando la tasa de conversión en un 15%.`,
        status: 'idle'
      },
      {
        id: 'demo-3',
        name: 'CV_Juan_Duarte.txt',
        fileType: 'TXT',
        content: `Juan Pablo Duarte
Desarrollador Full Stack (Enfoque Backend)

Experiencia:
- Full Stack Developer en DataLogic (2018 - Actualmente):
  Desarrollo de servicios backend utilizando Node.js y Express. Gestión de bases de datos PostgreSQL. Colaboración en el frontend con React básico para paneles de administración internos.
- Junior Backend en SoftSolutions (2016 - 2018):
  Mantenimiento de bases de datos y creación de scripts en Python.

Tecnologías:
- Node.js, Express, PostgreSQL, Redis, Python.
- Frontend: HTML, CSS, React (Nivel Intermedio), JavaScript.
- DevOps: AWS (EC2, S3), Git.

Idiomas:
- Inglés: B2 (Intermedio-Alto).`,
        status: 'idle'
      },
      {
        id: 'demo-4',
        name: 'CV_Lucia_Ferrand.txt',
        fileType: 'TXT',
        content: `CURRICULUM VITAE

Nombre: Lucía Ferrand
Objetivo: Busco mi primera oportunidad laboral en el mundo de la tecnología como desarrolladora Junior.

Formación:
- Bootcamp Full Stack Developer (600 horas) - 2025
- Grado en Administración de Empresas - 2022

Proyectos:
- "Mi Primera Web": Una landing page responsiva usando HTML y CSS.
- "Lista de Tareas": App sencilla en JavaScript para gestionar tareas diarias.

Habilidades en aprendizaje:
- HTML, CSS, JavaScript básico.
- Nociones de React y Git.

Experiencia anterior:
- Asistente Administrativa en Impuestos S.A. (2022 - 2024).`,
        status: 'idle'
      },
      {
        id: 'demo-5',
        name: 'CV_Candidato_Desconocido.txt',
        fileType: 'TXT',
        content: `PROFESIONAL DE TECNOLOGÍA

Perfil General:
Con más de 4 años en la industria del software, me he desempeñado como desarrollador web enfocado en soluciones corporativas.

Experiencia Laboral:
- Web Developer en Banco Nacional (2021 - Actualidad):
  Mantenimiento del sitio institucional y desarrollo de nuevas funcionalidades usando JavaScript y PHP. Colaboración en el frontend con frameworks modernos.
- Soporte Técnico en IT Solutions (2019 - 2021):
  Resolución de incidencias de hardware y software para clientes corporativos.

Conocimientos:
- JavaScript, PHP, MySQL, HTML, CSS.
- Manejo de librerías como jQuery y Bootstrap.
- Experiencia trabajando bajo metodologías Ágiles (Scrum).

Estudios:
- Técnico Superior en Sistemas de Información.`,
        status: 'idle'
      },
      {
        id: 'demo-6',
        name: 'CV_Roberto_Gastronomia.txt',
        fileType: 'TXT',
        content: `Roberto Salinas Mora
Cocinero Profesional y Chef de Cocina

Experiencia Laboral:
- Chef Principal en Restaurante La Parrilla Real (2018 - Actualidad):
  Diseño de menús de temporada, gestión del equipo de cocina (8 personas), control de inventario y costos de materia prima.
- Cocinero en Hotel Boutique El Mirador (2015 - 2018):
  Preparación de desayunos, almuerzos y cenas para huéspedes. Atención a dietas especiales y alergias alimentarias.
- Ayudante de Cocina en Catering Eventos Premium (2013 - 2015):
  Apoyo en eventos corporativos y sociales para más de 500 personas.

Formación:
- Técnico en Gastronomía y Alta Cocina - Instituto Culinario Nacional (2013)
- Curso de Pastelería Francesa - Escuela Le Cordon Bleu, Ciudad de México (2016)
- Certificación en Manipulación Higiénica de Alimentos - INVIMA (2019)

Habilidades:
- Cocina francesa, italiana y latinoamericana.
- Gestión de equipos y liderazgo en cocina.
- Control de costos y elaboración de menús.
- Creatividad e innovación en platos.

Idiomas:
- Español: Nativo. Inglés: Básico (para lectura de recetas).`,
        status: 'idle'
      },
      {
        id: 'demo-7',
        name: 'CV_Sin_Informacion.txt',
        fileType: 'TXT',
        content: `Ana Torres

Desarrolladora web.

Sé React y tengo experiencia en frontend.`,
        status: 'idle'
      },
      {
        id: 'demo-8',
        name: 'CV_Escaneado.pdf',
        fileType: 'PDF',
        content: '',
        status: 'error',
        errorMessage: 'PDF escaneado: no contiene texto digital. Pide al candidato una versión editable de su CV.',
      },
      {
        id: 'demo-9',
        name: 'CV_Datos_Corruptos.pdf',
        fileType: 'PDF',
        content: '',
        status: 'error',
        errorMessage: 'Error al procesar el archivo. El PDF está dañado o tiene un formato no compatible.',
      }
    ];

    setJd(demoJd);
    setCandidates(demoCandidates);
    
    // Auto-trigger evaluation
    setTimeout(() => {
      // Need to use the values directly as state update is async
      runEvaluationImplicit(demoJd, demoCandidates);
    }, 500);
  };

  const runEvaluationImplicit = async (jdText: string, candidatesList: FileWithContent[]) => {
    setIsProcessing(true);

    setCandidates(prev => prev.map(c =>
      c.status === 'error' ? c : { ...c, status: 'processing' }
    ));

    try {
      await Promise.all(candidatesList.map(async (candidate) => {
        if (candidate.status === 'completed' || candidate.status === 'error') return;

        try {
          const evalResult = await evaluateCandidate(jdText, candidate.content);
          setCandidates(prev => prev.map(c =>
            c.id === candidate.id
              ? { ...c, evaluation: evalResult, status: 'completed' }
              : c
          ));
        } catch (error) {
          console.error(`Error evaluating ${candidate.name}:`, error);
          setCandidates(prev => prev.map(c =>
            c.id === candidate.id ? { ...c, status: 'error' } : c
          ));
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const sortedCandidates = [...candidates]
    .filter(c => c.evaluation)
    .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0));

  const topThree = sortedCandidates.slice(0, 3);

  return (
    <div className="min-h-screen bg-bg-deep text-text-main font-sans italic-serif-headers overflow-x-hidden">
      {/* Header */}
      <header className="bg-bg-card border-b border-border-dark px-8 py-5 sticky top-0 z-10 backdrop-blur-md bg-bg-card/90 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-accent-blue p-2 rounded-lg">
            <ClipboardList className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-accent-blue font-sans">RECRUIT.AI</h1>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={loadDemoData}
            className="flex items-center gap-2 text-[12px] font-bold text-text-dim hover:text-accent-blue transition-colors px-3 py-1.5 rounded-full border border-border-dark hover:border-accent-blue bg-bg-input"
          >
            <Zap size={14} className="text-warning-yellow" />
            Cargar Demo
          </button>
          <span className="text-[13px] text-text-dim hidden sm:block">Dashboard de Evaluación • v1.2.0</span>
          <button
            onClick={runEvaluation}
            disabled={isProcessing || !jd || candidates.length === 0}
            className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg text-sm
              ${isProcessing || !jd || candidates.length === 0
                ? 'bg-bg-input text-text-dim cursor-not-allowed border border-border-dark'
                : 'bg-accent-blue text-white hover:brightness-110 active:scale-95'}`}
          >
            {isProcessing ? 'Procesando...' : 'Analizar Candidatos'}
            {!isProcessing && <ChevronRight size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sidebar (320px logic via lg grid) */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-bg-card p-5 rounded-xl border border-border-dark">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-dim mb-4 flex items-center gap-2 font-sans italic-none">
              <TrendingUp size={14} className="text-accent-blue" />
              1. Descripción del Cargo
            </h2>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Pega aquí la descripción del cargo, requisitos y competencias..."
              className="w-full h-48 p-4 rounded-lg bg-bg-input border border-border-dark focus:border-accent-blue focus:ring-1 focus:ring-accent-blue outline-none transition-all resize-none text-[13px] leading-relaxed text-text-main placeholder:text-text-dim/50"
            />
          </section>

          <section className="bg-bg-card p-5 rounded-xl border border-border-dark flex flex-col h-[400px]">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-dim mb-4 flex items-center gap-2 font-sans italic-none">
              <Upload size={14} className="text-accent-blue" />
              2. Cargar Candidatos (.txt, .pdf, .docx)
            </h2>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-border-dark rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-accent-blue/5 hover:bg-accent-blue/10 transition-colors cursor-pointer group relative flex-grow"
            >
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="bg-bg-input p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-border-dark">
                <FileText className="text-accent-blue" size={24} />
              </div>
              <p className="text-[13px] text-text-main font-medium text-center">Arrastra archivos aquí o haz clic</p>
              <p className="text-[11px] text-text-dim text-center opacity-70">Máx. 10 archivos (TXT, PDF, DOCX)</p>
            </div>

            {/* Candidate List (Queue) */}
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {/* Barra de estado detallada */}
              {candidates.length > 0 && (() => {
                const loading    = candidates.filter((c: FileWithContent) => c.status === 'loading').length;
                const processing = candidates.filter((c: FileWithContent) => c.status === 'processing').length;
                const idle       = candidates.filter((c: FileWithContent) => c.status === 'idle').length;
                const completed  = candidates.filter((c: FileWithContent) => c.status === 'completed').length;
                const errors     = candidates.filter((c: FileWithContent) => c.status === 'error').length;
                return (
                  <div className="px-3 py-2 rounded-lg bg-bg-deep border border-border-dark mb-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
                      {candidates.length} archivo{candidates.length !== 1 ? 's' : ''}
                    </span>
                    {(loading + processing) > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-accent-blue">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                        {loading + processing} procesando
                      </span>
                    )}
                    {idle > 0 && (
                      <span className="text-[10px] font-bold text-warning-yellow">
                        {idle} en cola
                      </span>
                    )}
                    {completed > 0 && (
                      <span className="text-[10px] font-bold text-success-green">
                        ✓ {completed} {completed === 1 ? 'listo' : 'listos'}
                      </span>
                    )}
                    {errors > 0 && (
                      <span className="text-[10px] font-bold text-danger-red">
                        ⚠ {errors} con error
                      </span>
                    )}
                  </div>
                );
              })()}

              {candidates.map((c) => {
                const badgeColors: Record<string, string> = {
                  PDF:  'text-danger-red bg-danger-red/10',
                  DOCX: 'text-accent-blue bg-accent-blue/10',
                  DOC:  'text-accent-blue bg-accent-blue/10',
                  TXT:  'text-text-dim bg-bg-deep',
                };
                const badge = badgeColors[c.fileType] ?? 'text-text-dim bg-bg-deep';
                return (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={c.id}
                  className={`flex items-start justify-between p-2.5 bg-bg-input rounded-lg border transition-all ${
                    c.status === 'error' ? 'border-danger-red/50 bg-danger-red/5' : 'border-border-dark'
                  }`}
                >
                  <div className="flex items-start gap-2 overflow-hidden flex-1">
                    <FileText size={14} className="text-text-dim flex-shrink-0 mt-0.5" />
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${badge}`}>
                          {c.fileType}
                        </span>
                        <span className="text-[12px] font-medium truncate text-text-main">
                          {c.evaluation?.name || c.name}
                        </span>
                      </div>
                      {c.errorMessage && (
                        <p className="text-[10px] text-danger-red mt-1 leading-snug">
                          ⚠ {c.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estado del archivo */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {c.status === 'loading' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 border-2 border-warning-yellow border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-warning-yellow font-bold">Leyendo...</span>
                      </div>
                    )}
                    {c.status === 'idle' && (
                      <button 
                        onClick={() => removeCandidate(c.id)} 
                        className="text-text-dim hover:text-danger-red transition-colors flex-shrink-0"
                        title="Eliminar archivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {c.status === 'processing' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-accent-blue font-bold">Evaluando...</span>
                      </div>
                    )}
                    {c.status === 'completed' && (
                      <CheckCircle2 size={16} className="text-success-green flex-shrink-0" />
                    )}
                    {c.status === 'error' && (
                      <AlertCircle 
                        size={16} 
                        className="text-danger-red flex-shrink-0"
                        title={c.errorMessage || 'Error en el archivo'}
                      />
                    )}
                  </div>
                </motion.div>
              ); })}
              {candidates.length === 0 && (
                <div className="text-center py-4 text-[10px] text-text-dim uppercase tracking-[0.2em] opacity-40">
                  Sin candidatos en cola
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!sortedCandidates.length ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-bg-card rounded-2xl border border-border-dark p-16 text-center h-full flex flex-col items-center justify-center border-dashed"
              >
                <div className="bg-accent-blue/10 w-24 h-24 rounded-full flex items-center justify-center mb-8 border border-accent-blue/20">
                  <ClipboardList className="text-accent-blue" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-text-main mb-3 italic">Esperando evaluación</h3>
                <p className="text-text-dim max-w-sm mx-auto text-sm leading-relaxed">
                  Combine la descripción del cargo con los CVs correspondientes para iniciar el análisis objetivo en tiempo real.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Ranking Summary Table */}
                <section className="bg-bg-card rounded-xl border border-border-dark overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-border-dark flex justify-between items-center bg-white/[0.02]">
                    <h2 className="text-[12px] font-bold text-text-dim uppercase tracking-widest italic-none">Comparativa de Candidatos</h2>
                    <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">LIVE ANALYSIS</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="bg-white/[0.01]">
                          <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[11px]">Candidato</th>
                          <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[11px] text-center">Score</th>
                          <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[11px]">Recomendación</th>
                          <th className="px-6 py-4 font-bold text-text-dim uppercase tracking-wider text-[11px] text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-dark">
                        {sortedCandidates.map((c, i) => (
                          <tr key={c.id} className="group hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  i === 0 ? 'bg-warning-yellow/20 text-warning-yellow' : 'bg-bg-input text-text-dim'
                                }`}>
                                  {i + 1}
                                </span>
                                <span className="font-bold text-text-main text-[14px]">{c.evaluation?.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className={`px-2 py-1 rounded inline-block font-black font-mono text-base ${
                                (c.evaluation?.score || 0) >= 8 ? 'bg-success-green/10 text-success-green' :
                                (c.evaluation?.score || 0) >= 6 ? 'bg-warning-yellow/10 text-warning-yellow' :
                                'bg-danger-red/10 text-danger-red'
                              }`}>
                                {c.evaluation?.score}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {c.evaluation && <RecommendationBadge rec={c.evaluation.recommendation} />}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <a href={`#details-${c.id}`} className="text-accent-blue hover:underline font-bold inline-flex items-center gap-1">
                                Ver <ChevronRight size={14} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Individual Details Section */}
                <div className="space-y-6">
                  {sortedCandidates.map((c) => (
                    <motion.article
                      key={`card-${c.id}`}
                      id={`details-${c.id}`}
                      className="bg-bg-card rounded-xl p-8 border border-border-dark shadow-lg group relative"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10 border-b border-border-dark pb-8">
                        <div>
                          <h4 className="text-2xl font-bold text-text-main mb-2 tracking-tight italic">{c.evaluation?.name}</h4>
                          <span className="text-[10px] bg-bg-input px-2 py-1 rounded text-text-dim font-black uppercase tracking-widest border border-border-dark">ID: {c.id.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-center p-3 rounded-lg bg-bg-input border border-border-dark min-w-[100px]">
                            <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-1">Score Global</p>
                            <p className="text-3xl font-black font-mono text-text-main leading-none">{c.evaluation?.score}</p>
                          </div>
                          {c.evaluation && <RecommendationBadge rec={c.evaluation.recommendation} />}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Justification */}
                        <div className="space-y-6">
                          <h5 className="text-[12px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2 italic">
                            <ClipboardList className="text-accent-blue" size={16} />
                            Justificación Técnica
                          </h5>
                          <ul className="space-y-4">
                            {c.evaluation?.justification.map((p, i) => (
                              <li key={i} className="flex gap-4 p-4 rounded-xl bg-bg-input border border-border-dark/50 hover:border-border-dark transition-colors group/item">
                                <span className="text-accent-blue font-black text-xs pt-0.5">0{i + 1}</span>
                                <p className="text-sm text-text-main/80 leading-relaxed italic-none">{p}</p>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Analysis Grid */}
                        <div className="space-y-8">
                          <div className="space-y-4">
                            <h5 className="text-[12px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2 italic">
                              <Trophy className="text-success-green" size={16} />
                              Fortalezas Identificadas
                            </h5>
                            <div className="grid grid-cols-1 gap-2">
                              {c.evaluation?.strengths.map((s, i) => (
                                <div key={i} className="bg-success-green/5 text-success-green text-xs font-bold px-4 py-2 border border-success-green/10 rounded">
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-4 pt-4 border-t border-border-dark">
                            <h5 className="text-[12px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2 italic">
                              <Target className="text-danger-red" size={16} />
                              Brechas Críticas
                            </h5>
                            <div className="grid grid-cols-1 gap-2">
                              {c.evaluation?.gaps.map((g, i) => (
                                <div key={i} className="bg-danger-red/5 text-danger-red text-xs font-bold px-4 py-2 border border-danger-red/10 rounded">
                                  {g}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data Integrity Section - Información sobre datos faltantes */}
                      {c.evaluation?.dataIntegrity && (
                        <div className="mt-8 pt-8 border-t border-border-dark space-y-6">
                          {/* Advertencia de Datos Insuficientes */}
                          {c.evaluation.dataIntegrity.insufficientData && (
                            <div className="p-4 rounded-xl bg-danger-red/10 border border-danger-red/30">
                              <h6 className="text-[12px] font-bold text-danger-red uppercase tracking-widest mb-2 flex items-center gap-2">
                                <AlertCircle size={16} />
                                ⚠️ ADVERTENCIA: Datos Insuficientes
                              </h6>
                              <p className="text-xs text-danger-red leading-relaxed">
                                Este CV contiene muy poca información. La evaluación puede ser especulativa. Se recomienda solicitar más detalles al candidato antes de tomar una decisión final.
                              </p>
                            </div>
                          )}

                          <div className="p-4 rounded-xl bg-warning-yellow/5 border border-warning-yellow/20">
                            <h5 className="text-[12px] font-bold text-warning-yellow uppercase tracking-widest mb-4 flex items-center gap-2">
                              <AlertCircle size={16} />
                              Integridad de Datos - Información No Encontrada en el CV
                            </h5>
                            <p className="text-xs text-text-main/70 mb-4 leading-relaxed">
                              Como evaluador riguroso y objetivo, se reportan aquí los requisitos y datos que <strong>NO aparecen explícitamente</strong> en el CV del candidato.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {c.evaluation.dataIntegrity.missingCriticalInfo.length > 0 && (
                              <div className="space-y-3">
                                <h6 className="text-[11px] font-bold text-danger-red uppercase tracking-widest flex items-center gap-2">
                                  <XCircle size={14} />
                                  Requisitos Críticos NO ENCONTRADOS
                                </h6>
                                <ul className="space-y-2">
                                  {c.evaluation.dataIntegrity.missingCriticalInfo.map((info, i) => (
                                    <li key={i} className="text-xs p-3 rounded-lg bg-danger-red/5 border border-danger-red/10 text-danger-red font-medium">
                                      • {info}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {c.evaluation.dataIntegrity.infoNotFoundInCV.length > 0 && (
                              <div className="space-y-3">
                                <h6 className="text-[11px] font-bold text-warning-yellow uppercase tracking-widest flex items-center gap-2">
                                  <AlertCircle size={14} />
                                  Información NO Especificada
                                </h6>
                                <ul className="space-y-2">
                                  {c.evaluation.dataIntegrity.infoNotFoundInCV.map((info, i) => (
                                    <li key={i} className="text-xs p-3 rounded-lg bg-warning-yellow/5 border border-warning-yellow/10 text-warning-yellow font-medium">
                                      • {info}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.article>
                  ))}
                </div>

                {/* Summary Bar Logic (Replica of design) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-bg-card p-8 rounded-xl border border-border-dark">
                  <div className="space-y-2 border-r border-border-dark pr-6 last:border-0">
                    <h4 className="text-[11px] font-bold text-text-dim uppercase tracking-widest">Top Ranking</h4>
                    <p className="text-sm font-bold text-text-main">1. {topThree[0]?.evaluation?.name} ({topThree[0]?.evaluation?.score})</p>
                  </div>
                  <div className="space-y-2 border-r border-border-dark pr-6 last:border-0">
                    <h4 className="text-[11px] font-bold text-text-dim uppercase tracking-widest">Recomendación Ejecutiva</h4>
                    <p className="text-sm font-bold text-text-main italic line-clamp-2">
                      {topThree.length >= 2 
                        ? `Priorizar entrevistas con ${topThree[0]?.evaluation?.name} y ${topThree[1]?.evaluation?.name} por alineación técnica.`
                        : `El candidato ${topThree[0]?.evaluation?.name} es el único con puntaje sobresaliente.`}
                    </p>
                  </div>
                  <div className="space-y-2 last:border-0">
                    <h4 className="text-[11px] font-bold text-text-dim uppercase tracking-widest">Resumen de Proceso</h4>
                    <p className="text-sm font-bold text-text-main">
                      {candidates.length} Evaluados / {sortedCandidates.filter(c => (c.evaluation?.score || 0) >= 8).length} Seleccionables
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2D313A; border-radius: 10px; }
        .italic-serif-headers h2, .italic-serif-headers h3, .italic-serif-headers h4, .italic-serif-headers h5, .italic-serif-headers .italic {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
        }
        .italic-none { font-style: normal !important; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}
