import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config({ path: '.env.local' });

const app = express();
const port = Number(process.env.PORT || 4000);
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY no está definido. Configura .env.local con tu clave de Gemini.');
}

const ai = new GoogleGenAI({ apiKey });

export interface CandidateEvaluation {
  name: string;
  score: number;
  justification: string[];
  strengths: string[];
  gaps: string[];
  recommendation: 'Avanzar' | 'Considerar' | 'Descartar';
  dataIntegrity: {
    missingCriticalInfo: string[];
    infoNotFoundInCV: string[];
    insufficientData: boolean;
  };
}

app.use(express.json());

app.post('/api/evaluate', async (req, res) => {
  const { jd, cv } = req.body as { jd?: string; cv?: string };

  if (typeof jd !== 'string' || typeof cv !== 'string') {
    return res.status(400).json({ error: 'Los campos jd y cv son obligatorios.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          text: `EVALUADOR EXPERTO - SELECCIÓN DE CANDIDATOS POR CAPAS

Eres un experto en selección de personal con experiencia real en procesos de selección.

═══════════════════════════════════════════════════════════════════════════════
ORDEN DE EVALUACIÓN POR CAPAS (De mayor a menor importancia)
═══════════════════════════════════════════════════════════════════════════════

CAPA 1: EXPERIENCIA EN TRABAJOS SIMILARES (CRÍTICO - FILTRO AUTOMÁTICO)
─────────────────────────────────────────────────────────────────────────────
REQUISITO: El candidato DEBE tener experiencia demostrable en trabajos similares al cargo.

EVALUACIÓN EXPLÍCITA:
- Busca en el CV: puestos anteriores, empresas, responsabilidades
- Extrae EXACTAMENTE lo que dice el CV sobre experiencia laboral
- Compara con el cargo requerido en el JD

LÓGICA DE DESCARTE AUTOMÁTICO:
→ SI el CV NO menciona experiencia laboral relevante O NO hay ningún puesto relacionado:
  ✗ Score: 1-2/10 (automáticamente bajo)
  ✗ Recommendation: "Descartar" (SIN REVISAR LAS OTRAS CAPAS)
  ✗ Justificación: "Sin experiencia demostrable en [puesto/industria/contexto similar]. CV no describe trabajos relacionados."
  ✗ TERMINA LA EVALUACIÓN AQUÍ - NO CONTINÚES CON OTRAS CAPAS

→ SI el CV menciona experiencia pero es MUY DIFERENTE:
  ✗ Score máximo: 3-4/10
  ✗ Recommendation: "Descartar"
  ✗ Marcar como brecha crítica: "Experiencia es en [área diferente], no en [área requerida]"

→ SI el CV menciona experiencia relevante:
  ✓ CONTINÚA CON LAS OTRAS CAPAS


CAPA 2: HABILIDADES TÉCNICAS (IMPORTANTE)
─────────────────────────────────────────────────────────────────────────────
SOLO si pasó la Capa 1.

EVALUACIÓN:
- Enumera EXACTAMENTE las habilidades técnicas mencionadas en el CV
- Compara con las requeridas en el JD
- NO asumas habilidades no escritas
- Si una habilidad no está mencionada, marca como "NO ESPECIFICADO EN CV"

PUNTAJE: +0 a +3 puntos (según cantidad de match con requerimientos)


CAPA 3: FORMACIÓN ACADÉMICA (COMPLEMENTARIO)
─────────────────────────────────────────────────────────────────────────────
SOLO si pasó las Capas 1 y 2.

EVALUACIÓN:
- Extrae EXACTAMENTE: grado académico, universidad, año
- Compara con requisitos del JD
- Si el JD requiere "Grado en X" y el CV dice "Grado en X": ✓ Match
- Si el CV no menciona formación: Marca como "NO ESPECIFICADO"

PUNTAJE: +0 a +1.5 puntos


CAPA 4: LOGROS CONCRETOS DEMOSTRADOS (DIFERENCIADOR)
─────────────────────────────────────────────────────────────────────────────
SOLO si pasó las Capas 1, 2 y 3.

EVALUACIÓN:
- Busca SOLO logros explícitamente escritos: "aumentó ventas en 30%", "lideró equipo de 5 personas"
- NO asumas logros
- Cifras, porcentajes, números = más creíble
- Descripciones vagas = menos puntaje

PUNTAJE: +0 a +1 punto


═══════════════════════════════════════════════════════════════════════════════
EVALUACIÓN DE INSUFICIENCIA DE DATOS
═══════════════════════════════════════════════════════════════════════════════

VERIFICA si el CV tiene información suficiente:
- ¿Tiene nombre identificable? ✓/✗
- ¿Tiene al menos 1 experiencia laboral? ✓/✗
- ¿Tiene formación académica? ✓/✗
- ¿Tiene habilidades listadas? ✓/✗

SI 2 o más de estos están ausentes:
  → dataIntegrity.insufficientData = true
  → Avisa: "ADVERTENCIA: Datos insuficientes en el CV. La evaluación es especulativa."
  → Reduce confianza en el score

SI más de 3 están ausentes:
  → Considera "Descartar" por falta de información


═══════════════════════════════════════════════════════════════════════════════
SCORING FINAL
═══════════════════════════════════════════════════════════════════════════════

1-2: Sin experiencia relevante → Descartar automáticamente
3-4: Experiencia pero en área muy diferente → Descartar
5-6: Experiencia relevante pero habilidades incompletas → Considerar
7-8: Experiencia + habilidades sólidas → Avanzar
9-10: Experiencia + habilidades + formación + logros comprobados → Avanzar


═══════════════════════════════════════════════════════════════════════════════
CONTEXTO DE EVALUACIÓN
═══════════════════════════════════════════════════════════════════════════════

JOB DESCRIPTION:
${jd}

CV DEL CANDIDATO:
${cv}

═══════════════════════════════════════════════════════════════════════════════
RESPUESTA REQUERIDA (JSON)
═══════════════════════════════════════════════════════════════════════════════

Genera SIEMPRE una respuesta JSON con estos campos:
- name: Nombre extraído del CV
- score: Número 1-10
- justification: Array de 3-5 puntos (cita exactas del CV)
- strengths: Array de fortalezas documentadas
- gaps: Array de brechas encontradas
- recommendation: "Avanzar", "Considerar" o "Descartar"
- dataIntegrity:
  - missingCriticalInfo: Array de requisitos críticos NO en CV
  - infoNotFoundInCV: Array de secciones típicas que faltan
  - insufficientData: boolean (true si hay muy poca información)

Si score es 1-4, SIEMPRE debe ser "Descartar".
Si score es 5-6, SIEMPRE debe ser "Considerar".
Si score es 7-10, SIEMPRE debe ser "Avanzar".
          `
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            score: { type: Type.NUMBER },
            justification: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            gaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendation: {
              type: Type.STRING,
              enum: ['Avanzar', 'Considerar', 'Descartar']
            },
            dataIntegrity: {
              type: Type.OBJECT,
              properties: {
                missingCriticalInfo: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                infoNotFoundInCV: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                insufficientData: {
                  type: Type.BOOLEAN
                }
              },
              required: ['missingCriticalInfo', 'infoNotFoundInCV', 'insufficientData']
            }
          },
          required: ['name', 'score', 'justification', 'strengths', 'gaps', 'recommendation', 'dataIntegrity']
        }
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text) as Partial<CandidateEvaluation>;
    
    // Asegurar valores por defecto
    const evaluated: CandidateEvaluation = {
      name: parsed.name || 'Candidato sin identificar',
      score: typeof parsed.score === 'number' ? parsed.score : 5,
      justification: Array.isArray(parsed.justification) ? parsed.justification : ['No se pudo generar justificación'],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      recommendation: parsed.recommendation || 'Considerar',
      dataIntegrity: {
        missingCriticalInfo: Array.isArray(parsed.dataIntegrity?.missingCriticalInfo) ? parsed.dataIntegrity.missingCriticalInfo : [],
        infoNotFoundInCV: Array.isArray(parsed.dataIntegrity?.infoNotFoundInCV) ? parsed.dataIntegrity.infoNotFoundInCV : [],
        insufficientData: Boolean(parsed.dataIntegrity?.insufficientData)
      }
    };
    
    return res.json(evaluated);
  } catch (error) {
    console.error('Error en /api/evaluate:', error);
    return res.status(500).json({ error: 'Error al evaluar el candidato.' });
  }
});

export interface InterviewQuestion {
  category: 'Técnica' | 'Comportamental' | 'Situacional' | 'Verificación' | string;
  question: string;
  rationale: string;
}

const categoryMap: Record<string, string> = {
  Fortalezas: 'Fortalezas',
  Brechas: 'Brechas',
  Motivacion: 'Motivación',
  Situacional: 'Situacional',
};

app.post('/api/interview', async (req, res) => {
  const { jd, cv, evaluation } = req.body as {
    jd?: string;
    cv?: string;
    evaluation?: CandidateEvaluation;
  };

  if (typeof jd !== 'string' || typeof cv !== 'string' || !evaluation) {
    return res.status(400).json({ error: 'Los campos jd, cv y evaluation son obligatorios.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{
        text: `Eres un entrevistador experto en selección de personal.
Prepara entre 8 y 12 preguntas de entrevista ESTRATÉGICAS Y PERSONALIZADAS para el siguiente candidato preseleccionado.

DESCRIPCIÓN DEL CARGO:
${jd}

CV DEL CANDIDATO:
${cv}

EVALUACIÓN PREVIA:
- Nombre: ${evaluation.name}
- Score: ${evaluation.score}/10
- Fortalezas identificadas: ${evaluation.strengths.join(' | ')}
- Brechas identificadas: ${evaluation.gaps.join(' | ')}

═══════════════════════════════════════
INSTRUCCIONES POR CATEGORÍA
═══════════════════════════════════════

CATEGORÍA "Fortalezas" — 2 a 3 preguntas:
Por cada fortaleza principal, genera una pregunta que:
- Pida un EJEMPLO CONCRETO de una situación real donde aplicó esa habilidad (formato STAR)
- Haga referencia explícita al candidato (menciona empresa o rol del CV si aplica)
- Indague en el impacto o decisión difícil tomada
Ejemplo: si lideró equipos → "Cuéntame un momento específico en [empresa] en que tuviste que tomar una decisión difícil como líder. ¿Qué pasó y cuál fue el resultado?"

CATEGORÍA "Brechas" — 2 a 3 preguntas:
Por cada brecha crítica identificada, genera una pregunta que:
- Explore si el candidato tiene conocimiento o experiencia en esa área que NO aparece en el CV
- Sea abierta y no punitiva, dando espacio para explicar proyectos, cursos o experiencias informales
- Conecte la brecha con el requisito específico del cargo
Ejemplo: si falta AWS → "El cargo trabaja intensivamente con servicios cloud. ¿Has tenido acercamiento a AWS o plataformas similares, aunque no esté en tu CV? ¿Cómo lo has abordado?"

CATEGORÍA "Motivacion" — 1 a 2 preguntas (OBLIGATORIO al menos 1):
- Por qué este cargo, esta empresa o esta industria específicamente (no respuesta genérica)
- Qué espera lograr o aprender en los próximos 12 meses en este rol
- La pregunta debe conectar el perfil real del candidato con los retos del cargo

CATEGORÍA "Situacional" — 2 a 3 preguntas (OBLIGATORIO al menos 1):
- Escenarios hipotéticos basados en RETOS REALES descritos en el JD (no genéricos)
- Evalúan criterio, priorización y toma de decisiones en contexto del rol
- El escenario debe ser verosímil para alguien con el perfil de este candidato

REGLAS:
- Total: entre 8 y 12 preguntas
- Cada "rationale" debe explicar por qué esa pregunta es relevante PARA ESTE candidato
- Las preguntas de Fortalezas y Brechas deben referenciar datos concretos del CV
- No repitas conceptos entre preguntas`
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: ['Fortalezas', 'Brechas', 'Motivacion', 'Situacional'] },
                  question: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ['category', 'question', 'rationale'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text) as { questions: InterviewQuestion[] };
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.map(q => ({ ...q, category: categoryMap[q.category] ?? q.category }))
      : [];
    return res.json({ questions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error en /api/interview:', msg);
    const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
    return res.status(isQuota ? 429 : 500).json({
      error: isQuota
        ? 'Límite de la API alcanzado. Espera unos minutos e intenta de nuevo.'
        : 'Error al generar preguntas de entrevista.',
    });
  }
});

app.listen(port, () => {
  console.log(`Backend de RecruitAI escuchando en http://localhost:${port}`);
});
