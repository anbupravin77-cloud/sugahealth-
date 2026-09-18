import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { IStorageProvider } from './storageProvider';

export class FirebaseStorageProvider implements IStorageProvider {
  readonly name = 'firebase';

  async uploadPdf(storagePath: string, buffer: Buffer): Promise<void> {
    try {
      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);
      await file.save(buffer, { contentType: 'application/pdf' });
      console.log(`[FirebaseStorage] Successfully uploaded PDF: ${storagePath}`);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Firebase Storage is required in production environments.');
        throw new Error(`Production PDF storage failed: ${err.message}. Please configure Firebase Storage.`);
      }
      console.warn('[FirebaseStorage] Storage not available, falling back to local disk:', err.message);
      const localPath = path.join(process.cwd(), 'local_storage', storagePath);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, buffer);
      console.log(`[FirebaseStorage] Saved PDF to local fallback: ${localPath}`);
    }
  }

  async downloadPdf(storagePath: string): Promise<Buffer> {
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
      console.warn('[FirebaseStorage] Storage not available for download, falling back to local disk:', err.message);
      const localPath = path.join(process.cwd(), 'local_storage', storagePath);
      if (!fs.existsSync(localPath)) {
        throw new Error(`File not found: ${storagePath}`);
      }
      return fs.readFileSync(localPath);
    }
  }

  async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    });
    return url;
  }
}
