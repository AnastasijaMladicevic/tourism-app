import { Injectable, NgZone, OnDestroy, effect, inject } from '@angular/core';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class DomTranslationService implements OnDestroy {
  private readonly translationService = inject(TranslationService);
  private readonly zone = inject(NgZone);
  private readonly languageEffect = effect(() => {
    this.translationService.language();
    this.scheduleTranslation();
  });

  private observer?: MutationObserver;
  private isStarted = false;
  private isApplying = false;
  private pendingFrame: number | null = null;

  start(): void {
    if (this.isStarted || typeof document === 'undefined') {
      return;
    }

    this.isStarted = true;
    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => {
        if (!this.isApplying) {
          this.scheduleTranslation();
        }
      });

      this.observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['aria-label', 'placeholder', 'title', 'alt'],
        characterData: true,
        childList: true,
        subtree: true,
      });

      this.scheduleTranslation();
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.isStarted = false;

    if (this.pendingFrame !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
    this.languageEffect.destroy();
  }

  private scheduleTranslation(): void {
    if (typeof document === 'undefined' || this.pendingFrame !== null) {
      return;
    }

    const run = () => {
      this.pendingFrame = null;
      this.translateDocument();
    };

    if (typeof requestAnimationFrame === 'undefined') {
      window.setTimeout(run, 0);
      return;
    }

    this.pendingFrame = requestAnimationFrame(run);
  }

  private translateDocument(): void {
    if (!document.body) {
      return;
    }

    this.isApplying = true;

    try {
      this.translateNode(document.body);
    } finally {
      this.isApplying = false;
    }
  }

  private translateNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(node as Text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;

    if (this.shouldSkipElement(element)) {
      return;
    }

    this.translateAttributes(element);

    for (const child of Array.from(element.childNodes)) {
      this.translateNode(child);
    }
  }

  private translateTextNode(node: Text): void {
    const current = node.nodeValue ?? '';

    if (!/[A-Za-zÀ-ž]/.test(current) || this.shouldSkipTextParent(node.parentElement)) {
      return;
    }

    const translated = this.translationService.translateLiteral(current);

    if (translated !== current) {
      node.nodeValue = translated;
    }
  }

  private translateAttributes(element: HTMLElement): void {
    for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
      const current = element.getAttribute(attribute);

      if (!current || !/[A-Za-zÀ-ž]/.test(current)) {
        continue;
      }

      const translated = this.translationService.translateLiteral(current);

      if (translated !== current) {
        element.setAttribute(attribute, translated);
      }
    }
  }

  private shouldSkipTextParent(element: Element | null): boolean {
    return !!element && this.shouldSkipElement(element as HTMLElement);
  }

  private shouldSkipElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();

    if (['script', 'style', 'svg', 'code', 'pre'].includes(tagName)) {
      return true;
    }

    return (
      element.classList.contains('material-icons') ||
      element.classList.contains('material-icons-outlined') ||
      element.classList.contains('material-symbols-outlined') ||
      tagName === 'mat-icon'
    );
  }
}
