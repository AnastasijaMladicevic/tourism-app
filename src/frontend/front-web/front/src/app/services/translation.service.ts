import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'sr' | 'en' | 'es' | 'it';

const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  sr: 'language.serbian',
  en: 'language.english',
  es: 'language.spanish',
  it: 'language.italian',
};

function normalizeLiteralKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function preserveLiteralWhitespace(source: string, translated: string): string {
  const prefix = source.match(/^\s*/)?.[0] ?? '';
  const suffix = source.match(/\s*$/)?.[0] ?? '';
  return `${prefix}${translated}${suffix}`;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'spirego-language';
  private readonly translationAssetVersion = '2026-06-01-event-ticket-price';
  private readonly activeLanguage = signal<AppLanguage>(this.readStoredLanguage());
  private translations: Record<string, string> = {};
  private literalTranslations = new Map<string, string>();

  readonly translationsVersion = signal(0);

  constructor() {
    effect(() => {
      const language = this.activeLanguage();

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, language);
      }

      if (typeof document !== 'undefined') {
        document.documentElement.lang = this.currentLocale();
      }

      this.http.get<Record<string, unknown>>(this.buildTranslationUrl(language)).subscribe({
        next: (data) => this.applyTranslationData(data),
        error: () => {
          this.translations = {};
          this.literalTranslations = new Map<string, string>();
          this.translationsVersion.update((value) => value + 1);
        },
      });
    });
  }

  async loadInitialTranslations(): Promise<void> {
    const language = this.activeLanguage();
    const data = await firstValueFrom(
      this.http.get<Record<string, unknown>>(this.buildTranslationUrl(language)),
    );
    this.applyTranslationData(data);
  }

  language(): AppLanguage {
    return this.activeLanguage();
  }

  currentLocale(): string {
    switch (this.activeLanguage()) {
      case 'en':
        return 'en-US';
      case 'es':
        return 'es-ES';
      case 'it':
        return 'it-IT';
      case 'sr':
      default:
        return 'sr-Latn-RS';
    }
  }

  setLanguage(language?: string | null): AppLanguage {
    const normalized = this.normalizeLanguage(language);
    this.activeLanguage.set(normalized);
    return normalized;
  }

  normalizeLanguageCode(language?: string | null): AppLanguage {
    return this.normalizeLanguage(language);
  }

  labelKeyForLanguage(language?: string | null): string {
    return LANGUAGE_LABEL_KEYS[this.normalizeLanguage(language)];
  }

  translate(key: string, params?: Record<string, string | number>): string {
    this.translationsVersion();

    const template = this.translations[key] ?? key;
    if (!params) return template;

    return Object.entries(params).reduce((value, [param, replacement]) => {
      return value.replaceAll(`{{${param}}}`, String(replacement));
    }, template);
  }

  translateLiteral(value?: string | null): string {
    this.translationsVersion();

    if (typeof value !== 'string') {
      return '';
    }

    const normalized = normalizeLiteralKey(value);
    if (!normalized) {
      return value;
    }

    const translated = this.literalTranslations.get(normalized) ?? this.translateLiteralPattern(normalized);
    return translated ? preserveLiteralWhitespace(value, translated) : value;
  }

  private applyTranslationData(data: Record<string, unknown>): void {
    const literals = this.readLiterals(data['__literals']);
    const clone = { ...data };
    delete clone['__literals'];

    this.translations = this.flatten(clone);
    this.literalTranslations = literals;
    this.translationsVersion.update((value) => value + 1);
  }

  private readLiterals(raw: unknown): Map<string, string> {
    const literals = new Map<string, string>();
    if (!raw || typeof raw !== 'object') {
      return literals;
    }

    for (const [source, translated] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof translated !== 'string') {
        continue;
      }

      literals.set(normalizeLiteralKey(source), translated);
      literals.set(normalizeLiteralKey(translated), translated);
    }

    return literals;
  }

  private flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(acc, this.flatten(value as Record<string, unknown>, fullKey));
      } else {
        acc[fullKey] = String(value ?? '');
      }

      return acc;
    }, {} as Record<string, string>);
  }

  private translateLiteralPattern(value: string): string | null {
    const language = this.activeLanguage();
    const demoVerification = value.match(/^Demo verification code: (.+)$/);
    if (demoVerification) {
      return this.resolveInline({
        sr: `Demo verifikacioni kod: ${demoVerification[1]}`,
        en: `Demo verification code: ${demoVerification[1]}`,
        es: `Codigo de verificacion demo: ${demoVerification[1]}`,
        it: `Demo verification code: ${demoVerification[1]}`,
      }, language);
    }

    const demoCode = value.match(/^Demo code: (.+)$/);
    if (demoCode) {
      return this.resolveInline({
        sr: `Demo kod: ${demoCode[1]}`,
        en: `Demo code: ${demoCode[1]}`,
        es: `Codigo demo: ${demoCode[1]}`,
        it: `Demo code: ${demoCode[1]}`,
      }, language);
    }

    const resend = value.match(/^Resend available in (\d+)s$/);
    if (resend) {
      return this.resolveInline({
        sr: `Ponovno slanje dostupno za ${resend[1]}s`,
        en: `Resend available in ${resend[1]}s`,
        es: `Reenvio disponible en ${resend[1]}s`,
        it: `Resend available in ${resend[1]}s`,
      }, language);
    }

    const guests = value.match(/^([\d,.]+) guests$/);
    if (guests) {
      return this.resolveInline({
        sr: `${guests[1]} gostiju`,
        en: `${guests[1]} guests`,
        es: `${guests[1]} visitantes`,
        it: `${guests[1]} guests`,
      }, language);
    }

    const stars = value.match(/^([1-5]) stars?$/);
    if (stars) {
      return this.resolveInline({
        sr: `${stars[1]} ${stars[1] === '1' ? 'zvezdica' : 'zvezdice'}`,
        en: `${stars[1]} ${stars[1] === '1' ? 'star' : 'stars'}`,
        es: `${stars[1]} ${stars[1] === '1' ? 'estrella' : 'estrellas'}`,
        it: `${stars[1]} ${stars[1] === '1' ? 'star' : 'stars'}`,
      }, language);
    }

    return null;
  }

  private resolveInline(entry: Record<AppLanguage, string>, language: AppLanguage): string {
    return entry[language] ?? entry.en ?? entry.sr ?? '';
  }

  private buildTranslationUrl(language: AppLanguage): string {
    return `/assets/i18n/${language}.json?v=${this.translationAssetVersion}`;
  }

  private readStoredLanguage(): AppLanguage {
    if (typeof localStorage === 'undefined') {
      return 'sr';
    }

    return this.normalizeLanguage(localStorage.getItem(this.storageKey));
  }

  private normalizeLanguage(language?: string | null): AppLanguage {
    const normalized = language?.trim().toLowerCase();

    if (!normalized) {
      return 'sr';
    }

    if (normalized === 'me' || normalized === 'cnr' || normalized.startsWith('sr')) {
      return 'sr';
    }

    if (normalized.startsWith('es')) {
      return 'es';
    }

    if (normalized.startsWith('it')) {
      return 'it';
    }

    if (normalized.startsWith('en')) {
      return 'en';
    }

    return 'sr';
  }
}
