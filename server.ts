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
          text: `Eres un experto en selección de personal. Evalúa el siguiente CV frente a la descripción de cargo (Job Description) proporcionada.

CRITERIOS DE EVALUACIÓN:
1. Experiencia requerida
2. Habilidades técnicas
3. Formación académica
4. Logros o competencias esperadas

JOB DESCRIPTION:
${jd}

CV DEL CANDIDATO:
${cv}

Extrae el nombre del candidato del CV. Si no es claro, usa "Candidato sin identificar".
Genera un score del 1 al 10.
Justifica en 3 a 5 puntos concretos del CV.
Identifica fortalezas y brechas.
Recomienda una acción: Avanzar (score 8-10), Considerar (6-7), Descartar (<6).
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
            }
          },
          required: ['name', 'score', 'justification', 'strengths', 'gaps', 'recommendation']
        }
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text) as CandidateEvaluation;
    return res.json(parsed);
  } catch (error) {
    console.error('Error en /api/evaluate:', error);
    return res.status(500).json({ error: 'Error al evaluar el candidato.' });
  }
});

app.listen(port, () => {
  console.log(`Backend de RecruitAI escuchando en http://localhost:${port}`);
});
