import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationBannerMode = 'banner' | 'inbox';

export type AppNotificationType =
  | 'PlannerEventReminder2Hours'
  | 'ReviewReply'
  | 'FavoritedLocationNewEvent'
  | 'PlannerEventUpdated'
  | 'PlannerEventUnavailable'
  | 'ManagerNewPendingContent'
  | 'ManagerNewDeletionRequest'
  | 'CreatorContentReviewed'
  | 'CreatorNewObjectReview'
  | 'CreatorDeletionRequestReviewed'
  | 'AdminNewCreatorRoleRequest'
  | 'AdminNewManagerReport'
  | 'ManagerReportReviewed'
  | 'ReviewReplyUpdated'
  | 'CreatorObjectReviewDeleted'
  | 'AdminRepeatedManagerReports'
  | 'AdminCreatorMultipleRejectedContent';

export type NotificationPreferenceGroup =
  | 'travel'
  | 'reviews'
  | 'creator'
  | 'manager'
  | 'admin';

type AppNotificationRole =
  | 'tourist'
  | 'content-creator'
  | 'manager'
  | 'admin';

export interface NotificationPreferenceState {
  notificationsEnabled: boolean;
  bannerMode: NotificationBannerMode;
  types: Record<AppNotificationType, boolean>;
}

export interface NotificationPreferenceDefinition {
  type: AppNotificationType;
  group: NotificationPreferenceGroup;
  roles: AppNotificationRole[];
  titleKey: string;
  bodyKey: string;
}

export interface NotificationPreferenceGroupView {
  group: NotificationPreferenceGroup;
  titleKey: string;
  items: NotificationPreferenceDefinition[];
}

const DEFAULT_TYPE_PREFERENCES: Record<AppNotificationType, boolean> = {
  PlannerEventReminder2Hours: true,
  ReviewReply: true,
  FavoritedLocationNewEvent: true,
  PlannerEventUpdated: true,
  PlannerEventUnavailable: true,
  ManagerNewPendingContent: true,
  ManagerNewDeletionRequest: true,
  CreatorContentReviewed: true,
  CreatorNewObjectReview: true,
  CreatorDeletionRequestReviewed: true,
  AdminNewCreatorRoleRequest: true,
  AdminNewManagerReport: true,
  ManagerReportReviewed: true,
  ReviewReplyUpdated: true,
  CreatorObjectReviewDeleted: true,
  AdminRepeatedManagerReports: true,
  AdminCreatorMultipleRejectedContent: true,
};

const DEFAULT_STATE: NotificationPreferenceState = {
  notificationsEnabled: true,
  bannerMode: 'banner',
  types: { ...DEFAULT_TYPE_PREFERENCES },
};

const GROUP_TITLE_KEYS: Record<NotificationPreferenceGroup, string> = {
  travel: 'settings.notificationGroups.travel',
  reviews: 'settings.notificationGroups.reviews',
  creator: 'settings.notificationGroups.creator',
  manager: 'settings.notificationGroups.manager',
  admin: 'settings.notificationGroups.admin',
};

const NOTIFICATION_PREFERENCE_DEFINITIONS: NotificationPreferenceDefinition[] = [
  {
    type: 'FavoritedLocationNewEvent',
    group: 'travel',
    roles: ['tourist'],
    titleKey: 'settings.notificationTypes.favoritedLocationNewEvent.title',
    bodyKey: 'settings.notificationTypes.favoritedLocationNewEvent.body',
  },
  {
    type: 'PlannerEventReminder2Hours',
    group: 'travel',
    roles: ['tourist'],
    titleKey: 'settings.notificationTypes.plannerEventReminder2Hours.title',
    bodyKey: 'settings.notificationTypes.plannerEventReminder2Hours.body',
  },
  {
    type: 'PlannerEventUpdated',
    group: 'travel',
    roles: ['tourist'],
    titleKey: 'settings.notificationTypes.plannerEventUpdated.title',
    bodyKey: 'settings.notificationTypes.plannerEventUpdated.body',
  },
  {
    type: 'PlannerEventUnavailable',
    group: 'travel',
    roles: ['tourist'],
    titleKey: 'settings.notificationTypes.plannerEventUnavailable.title',
    bodyKey: 'settings.notificationTypes.plannerEventUnavailable.body',
  },
  {
    type: 'ReviewReply',
    group: 'reviews',
    roles: ['tourist'],
    titleKey: 'settings.notificationTypes.reviewReply.title',
    bodyKey: 'settings.notificationTypes.reviewReply.body',
  },
  {
    type: 'ReviewReplyUpdated',
    group: 'reviews',
    roles: ['tourist'],
    titleKey: 'settings.notificationTypes.reviewReplyUpdated.title',
    bodyKey: 'settings.notificationTypes.reviewReplyUpdated.body',
  },
  {
    type: 'CreatorContentReviewed',
    group: 'creator',
    roles: ['content-creator'],
    titleKey: 'settings.notificationTypes.creatorContentReviewed.title',
    bodyKey: 'settings.notificationTypes.creatorContentReviewed.body',
  },
  {
    type: 'CreatorNewObjectReview',
    group: 'creator',
    roles: ['content-creator'],
    titleKey: 'settings.notificationTypes.creatorNewObjectReview.title',
    bodyKey: 'settings.notificationTypes.creatorNewObjectReview.body',
  },
  {
    type: 'CreatorDeletionRequestReviewed',
    group: 'creator',
    roles: ['content-creator'],
    titleKey: 'settings.notificationTypes.creatorDeletionRequestReviewed.title',
    bodyKey: 'settings.notificationTypes.creatorDeletionRequestReviewed.body',
  },
  {
    type: 'CreatorObjectReviewDeleted',
    group: 'creator',
    roles: ['content-creator'],
    titleKey: 'settings.notificationTypes.creatorObjectReviewDeleted.title',
    bodyKey: 'settings.notificationTypes.creatorObjectReviewDeleted.body',
  },
  {
    type: 'ManagerNewPendingContent',
    group: 'manager',
    roles: ['manager'],
    titleKey: 'settings.notificationTypes.managerNewPendingContent.title',
    bodyKey: 'settings.notificationTypes.managerNewPendingContent.body',
  },
  {
    type: 'ManagerNewDeletionRequest',
    group: 'manager',
    roles: ['manager'],
    titleKey: 'settings.notificationTypes.managerNewDeletionRequest.title',
    bodyKey: 'settings.notificationTypes.managerNewDeletionRequest.body',
  },
  {
    type: 'ManagerReportReviewed',
    group: 'manager',
    roles: ['manager'],
    titleKey: 'settings.notificationTypes.managerReportReviewed.title',
    bodyKey: 'settings.notificationTypes.managerReportReviewed.body',
  },
  {
    type: 'AdminNewCreatorRoleRequest',
    group: 'admin',
    roles: ['admin'],
    titleKey: 'settings.notificationTypes.adminNewCreatorRoleRequest.title',
    bodyKey: 'settings.notificationTypes.adminNewCreatorRoleRequest.body',
  },
  {
    type: 'AdminNewManagerReport',
    group: 'admin',
    roles: ['admin'],
    titleKey: 'settings.notificationTypes.adminNewManagerReport.title',
    bodyKey: 'settings.notificationTypes.adminNewManagerReport.body',
  },
  {
    type: 'AdminRepeatedManagerReports',
    group: 'admin',
    roles: ['admin'],
    titleKey: 'settings.notificationTypes.adminRepeatedManagerReports.title',
    bodyKey: 'settings.notificationTypes.adminRepeatedManagerReports.body',
  },
  {
    type: 'AdminCreatorMultipleRejectedContent',
    group: 'admin',
    roles: ['admin'],
    titleKey: 'settings.notificationTypes.adminCreatorMultipleRejectedContent.title',
    bodyKey: 'settings.notificationTypes.adminCreatorMultipleRejectedContent.body',
  },
];

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  private readonly storageKey = 'spirego-notification-preferences';
  private readonly stateSubject = new BehaviorSubject<NotificationPreferenceState>(
    this.readState(),
  );

  readonly state$ = this.stateSubject.asObservable();

  getState(): NotificationPreferenceState {
    return this.stateSubject.value;
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.patchState({ notificationsEnabled: enabled });
  }

  setBannerMode(bannerMode: NotificationBannerMode): void {
    this.patchState({ bannerMode });
  }

  setTypeEnabled(type: AppNotificationType, enabled: boolean): void {
    this.patchState({
      types: {
        ...this.stateSubject.value.types,
        [type]: enabled,
      },
    });
  }

  isNotificationsEnabled(): boolean {
    return this.stateSubject.value.notificationsEnabled;
  }

  shouldShowBanner(type?: string | null): boolean {
    return (
      this.isNotificationsEnabled() &&
      this.stateSubject.value.bannerMode === 'banner' &&
      this.isTypeEnabled(type)
    );
  }

  shouldSurfaceNotification(type?: string | null): boolean {
    return this.isNotificationsEnabled() && this.isTypeEnabled(type);
  }

  isTypeEnabled(type?: string | null): boolean {
    const normalizedType = this.normalizeNotificationType(type);
    if (!normalizedType) {
      return true;
    }

    return this.stateSubject.value.types[normalizedType] !== false;
  }

  normalizeNotificationType(type?: string | null): AppNotificationType | null {
    if (!type) {
      return null;
    }

    const normalizedType = type.trim() as AppNotificationType;
    return normalizedType in DEFAULT_TYPE_PREFERENCES ? normalizedType : null;
  }

  getGroupedDefinitionsForRole(role?: string | null): NotificationPreferenceGroupView[] {
    const normalizedRole = this.normalizeRole(role);
    const visibleDefinitions = NOTIFICATION_PREFERENCE_DEFINITIONS.filter((definition) =>
      definition.roles.includes(normalizedRole),
    );

    const groupOrder: NotificationPreferenceGroup[] = ['travel', 'reviews', 'creator', 'manager', 'admin'];

    return groupOrder
      .map((group) => ({
        group,
        titleKey: GROUP_TITLE_KEYS[group],
        items: visibleDefinitions.filter((definition) => definition.group === group),
      }))
      .filter((group) => group.items.length > 0);
  }

  private patchState(patch: Partial<NotificationPreferenceState>): void {
    const nextState: NotificationPreferenceState = {
      ...this.stateSubject.value,
      ...patch,
      types: {
        ...this.stateSubject.value.types,
        ...(patch.types ?? {}),
      },
    };

    this.stateSubject.next(nextState);
    this.persistState(nextState);
  }

  private persistState(state: NotificationPreferenceState): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private readState(): NotificationPreferenceState {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_STATE;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return DEFAULT_STATE;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<NotificationPreferenceState>;
      return {
        notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_STATE.notificationsEnabled,
        bannerMode: parsed.bannerMode === 'inbox' ? 'inbox' : 'banner',
        types: {
          ...DEFAULT_TYPE_PREFERENCES,
          ...(parsed.types ?? {}),
        },
      };
    } catch {
      return DEFAULT_STATE;
    }
  }

  private normalizeRole(role?: string | null): AppNotificationRole {
    const normalizedRole = role?.trim().toLowerCase();

    switch (normalizedRole) {
      case 'admin':
        return 'admin';
      case 'manager':
        return 'manager';
      case 'content-creator':
      case 'contentcreator':
      case 'creator':
        return 'content-creator';
      case 'tourist':
      default:
        return 'tourist';
    }
  }
}
