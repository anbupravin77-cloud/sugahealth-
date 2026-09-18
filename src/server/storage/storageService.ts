import { IStorageProvider } from './storageProvider';
import { FirebaseStorageProvider } from './firebaseStorageProvider';
import { SupabaseStorageProvider } from './supabaseStorageProvider';

export class StorageService {
  private activeProvider: IStorageProvider;
  private firebaseProvider: FirebaseStorageProvider;
  private supabaseProvider: SupabaseStorageProvider;

  constructor() {
    this.firebaseProvider = new FirebaseStorageProvider();
    this.supabaseProvider = new SupabaseStorageProvider();

    // Default to Firebase in Phase 3 to keep active production stable.
    // Switchable to 'supabase' via environment configuration.
    const requested = process.env.STORAGE_PROVIDER?.toLowerCase();
    if (requested === 'supabase') {
      this.activeProvider = this.supabaseProvider;
      console.log('[StorageService] Active provider configured as: SUPABASE');
    } else {
      this.activeProvider = this.firebaseProvider;
      console.log('[StorageService] Active provider configured as: FIREBASE (default)');
    }
  }

  getActiveProvider(): IStorageProvider {
    return this.activeProvider;
  }

  getFirebaseProvider(): FirebaseStorageProvider {
    return this.firebaseProvider;
  }

  getSupabaseProvider(): SupabaseStorageProvider {
    return this.supabaseProvider;
  }

  setActiveProvider(providerName: 'firebase' | 'supabase'): void {
    if (providerName === 'supabase') {
      this.activeProvider = this.supabaseProvider;
    } else {
      this.activeProvider = this.firebaseProvider;
    }
  }

  async uploadPdf(storagePath: string, buffer: Buffer): Promise<void> {
    return this.activeProvider.uploadPdf(storagePath, buffer);
  }

  /**
   * Resilient download: attempts active provider first, with fallback to alternate
   * provider so existing documents are accessible regardless of which system holds them.
   */
  async downloadPdf(storagePath: string): Promise<Buffer> {
    try {
      return await this.activeProvider.downloadPdf(storagePath);
    } catch (activeErr: any) {
      const alternate = this.activeProvider === this.supabaseProvider ? this.firebaseProvider : this.supabaseProvider;
      try {
        console.warn(`[StorageService] Active provider download failed, trying alternate provider for ${storagePath}...`);
        return await alternate.downloadPdf(storagePath);
      } catch {
        // Rethrow original error if both fail
        throw activeErr;
      }
    }
  }

  async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    return this.activeProvider.getSignedUrl(storagePath, expiresInSeconds);
  }
}

export const storageService = new StorageService();
