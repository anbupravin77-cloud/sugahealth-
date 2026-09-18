import { storageService } from './storage';

export async function uploadPdf(storagePath: string, buffer: Buffer): Promise<void> {
  return storageService.uploadPdf(storagePath, buffer);
}

export async function downloadPdf(storagePath: string): Promise<Buffer> {
  return storageService.downloadPdf(storagePath);
}

