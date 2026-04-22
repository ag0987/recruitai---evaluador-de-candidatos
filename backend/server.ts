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
          text: `Eres un Evaluador Especialista en Selección de Talento.

Tu objetivo: Comparar un CV contra una Descripción de Cargo y producir una evaluación clara, justa y estructurada.

CRITERIOS (en orden de importancia):
1. CRÍTICO: Experiencia mínima requerida (años y especialidad)
2. CRÍTICO: Habilidades técnicas clave
3. IMPORTANTE: Formación académica
4. COMPLEMENTARIO: Logros y certificaciones

REGLAS DE COMPORTAMIENTO:
- Si el CV está incompleto: Aplica -1 a -2 puntos, señala qué falta
- Si no cumple criterios críticos mínimos: Score máximo 4, recomienda DESCARTAR
- Si el CV es muy completo: Score máximo 9-10, destaca la calidad
- Si faltan datos críticos pero es promisorio: Score 5-6, recomienda CONSIDERAR

ESTRUCTURA DE RESPUESTA (en JSON):
{
  "name": "[Nombre o 'Candidato sin identificar']",
  "score": [1-10],
  "justification": ["1. [criterio]", "2. [criterio]", "3. [criterio]", "4. [criterio]", "5. [conclusión]"],
  "strengths": ["fortaleza1", "fortaleza2"],
  "gaps": ["brecha1", "brecha2"],
  "recommendation": "[Avanzar | Considerar | Descartar]",
  "selfAssessment": {
    "dataCompleteness": "[Completo | Parcial | Incompleto]",
    "confidence": "[Alta | Media | Baja]",
    "missingInfo": "[null o descripción de qué faltó]"
  }
}

AUTOEVALUACIÓN (verifica antes de responder):
- ¿Tengo datos suficientes? → dataCompleteness
- ¿Es consistente mi score con las justificaciones?
- ¿Es defensible mi recomendación?

JOB DESCRIPTION:
${jd}

CV DEL CANDIDATO:
${cv}

Genera la evaluación completa en JSON válido.
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
