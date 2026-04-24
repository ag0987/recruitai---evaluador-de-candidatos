import { writeFileSync } from 'fs';

// PDF con cabecera válida pero cuerpo corrupto — el parser fallará al intentar leerlo
const corrupto = Buffer.from(
  '%PDF-1.4\n' +
  '\x00\x01\x02\x03\x04\xFF\xFE\xFD\xFC\xFB' +
  'obj<<corruptedstream\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89' +
  '\xFF\xD8\xFF\xE0JFIF\x00\x01\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF' +
  'endstream endobj%%EOF'
);

writeFileSync('test_data/CV_Datos_Corruptos.pdf', corrupto);
console.log('✓ CV_Datos_Corruptos.pdf generado en test_data/');
