import { Component, inject, input, output, signal } from '@angular/core';
import { UploadService, UploadTarget } from '../services/upload.service';

@Component({
  selector: 'app-image-upload',
  template: `
    <div class="image-upload">
      <div class="preview" [class.round]="round()">
        @if (currentUrl()) {
          <img [src]="currentUrl()" alt="" />
        } @else {
          <span class="placeholder">No image</span>
        }
      </div>

      <div class="actions">
        <label class="btn-secondary">
          <input
            type="file"
            accept="image/*"
            (change)="onFile($event)"
            [disabled]="busy()"
            hidden
          />
          {{ busy() ? 'Uploading…' : (currentUrl() ? 'Replace' : 'Upload') }}
        </label>
        @if (currentUrl() && allowClear()) {
          <button type="button" class="btn-ghost" (click)="clear()" [disabled]="busy()">
            Remove
          </button>
        }
      </div>

      @if (error()) {
        <p class="form-error">{{ error() }}</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; flex: 1; }
    .image-upload {
      display: flex;
      flex-direction: row;
      gap: var(--space-3);
      align-items: center;
      justify-content: space-between;
    }
    .preview {
      width: 160px;
      height: 120px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      &.round {
        width: 96px;
        height: 96px;
        border-radius: 50%;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .placeholder {
        color: var(--color-ink-subtle);
        font-size: 13px;
      }
    }
    .actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }
    label.btn-secondary {
      cursor: pointer;
    }
  `],
})
export class ImageUpload {
  private uploads = inject(UploadService);

  currentUrl = input<string | null>(null);
  target = input.required<UploadTarget>();
  round = input<boolean>(false);
  allowClear = input<boolean>(true);
  maxSizeMb = input<number>(5);

  uploaded = output<string>();
  cleared = output<void>();

  busy = signal(false);
  error = signal<string | null>(null);

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.set('Please choose an image file');
      return;
    }
    const limitBytes = this.maxSizeMb() * 1024 * 1024;
    if (file.size > limitBytes) {
      this.error.set(`Image must be under ${this.maxSizeMb()} MB`);
      return;
    }

    this.error.set(null);
    this.busy.set(true);
    this.uploads.upload(file, this.target()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.uploaded.emit(res.secureUrl);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error || err?.message || 'Upload failed');
      },
    });
  }

  clear() {
    this.cleared.emit();
  }
}
