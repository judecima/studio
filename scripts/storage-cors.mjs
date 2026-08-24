// Configura CORS del bucket de Firebase Storage usando serviceAccount.json.
// Uso: node scripts/storage-cors.mjs [--check]
import { readFileSync } from 'node:fs';
import { Storage } from '@google-cloud/storage';

const credentials = JSON.parse(readFileSync(new URL('../serviceAccount.json', import.meta.url)));
const BUCKET = 'studio-5733239027-4f570.firebasestorage.app';

const ORIGINS = [
  'https://studio--studio-5733239027-4f570.us-central1.hosted.app',
  'https://studio-5733239027-4f570.web.app',
  'https://studio-5733239027-4f570.firebaseapp.com',
  'http://localhost:9002',
  'http://localhost:3000',
  'http://127.0.0.1:9002',
];

const CORS = [
  {
    origin: ORIGINS,
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
    responseHeader: [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Content-Disposition',
      'Authorization',
      'User-Agent',
      'x-goog-resumable',
      'x-goog-upload-*',
      'x-firebase-storage-version',
      'x-firebase-gmpid',
    ],
    maxAgeSeconds: 3600,
  },
];

const storage = new Storage({ projectId: credentials.project_id, credentials });
const bucket = storage.bucket(BUCKET);

const [exists] = await bucket.exists();
console.log(`bucket ${BUCKET} exists:`, exists);
if (!exists) {
  console.error('El bucket no existe. Hay que habilitar Storage en la consola de Firebase.');
  process.exit(1);
}

if (!process.argv.includes('--check')) {
  await bucket.setCorsConfiguration(CORS);
  console.log('CORS aplicado.');
}

const [meta] = await bucket.getMetadata();
console.log('CORS actual:', JSON.stringify(meta.cors, null, 2));
