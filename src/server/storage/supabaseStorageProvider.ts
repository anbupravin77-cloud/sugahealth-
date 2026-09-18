import { supabaseAdmin } from '../supabaseAdmin';
import { IStorageProvider } from './storageProvider';

export class SupabaseStorageProvider implements IStorageProvider {
  readonly name = 'supabase';
  private readonly bucketName = 'clinical-documents';

  async uploadPdf(storagePath: string, buffer: Buffer): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw new Error(`[SupabaseStorage] Failed to upload PDF: ${error.message}`);
    }
    console.log(`[SupabaseStorage] Successfully uploaded PDF to ${this.bucketName}/${storagePath}`);
  }

  async downloadPdf(storagePath: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error || !data) {
      throw new Error(`[SupabaseStorage] Failed to download PDF: ${error?.message || 'Empty file'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`[SupabaseStorage] Failed to generate signed URL: ${error?.message}`);
    }
    return data.signedUrl;
  }
}
