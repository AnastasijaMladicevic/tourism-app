import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface ReviewMediaGalleryItem {
  url: string;
  altText?: string | null;
}

@Component({
  selector: 'app-review-media-gallery',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './review-media-gallery.component.html',
  styleUrl: './review-media-gallery.component.css',
})
export class ReviewMediaGalleryComponent {
  @Input({ required: true }) images: readonly ReviewMediaGalleryItem[] = [];
  @Input() selectedUrl = '';
  @Input() previewBroken = false;
  @Input() compact = false;
  /** When true, renders only gallery content (no outer card); parent supplies step heading. */
  @Input() embedded = false;

  @Output() selectedUrlChange = new EventEmitter<string>();
  @Output() previewBrokenChange = new EventEmitter<boolean>();

  get previewUrl(): string {
    const selected = this.selectedUrl.trim();
    if (selected) {
      return selected;
    }

    return this.images[0]?.url?.trim() ?? '';
  }

  get sideThumbnails(): readonly ReviewMediaGalleryItem[] {
    const selectedUrl = this.previewUrl;
    if (!selectedUrl) {
      return this.images;
    }

    let removedSelectedOnce = false;
    return this.images.filter((image) => {
      const isSelected = image.url === selectedUrl;
      if (isSelected && !removedSelectedOnce) {
        removedSelectedOnce = true;
        return false;
      }

      return true;
    });
  }

  get hasGalleryImages(): boolean {
    return this.images.length > 0;
  }

  selectThumbnail(url: string): void {
    this.selectedUrlChange.emit(url.trim());
    this.previewBrokenChange.emit(false);
  }

  onPreviewError(): void {
    this.previewBrokenChange.emit(true);
  }
}
