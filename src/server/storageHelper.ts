import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

export async function uploadPdf(storagePath: string, buffer: Buffer): Promise<void> {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, { contentType: 'application/pdf' });
    console.log(`Successfully uploaded PDF to Firebase Storage: ${storagePath}`);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Firebase Storage is required in production environments.');
      throw new Error(`Production PDF storage failed: ${err.message}. Please configure Firebase Storage.`);
    }
    console.warn('Firebase Storage not available, falling back to local disk:', err.message);
    const localPath = path.join(process.cwd(), 'local_storage', storagePath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    console.log(`Successfully saved PDF to local fallback: ${localPath}`);
  }
}

export async function downloadPdf(storagePath: string): Promise<Buffer> {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();
    return buffer;
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Firebase Storage is required in production environments.');
      throw new Error(`Production PDF download failed: ${err.message}. Please configure Firebase Storage.`);
    }
    console.warn('Firebase Storage not available for download, falling back to local disk:', err.message);
    const localPath = path.join(process.cwd(), 'local_storage', storagePath);
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return fs.readFileSync(localPath);
  }
}
