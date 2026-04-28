import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService } from './active-region';
import { SmartSearchResultDto } from './smart-search';

export interface AiChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequestDto {
  message: string;
  history?: AiChatMessageDto[];
  regionId?: number;
  latitude?: number;
  longitude?: number;
}

export interface AiChatResponseDto {
  answer: string;
  provider: string;
  usedTool: boolean;
  usedFallback: boolean;
  warning?: string;
  results: SmartSearchResultDto[];
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly url = `${environment.apiUrl}/ai/chat`;

  constructor(
    private readonly http: HttpClient,
    private readonly activeRegionService: ActiveRegionService,
  ) {}

  chat(request: AiChatRequestDto): Observable<AiChatResponseDto> {
    const regionId = request.regionId ?? this.activeRegionService.getActiveRegionId() ?? undefined;

    return this.http.post<AiChatResponseDto>(this.url, {
      ...request,
      regionId,
    });
  }
}
