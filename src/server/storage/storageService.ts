import { IStorageProvider } from './storageProvider';
import { SupabaseStorageProvider } from './supabaseStorageProvider';

export class StorageService {
  private activeProvider: IStorageProvider;
  private supabaseProvider: SupabaseStorageProvider;

  constructor() {
    this.supabaseProvider = new SupabaseStorageProvider();
    this.activeProvider = this.supabaseProvider;
    console.log('[StorageService] Active provider configured as: SUPABASE');
  }

  getActiveProvider(): IStorageProvider {
    return this.activeProvider;
  }

  getSupabaseProvider(): SupabaseStorageProvider {
    return this.supabaseProvider;
  }

  async uploadPdf(storagePath: string, buffer: Buffer): Promise<void> {
    return this.activeProvider.uploadPdf(storagePath, buffer);
  }

  async downloadPdf(storagePath: string): Promise<Buffer> {
    return this.activeProvider.downloadPdf(storagePath);
  }

  async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    return this.activeProvider.getSignedUrl(storagePath, expiresInSeconds);
  }
}

export const storageService = new StorageService();
