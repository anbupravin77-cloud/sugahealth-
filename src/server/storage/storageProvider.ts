export interface IStorageProvider {
  readonly name: 'supabase' | 'local';

  /**
   * Uploads a PDF buffer to the private storage bucket.
   */
  uploadPdf(storagePath: string, buffer: Buffer): Promise<void>;

  /**
   * Downloads a PDF buffer from the private storage bucket.
   */
  downloadPdf(storagePath: string): Promise<Buffer>;

  /**
   * Generates a short-lived private signed URL for secure download.
   * NEVER generates public, unauthenticated URLs for clinical documents.
   */
  getSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
}
