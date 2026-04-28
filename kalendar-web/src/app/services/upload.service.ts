import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export type UploadKind =
  | 'user-avatar'
  | 'business-logo'
  | 'business-banner'
  | 'employee-avatar'
  | 'service-image';

export interface UploadTarget {
  kind: UploadKind;
  slug?: string;
  employeeId?: number;
  serviceId?: number;
}

interface SignResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
  folder: string;
}

export interface UploadResult {
  secureUrl: string;
  publicId: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/uploads`;

  upload(file: File, target: UploadTarget): Observable<UploadResult> {
    return this.http.post<SignResponse>(`${this.base}/sign`, target).pipe(
      switchMap((sig) => from(this.directUpload(file, sig))),
    );
  }

  private async directUpload(file: File, sig: SignResponse): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('upload_preset', sig.uploadPreset);
    form.append('folder', sig.folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      { method: 'POST', body: form },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
    }
    const json = await res.json() as { secure_url: string; public_id: string };
    return { secureUrl: json.secure_url, publicId: json.public_id };
  }
}
