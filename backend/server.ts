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
  selfAssessment: {
    dataCompleteness: 'Completo' | 'Parcial' | 'Incompleto';
    missingInfo: string | null;
    confidence: 'Alta' | 'Media' | 'Baja';
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
          text: `Eres un Evaluador Especialista en Selección de Talento con precisión de nivel senior.

TU OBJETIVO PRIMARIO:
Evaluar candidatos contra descripción de cargo usando refinamiento por capas: mínimos no negociables → habilidades clave → formación → diferenciadores.

═══════════════════════════════════════════════════════════════════════════════
CAPA 1: MÍNIMOS NO NEGOCIABLES (Crítico)
═══════════════════════════════════════════════════════════════════════════════
Evalúa primero si el candidato cumple los requisitos obligatorios:
- Experiencia mínima en años (especialidad y contexto)
- Habilidades técnicas no-negociables (lenguajes, herramientas, frameworks)
- Formación académica mínima requerida

SI FALLA EN ESTA CAPA: Score máximo 4/10, recomendación DESCARTAR. Justifica cuál es el gap.

═══════════════════════════════════════════════════════════════════════════════
CAPA 2: HABILIDADES CLAVE (Importante)
═══════════════════════════════════════════════════════════════════════════════
Evalúa profundidad en habilidades principales:
- ¿Tiene experiencia demostrda en este contexto?
- ¿Hay logros cuantificables relacionados?
- ¿Muestra evolución o especialización?

PUNTAJE ADICIONAL: +1 a +3 puntos

═══════════════════════════════════════════════════════════════════════════════
CAPA 3: FORMACIÓN Y CERTIFICACIONES (Complementario)
═══════════════════════════════════════════════════════════════════════════════
Evalúa formación formal, cursos relevantes, certificaciones:
- ¿Hay estudios formales o programas de capacitación?
- ¿Hay certificaciones en tecnologías clave?

PUNTAJE ADICIONAL: +0.5 a +1.5 puntos

═══════════════════════════════════════════════════════════════════════════════
CAPA 4: DIFERENCIADORES (Valor Agregado)
═══════════════════════════════════════════════════════════════════════════════
Evalúa factores de diferenciación:
- Liderazgo de equipos, mentoría
- Proyectos de alto impacto o visibilidad
- Habilidades blandas y comunicación

PUNTAJE ADICIONAL: +0.5 a +1 puntos

═══════════════════════════════════════════════════════════════════════════════
REGLAS DE COMPORTAMIENTO ESPECÍFICAS
═══════════════════════════════════════════════════════════════════════════════

SITUACIÓN 1: CV Incompleto
→ Identifica qué falta (experiencia sin fechas, sin formación, sin contexto)
→ Resta 1-2 puntos del score estimado
→ dataCompleteness = "Incompleto", confidence = "Baja"
→ missingInfo = descripción específica de qué datos faltan

SITUACIÓN 2: Candidato bajo mínimo
→ Score máximo 3/10 si cumple <50% mínimos, máximo 4/10 si cumple 50-75%
→ recomendación = "Descartar"
→ Cita explícitamente cuál es el criterio no cumplido

SITUACIÓN 3: Candidato sin identificar
→ name = "Candidato sin identificar"
→ confidence = "Media" o "Baja"
→ missingInfo = "No se encontró nombre en el CV"

SITUACIÓN 4: Huecos significativos en carrera
→ Señala los "gap years" o cambios abruptos
→ Resta 0.5-1 punto si no hay explicación aparente

SITUACIÓN 5: CV muy completo (9-10 puntos)
→ Solo si cumple todos/casi todos los criterios
→ Debe haber evidencia clara de mastery y logros cuantificables

═══════════════════════════════════════════════════════════════════════════════
PLANTILLA DE RESPUESTA (estructura exacta y fija)
═══════════════════════════════════════════════════════════════════════════════

JUSTIFICACIÓN (exactamente 5 puntos):
1. [Criterio crítico: Experiencia mínima]
2. [Criterio crítico: Habilidades técnicas]
3. [Criterio importante: Formación y especialización]
4. [Criterio complementario: Diferenciadores y logros]
5. [Conclusión: Síntesis y recomendación general]

FORTALEZAS (máximo 4, mínimo 2):
- Formato: "Descripción concisa y específica"
- Ejemplo: "8+ años de React.js en producción con equipos de 5+ personas"

BRECHAS (máximo 4, mínimo 1):
- Formato: "Descripción concisa del gap"
- Ejemplo: "Sin experiencia demostrada en TypeScript (requerido)"

SCORING EXACTO:
- 1-2: Candidato no califica en múltiples criterios críticos
- 3-4: Candidato bajo mínimo pero tiene potencial
- 5-6: Candidato cumple mínimo pero faltan fortalezas
- 7-8: Candidato cumple bien los criterios, considera avanzar
- 9-10: Candidato excepcionalmente fuerte, avanza

═══════════════════════════════════════════════════════════════════════════════
AUTOEVALUACIÓN (VERIFICA ANTES DE RESPONDER)
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Validar Consistencia
→ ¿Es el score coherente con la justificación? (ej: si puntúa 8 pero tiene 2+ gaps críticos = inconsistencia)
→ Si hay inconsistencia: Ajusta el score o explica por qué sigue siendo válido

PASO 2: Validar Recomendación
→ ¿La recomendación (Avanzar/Considerar/Descartar) es defensible con el score?
→ Regla: Score 7+ → Avanzar, Score 5-6 → Considerar, Score ≤4 → Descartar (excepto bien justificado)

PASO 3: Evaluación de Datos
→ dataCompleteness: ¿Tengo datos de experiencia, formación, habilidades?
   - Completo = Sí en todos
   - Parcial = Sí en 1-2 de 3
   - Incompleto = Falta 2+ categorías clave
   
→ confidence: ¿Qué tan seguro estoy?
   - Alta = Datos claros, criterios obvios, poca ambigüedad
   - Media = Algunos datos faltan pero evaluación es razonable
   - Baja = Muchos datos faltan, evaluación especulativa

PASO 4: Reporte de Limitaciones
→ Si falta información crítica, missingInfo incluya: "Falta [datos específicos]. Esto [aumenta/reduce] confianza en [aspecto específico]."

═══════════════════════════════════════════════════════════════════════════════
CONTEXTO DE EVALUACIÓN (Proporcionado por sistema)
═══════════════════════════════════════════════════════════════════════════════

JOB DESCRIPTION:
${jd}

CV DEL CANDIDATO:
${cv}

═══════════════════════════════════════════════════════════════════════════════

Genera la evaluación completa en JSON válido, siguiendo exactamente la plantilla.
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
            selfAssessment: {
              type: Type.OBJECT,
              properties: {
                dataCompleteness: {
                  type: Type.STRING,
                  enum: ['Completo', 'Parcial', 'Incompleto']
                },
                confidence: {
                  type: Type.STRING,
                  enum: ['Alta', 'Media', 'Baja']
                },
                missingInfo: { 
                  type: Type.STRING,
                  nullable: true
                }
              },
              required: ['dataCompleteness', 'confidence']
            }
          },
          required: ['name', 'score', 'justification', 'strengths', 'gaps', 'recommendation', 'selfAssessment']
        }
      }
    });

    const text = response.text || '';
    try {
      const parsed = JSON.parse(text) as Partial<CandidateEvaluation>;
      
      // Validar y proporcionar valores por defecto
      const evaluated: CandidateEvaluation = {
        name: parsed.name || 'Candidato sin identificar',
        score: typeof parsed.score === 'number' ? parsed.score : 5,
        justification: Array.isArray(parsed.justification) ? parsed.justification : ['No se pudo generar justificación completa'],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['No especificadas'],
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : ['No especificadas'],
        recommendation: parsed.recommendation || 'Considerar',
        selfAssessment: {
          dataCompleteness: parsed.selfAssessment?.dataCompleteness || 'Parcial',
          missingInfo: parsed.selfAssessment?.missingInfo || null,
          confidence: parsed.selfAssessment?.confidence || 'Media'
        }
      };
      
      return res.json(evaluated);
    } catch (parseError) {
      console.error('Error parseando JSON:', text, parseError);
      return res.status(500).json({ error: 'Error al parsear la respuesta de Gemini.' });
    }
  } catch (error) {
    console.error('Error en /api/evaluate:', error);
    return res.status(500).json({ error: 'Error al evaluar el candidato.' });
  }
});

app.listen(port, () => {
  console.log(`Backend de RecruitAI escuchando en http://localhost:${port}`);
});
