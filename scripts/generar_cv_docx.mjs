import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { writeFileSync } from 'fs';

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: 'Carlos Javier Ruiz',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Principal Frontend Engineer', bold: true, size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'carlos.ruiz@email.com  |  +34 612 345 678  |  linkedin.com/in/carlosruiz', size: 20, color: '666666' }),
        ],
      }),
      new Paragraph({ text: '' }),

      new Paragraph({ text: 'EXPERIENCIA PROFESIONAL', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [new TextRun({ text: 'Principal Frontend Engineer — TechGlobal', bold: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: '2020 – Actualidad', italics: true, color: '888888' })],
      }),
      new Paragraph({ text: 'Arquitectura de micro-frontends usando React y TypeScript. Implementación de sistemas de diseño corporativos con Tailwind CSS. Optimización de bundles reduciendo el tiempo de carga en un 40%.' }),
      new Paragraph({ text: '' }),
      new Paragraph({
        children: [new TextRun({ text: 'Senior Web Developer — InnovaSoft', bold: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: '2016 – 2020', italics: true, color: '888888' })],
      }),
      new Paragraph({ text: 'Desarrollo de SPAs complejas con React y Redux. Liderazgo de un equipo de 5 personas. Integración de APIs GraphQL y RESTful en proyectos de alta concurrencia.' }),
      new Paragraph({ text: '' }),

      new Paragraph({ text: 'HABILIDADES TÉCNICAS', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: 'React (Experto) · TypeScript (Experto) · Next.js · GraphQL · AWS Lambda' }),
      new Paragraph({ text: 'Testing: Jest · React Testing Library · Cypress' }),
      new Paragraph({ text: 'Herramientas: Docker · CI/CD · Git · Figma' }),
      new Paragraph({ text: '' }),

      new Paragraph({ text: 'FORMACIÓN', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: 'Grado en Ingeniería Informática — Universidad Politécnica (2012–2016)' }),
      new Paragraph({ text: '' }),

      new Paragraph({ text: 'IDIOMAS', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: 'Inglés: C1 (Avanzado) · Español: Nativo' }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('test_data/CV_Carlos_Ruiz.docx', buffer);
console.log('✓ CV_Carlos_Ruiz.docx generado en test_data/');
