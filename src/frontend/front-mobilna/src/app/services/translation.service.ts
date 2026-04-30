import { Injectable, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'sr' | 'en' | 'es' | 'it';

const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  sr: 'language.serbianMontenegrin',
  en: 'language.english',
  es: 'language.spanish',
  it: 'language.italian',
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'spirego-language';
  private readonly translationAssetVersion = '2026-04-30-profile-favorites-edit';
  private readonly activeLanguage = signal<AppLanguage>(this.readStoredLanguage());
  private translations: Record<string, string> = {};

  // Signal koji se menja svaki put kad se prevodi učitaju —
  // TranslatePipe (pure: false) će se ponovo evaluirati
  readonly translationsVersion = signal(0);

  constructor() {
    effect(() => {
      const lang = this.activeLanguage();

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, lang);
      }

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang);
      }

      this.http.get<Record<string, any>>(this.buildTranslationUrl(lang))
        .subscribe(data => {
          this.translations = this.flatten(data);
          // Povećaj verziju → TranslatePipe detektuje promenu i ponovo renderuje
          this.translationsVersion.update(v => v + 1);
        });
    });
  }

  // Koristi se u APP_INITIALIZER — čeka da se JSON učita pre starta appa
  async loadInitialTranslations(): Promise<void> {
    const lang = this.activeLanguage();
    const data = await firstValueFrom(
      this.http.get<Record<string, any>>(this.buildTranslationUrl(lang))
    );
    this.translations = this.flatten(data);
    this.translationsVersion.update(v => v + 1);
  }

  language(): AppLanguage {
    return this.activeLanguage();
  }

  currentLocale(): string {
    switch (this.activeLanguage()) {
      case 'en': return 'en-US';
      case 'es': return 'es-ES';
      case 'it': return 'it-IT';
      case 'sr':
      default:   return 'sr-Latn-RS';
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
    // Čitamo signal da Angular zna da zavisi od njega
    this.translationsVersion();

    const template = this.translations[key] ?? key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (val, [k, v]) => val.replaceAll(`{{${k}}}`, String(v)), template
    );
  }

  private flatten(obj: any, prefix = ''): Record<string, string> {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null) {
        Object.assign(acc, this.flatten(val, fullKey));
      } else {
        acc[fullKey] = String(val);
      }
      return acc;
    }, {} as Record<string, string>);
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
    switch (language?.trim().toLowerCase()) {
      case 'me':
      case 'cnr':
        return 'sr';
      case 'en': return 'en';
      case 'es': return 'es';
      case 'it': return 'it';
      case 'sr':
      default:   return 'sr';
    }
  }
}
