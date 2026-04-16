import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface CandidateEvaluation {
  name: string;
  score: number;
  justification: string[];
  strengths: string[];
  gaps: string[];
  recommendation: 'Avanzar' | 'Considerar' | 'Descartar';
}

export async function evaluateCandidate(jd: string, cv: string): Promise<CandidateEvaluation> {
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
      responseMimeType: "application/json",
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
        required: ["name", "score", "justification", "strengths", "gaps", "recommendation"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as CandidateEvaluation;
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    throw new Error("No se pudo procesar la evaluación del candidato.");
  }
}
