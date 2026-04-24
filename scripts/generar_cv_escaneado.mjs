import { PDFDocument, rgb, grayscale } from 'pdf-lib';
import { writeFileSync } from 'fs';

const doc = await PDFDocument.create();
const page = doc.addPage([595, 842]); // A4

const { width, height } = page.getSize();

// Fondo blanco (simula hoja escaneada)
page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.97, 0.95) });

// Manchas de escáner en bordes (efecto realista)
page.drawRectangle({ x: 0, y: 820, width, height: 22, color: grayscale(0.88) });
page.drawRectangle({ x: 0, y: 0, width, height: 14, color: grayscale(0.86) });
page.drawRectangle({ x: 0, y: 0, width: 10, height, color: grayscale(0.9) });
page.drawRectangle({ x: 585, y: 0, width: 10, height, color: grayscale(0.88) });

// === ENCABEZADO: nombre del candidato (como imagen de texto) ===
const headerY = 760;
// Bloque oscuro que simula nombre grande
page.drawRectangle({ x: 50, y: headerY, width: 280, height: 18, color: grayscale(0.1) });
// Bloque que simula cargo/rol
page.drawRectangle({ x: 50, y: headerY - 28, width: 200, height: 11, color: grayscale(0.4) });
// Línea separadora
page.drawLine({ start: { x: 50, y: headerY - 48 }, end: { x: 545, y: headerY - 48 }, thickness: 1.5, color: grayscale(0.3) });

// === SECCIÓN: Información de contacto (3 bloques en fila) ===
const contactY = headerY - 68;
for (let i = 0; i < 3; i++) {
  page.drawRectangle({ x: 50 + i * 170, y: contactY, width: 130, height: 9, color: grayscale(0.55) });
}

// === SECCIÓN: Perfil profesional ===
const perfilY = contactY - 40;
page.drawRectangle({ x: 50, y: perfilY, width: 120, height: 12, color: grayscale(0.2) }); // título sección
// Líneas de párrafo
const perfilLines = [495, 420, 480, 390, 460];
perfilLines.forEach((w, i) => {
  page.drawRectangle({ x: 50, y: perfilY - 20 - i * 14, width: w, height: 8, color: grayscale(0.6) });
});

// === SECCIÓN: Experiencia laboral ===
const expY = perfilY - 110;
page.drawRectangle({ x: 50, y: expY, width: 150, height: 12, color: grayscale(0.2) }); // título

// Trabajo 1
page.drawRectangle({ x: 50, y: expY - 25, width: 220, height: 10, color: grayscale(0.25) });
page.drawRectangle({ x: 50, y: expY - 40, width: 160, height: 8, color: grayscale(0.5) });
[480, 440, 460, 390].forEach((w, i) => {
  page.drawRectangle({ x: 65, y: expY - 58 - i * 13, width: w, height: 7, color: grayscale(0.65) });
});

// Trabajo 2
page.drawRectangle({ x: 50, y: expY - 120, width: 200, height: 10, color: grayscale(0.25) });
page.drawRectangle({ x: 50, y: expY - 135, width: 150, height: 8, color: grayscale(0.5) });
[460, 430, 400].forEach((w, i) => {
  page.drawRectangle({ x: 65, y: expY - 153 - i * 13, width: w, height: 7, color: grayscale(0.65) });
});

// === SECCIÓN: Educación ===
const eduY = expY - 235;
page.drawRectangle({ x: 50, y: eduY, width: 100, height: 12, color: grayscale(0.2) });
page.drawRectangle({ x: 50, y: eduY - 22, width: 260, height: 9, color: grayscale(0.35) });
page.drawRectangle({ x: 50, y: eduY - 38, width: 190, height: 8, color: grayscale(0.55) });

// === SECCIÓN: Habilidades ===
const habilY = eduY - 80;
page.drawRectangle({ x: 50, y: habilY, width: 110, height: 12, color: grayscale(0.2) });
// Chips de habilidades
const chipWidths = [70, 90, 60, 80, 75, 55, 85];
let chipX = 50;
let chipY = habilY - 28;
chipWidths.forEach((w) => {
  if (chipX + w > 540) { chipX = 50; chipY -= 24; }
  page.drawRectangle({ x: chipX, y: chipY, width: w, height: 16, color: grayscale(0.75), borderColor: grayscale(0.5), borderWidth: 0.5 });
  chipX += w + 10;
});

// Artefacto de escáner (línea diagonal sutil)
page.drawLine({ start: { x: 0, y: 420 }, end: { x: 595, y: 415 }, thickness: 0.3, color: grayscale(0.82) });

const pdfBytes = await doc.save();
writeFileSync('test_data/CV_Escaneado.pdf', pdfBytes);
console.log('✓ CV_Escaneado.pdf generado en test_data/');
