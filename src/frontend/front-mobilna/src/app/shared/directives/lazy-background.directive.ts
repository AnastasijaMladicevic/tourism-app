import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[appLazyBackground]',
  standalone: true,
})
export class LazyBackgroundDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input('appLazyBackground') imageUrl?: string | null;
  @Input() lazyBackgroundImmediate = false;

  private observer?: IntersectionObserver;
  private hasViewInitialized = false;
  private isVisible = false;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    this.startObserving();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.hasViewInitialized) {
      return;
    }

    if (changes['lazyBackgroundImmediate']) {
      this.disconnectObserver();
      this.startObserving();
      return;
    }

    if (changes['imageUrl']) {
      if (!this.normalizedUrl) {
        this.clearBackground();
        return;
      }

      if (this.lazyBackgroundImmediate || this.isVisible) {
        this.applyBackground();
      } else {
        this.clearBackground();
      }
    }
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
  }

  private startObserving(): void {
    if (!this.normalizedUrl) {
      this.clearBackground();
      return;
    }

    if (this.lazyBackgroundImmediate || typeof window === 'undefined') {
      this.isVisible = true;
      this.applyBackground();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      this.isVisible = true;
      this.applyBackground();
      return;
    }

    this.isVisible = false;
    this.clearBackground();

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.isVisible = true;
          this.applyBackground();
          this.disconnectObserver();
        }
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01,
      },
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  private applyBackground(): void {
    if (!this.normalizedUrl) {
      this.clearBackground();
      return;
    }

    const safeUrl = this.normalizedUrl
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/"/g, '%22');

    this.renderer.setStyle(
      this.elementRef.nativeElement,
      'background-image',
      `url("${safeUrl}")`,
    );
  }

  private clearBackground(): void {
    this.renderer.removeStyle(this.elementRef.nativeElement, 'background-image');
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private get normalizedUrl(): string | null {
    const trimmed = this.imageUrl?.trim();
    return trimmed ? trimmed : null;
  }
}
