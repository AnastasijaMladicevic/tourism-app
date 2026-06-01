import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, finalize, map, switchMap, tap, toArray } from 'rxjs/operators';
import { ApproveContentDto } from '../../../../models/event.model';
import {
  CreateObjectDto,
  ObjectDto,
  ObjectImageDto,
  ObjectService,
  ObjectTypeOption,
  UpdateObjectDto
} from '../../../../services/object';
import { ActivitiesService, LocalityOption } from '../../../../services/activities';
import { DestinationDto, DestinationService } from '../../../../services/destination.service';
import { AuthService } from '../../../../services/auth.service';
import { ReviewDto, ReviewService } from '../../../../services/review';
import { MapComponent as SharedMapComponent } from '../../../../shared/components/map/map';
import { mapReviewDtosToObjectThreads } from '../../../manager/shared/manager-object-review.mapper';
import {
  isConcerningCreatorReply,
  ManagerObjectReviewThread,
} from '../../../manager/shared/manager-object-review.mock';

type WorkingDayKey = 'pon' | 'uto' | 'sre' | 'cet' | 'pet' | 'sub' | 'ned';

@Component({
  selector: 'app-object-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SharedMapComponent],
  templateUrl: './object-create.component.html',
  styleUrls: [
    './object-create.component.css',
    '../../../admin/shared/admin-page-title.css',
    '../../shared/cc-list-page-header.css'
  ]
})
export class ObjectCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly objectService = inject(ObjectService);
  private readonly destinationService = inject(DestinationService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly authService = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Manager opens this page read-only via `/manager/objects/review/:id` (route data). */
  isManagerReview = false;

  /** Latest content status from API (for approve/decline availability). */
  reviewObjectStatus = '';

  isReviewSubmitting = false;
  showDeclineModal = false;
  rejectionReason = '';

  /** CC edit: delete vs manager deletion request (approved objects). */
  showDeleteModal = false;
  isDeletingObject = false;

  readonly workingDays: Array<{ key: WorkingDayKey; label: string }> = [
    { key: 'pon', label: 'Monday' },
    { key: 'uto', label: 'Tuesday' },
    { key: 'sre', label: 'Wednesday' },
    { key: 'cet', label: 'Thursday' },
    { key: 'pet', label: 'Friday' },
    { key: 'sub', label: 'Saturday' },
    { key: 'ned', label: 'Sunday' }
  ];

  objectTypes: ObjectTypeOption[] = [];
  destinations: DestinationDto[] = [];
  localities: LocalityOption[] = [];

  isLoadingOptions = true;
  isLoadingObject = false;
  isSubmitting = false;
  errorMessage = '';
  isEditMode = false;
  objectId: number | null = null;
  private deletionRequestSubmitted = false;
  private loadedObject: ObjectDto | null = null;
  private readonly maxImageCount = 8;

  /** Read-only gallery used in manager review mode. */
  imageUrls: string[] = [];
  /** Editable gallery used in content creator mode. */
  editableImageUrls: string[] = [];
  private readonly pendingImageFiles = new Map<string, File>();
  selectedReviewImageUrl = '';

  /** Last-known server image rows for this object (used to delete/update on save). */
  imagesSnapshot: ObjectImageDto[] = [];

  expandedGuestReviewId: number | null = null;
  managerGuestReviews: ManagerObjectReviewThread[] = [];
  managerGuestReviewsLoading = false;

  previewReviews: ReviewDto[] = [];
  isLoadingPreviewReviews = false;
  private readonly previewReviewsLimit = 3;

  /** Server-backed sidebar row when editing / reviewing an existing object. */
  editSidebar: {
    averageRating: number | null;
    reviewCount: number;
    creatorFullName: string;
    creatorInitials: string;
    createdUpdatedLine: string;
  } | null = null;

  form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    address: this.fb.nonNullable.control('', [Validators.maxLength(300)]),
    description: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
    objectTypeId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    destinationId: this.fb.control<number | null>(null),
    localityId: this.fb.control<number | null>(null),
    price: this.fb.control<number | null>(null, [Validators.min(0)]),
    latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
    longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    amenitiesInput: this.fb.nonNullable.control('')
  });

  workingHoursForm = this.fb.group({
    ponOpen: this.fb.nonNullable.control(''),
    ponClose: this.fb.nonNullable.control(''),
    utoOpen: this.fb.nonNullable.control(''),
    utoClose: this.fb.nonNullable.control(''),
    sreOpen: this.fb.nonNullable.control(''),
    sreClose: this.fb.nonNullable.control(''),
    cetOpen: this.fb.nonNullable.control(''),
    cetClose: this.fb.nonNullable.control(''),
    petOpen: this.fb.nonNullable.control(''),
    petClose: this.fb.nonNullable.control(''),
    subOpen: this.fb.nonNullable.control(''),
    subClose: this.fb.nonNullable.control(''),
    nedOpen: this.fb.nonNullable.control(''),
    nedClose: this.fb.nonNullable.control('')
  });

  ngOnDestroy(): void {
    this.releasePendingImagePreviews();
  }

  ngOnInit(): void {
    this.isManagerReview = this.route.snapshot.data['managerReview'] === true;

    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    if (this.isManagerReview) {
      if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
        this.isEditMode = true;
        this.objectId = idFromRoute;
      }
    } else if (Number.isFinite(idFromRoute) && idFromRoute > 0) {
      this.isEditMode = true;
      this.objectId = idFromRoute;
    }

    if (!(this.isEditMode && this.objectId)) {
      this.loadOptions();
    }

    this.form.controls.destinationId.valueChanges.subscribe(() => {
      this.applyLocationFromSelection();
    });

    this.form.controls.localityId.valueChanges.subscribe(() => {
      this.applyLocationFromSelection();
    });

    if (this.isEditMode && this.objectId) {
      this.loadObjectForEdit(this.objectId);
    }
  }

  get pageTitle(): string {
    if (this.isManagerReview) {
      return 'Review object';
    }
    return this.isEditMode ? 'Edit Object' : 'Create Object';
  }

  get showCcReviewsPreview(): boolean {
    return this.isEditMode && this.objectId != null && !this.isManagerReview;
  }

  get hasPreviewReviews(): boolean {
    return this.previewReviews.length > 0;
  }

  get showViewMoreReviews(): boolean {
    const total = this.editSidebar?.reviewCount ?? this.previewReviews.length;
    return this.previewReviews.length > 0 && total > this.previewReviews.length;
  }

  get previewReviewsCountLabel(): string {
    const total = this.editSidebar?.reviewCount ?? this.previewReviews.length;
    if (total > this.previewReviews.length) {
      return `Showing ${this.previewReviews.length} of ${total}`;
    }

    const count = this.previewReviews.length;
    return `${count} review${count === 1 ? '' : 's'}`;
  }

  get pageIntro(): string {
    if (this.isManagerReview) {
      return 'View object details submitted for approval. Editing is disabled.';
    }
    return 'Add a new object with location, details, amenities, and opening hours.';
  }

  get objectsListPath(): string {
    return this.isManagerReview ? '/manager/objects' : '/content-creator/objects';
  }

  get eyebrowLabel(): string {
    return this.isManagerReview ? 'Objects review' : 'Objects management';
  }

  get reviewStatusKey(): string {
    return (this.reviewObjectStatus ?? '').toLowerCase();
  }

  get approveActionDisabled(): boolean {
    const s = this.reviewStatusKey;
    return (
      this.isReviewSubmitting ||
      !this.objectId ||
      s === 'approved' ||
      s === 'rejected'
    );
  }

  get declineActionDisabled(): boolean {
    const s = this.reviewStatusKey;
    return (
      this.isReviewSubmitting ||
      !this.objectId ||
      s === 'approved' ||
      s === 'rejected'
    );
  }

  get hasConcerningGuestReply(): boolean {
    return this.managerGuestReviews.some((t) => isConcerningCreatorReply(t));
  }

  get primaryReportThread(): ManagerObjectReviewThread | null {
    return this.managerGuestReviews.find((t) => isConcerningCreatorReply(t)) ?? null;
  }

  /** CC edit only: approved tourist objects require a manager-reviewed deletion request. */
  get isApprovedObject(): boolean {
    if (this.isManagerReview) {
      return false;
    }
    return this.reviewObjectStatus.toLowerCase() === 'approved';
  }

  get deleteModalTitle(): string {
    return this.isApprovedObject ? 'Request deletion' : 'Confirm deletion';
  }

  get hasPendingDeletionRequest(): boolean {
    if (this.deletionRequestSubmitted) {
      return true;
    }

    if (this.loadedObject?.hasPendingDeletionRequest) {
      return true;
    }

    const status = this.reviewObjectStatus.toLowerCase();
    return status.includes('deletion');
  }

  get deleteModalDescription(): string {
    return this.isApprovedObject
      ? 'This object is approved, so removal requires a manager deletion request.'
      : 'This object is still pending, so it can be removed immediately.';
  }

  openDeleteModal(): void {
    if (!this.isEditMode || !this.objectId || this.isSubmitting || this.isDeletingObject || this.isManagerReview || this.hasPendingDeletionRequest) {
      return;
    }
    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  closeDeleteModal(): void {
    if (this.isDeletingObject) {
      return;
    }
    this.showDeleteModal = false;
  }

  deleteObject(): void {
    if (!this.isEditMode || !this.objectId || this.isSubmitting || this.isDeletingObject || this.isManagerReview) {
      return;
    }

    if (this.isApprovedObject) {
      if (this.hasPendingDeletionRequest) {
        this.showDeleteModal = false;
        return;
      }
      this.submitObjectDeletionRequest();
      return;
    }

    this.submitObjectDirectDeletion();
  }

  private submitObjectDeletionRequest(): void {
    if (!this.objectId || this.isDeletingObject) {
      return;
    }

    this.isDeletingObject = true;
    this.errorMessage = '';

    this.objectService
      .requestDeletion(this.objectId)
      .pipe(
        finalize(() => {
          this.isDeletingObject = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.deletionRequestSubmitted = true;
          if (this.loadedObject) {
            this.loadedObject.hasPendingDeletionRequest = true;
          }
          this.showDeleteModal = false;
          this.router.navigate(['/content-creator/objects']);
        },
        error: (error: unknown) => {
          const message =
            error && typeof error === 'object' && 'error' in error
              ? (error as { error?: { message?: string } }).error?.message
              : undefined;
          this.errorMessage = message ?? 'Failed to submit deletion request';
        }
      });
  }

  private submitObjectDirectDeletion(): void {
    if (!this.objectId || this.isDeletingObject) {
      return;
    }

    this.isDeletingObject = true;
    this.errorMessage = '';

    this.objectService
      .delete(this.objectId)
      .pipe(
        finalize(() => {
          this.isDeletingObject = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.showDeleteModal = false;
          this.router.navigate(['/content-creator/objects']);
        },
        error: (error: unknown) => {
          const message =
            error && typeof error === 'object' && 'error' in error
              ? (error as { error?: { message?: string } }).error?.message
              : undefined;
          this.errorMessage = message ?? 'Failed to delete object';
        }
      });
  }

  approveObject(): void {
    if (!this.isManagerReview || !this.objectId || this.approveActionDisabled) {
      return;
    }

    this.isReviewSubmitting = true;
    this.errorMessage = '';

    const dto: ApproveContentDto = { approve: true };

    this.objectService
      .approve(this.objectId, dto)
      .pipe(finalize(() => (this.isReviewSubmitting = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/manager/objects']);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to approve object.';
        }
      });
  }

  openDeclineModal(): void {
    if (!this.objectId || this.isReviewSubmitting || this.declineActionDisabled) {
      return;
    }

    this.rejectionReason = '';
    this.errorMessage = '';
    this.showDeclineModal = true;
  }

  closeDeclineModal(): void {
    if (this.isReviewSubmitting) {
      return;
    }
    this.showDeclineModal = false;
  }

  declineObject(): void {
    if (!this.objectId || this.isReviewSubmitting) {
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.errorMessage = 'Please provide a reason for decline.';
      return;
    }

    this.isReviewSubmitting = true;
    this.errorMessage = '';

    const dto: ApproveContentDto = {
      approve: false,
      rejectionReason: this.rejectionReason.trim()
    };

    this.objectService
      .approve(this.objectId, dto)
      .pipe(finalize(() => (this.isReviewSubmitting = false)))
      .subscribe({
        next: () => {
          this.showDeclineModal = false;
          this.router.navigate(['/manager/objects']);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to decline object.';
        }
      });
  }

  get filteredLocalities(): LocalityOption[] {
    const destinationId = this.form.controls.destinationId.value;
    if (!destinationId) {
      return this.localities;
    }

    return this.localities.filter((locality) => locality.destinationId === destinationId);
  }

  get mapLat(): number {
    return this.form.controls.latitude.value ?? 42.424;
  }

  get mapLng(): number {
    return this.form.controls.longitude.value ?? 18.771;
  }

  get hasMapCoordinates(): boolean {
    return this.form.controls.latitude.value != null && this.form.controls.longitude.value != null;
  }

  get hasEditableImages(): boolean {
    return this.editableImageUrls.length > 0;
  }

  onGalleryFilesSelected(event: Event): void {
    if (this.isManagerReview) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!selectedFiles.length) {
      return;
    }

    const remainingSlots = this.maxImageCount - this.editableImageUrls.length;
    if (remainingSlots <= 0) {
      this.errorMessage = `You can upload up to ${this.maxImageCount} images per object.`;
      input.value = '';
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, remainingSlots);
    for (const file of acceptedFiles) {
      const previewUrl = URL.createObjectURL(file);
      this.pendingImageFiles.set(previewUrl, file);
      this.editableImageUrls.push(previewUrl);
    }

    this.errorMessage =
      acceptedFiles.length < selectedFiles.length
        ? `Only the first ${remainingSlots} images were added. Each object can have up to ${this.maxImageCount} images.`
        : '';

    input.value = '';
  }

  removeImage(index: number): void {
    if (this.isManagerReview) {
      return;
    }
    if (index < 0 || index >= this.editableImageUrls.length) {
      return;
    }

    const [removedUrl] = this.editableImageUrls.splice(index, 1);
    this.revokePendingPreview(removedUrl);
  }

  setPrimaryImage(index: number): void {
    if (this.isManagerReview) {
      return;
    }
    if (index <= 0 || index >= this.editableImageUrls.length) {
      return;
    }

    const [selected] = this.editableImageUrls.splice(index, 1);
    this.editableImageUrls.unshift(selected);
  }

  selectReviewImage(url: string): void {
    this.selectedReviewImageUrl = url?.trim() ?? '';
  }

  trackByReviewId(_: number, review: ReviewDto): number {
    return review.id;
  }

  getReviewInitials(review: ReviewDto): string {
    const fullName = review.userFullName?.trim();
    if (!fullName) {
      return 'U';
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  getReviewTimeAgo(value?: string): string {
    if (!value) {
      return '';
    }

    const createdAt = new Date(value).getTime();
    if (!Number.isFinite(createdAt)) {
      return '';
    }

    const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return `${weeks}w ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }

    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  onViewMoreReviews(): void {
    if (!this.objectId) {
      return;
    }

    this.router.navigate(['/content-creator/reviews'], {
      queryParams: { objectId: this.objectId }
    });
  }

  get reviewImagePreviewUrl(): string {
    if (this.selectedReviewImageUrl) {
      return this.selectedReviewImageUrl;
    }

    return this.imageUrls[0] ?? '';
  }

  get sideReviewImages(): string[] {
    const selectedUrl = this.reviewImagePreviewUrl;
    if (!selectedUrl) {
      return this.imageUrls;
    }

    let removedSelectedOnce = false;
    return this.imageUrls.filter((url) => {
      const isSelected = url === selectedUrl;
      if (isSelected && !removedSelectedOnce) {
        removedSelectedOnce = true;
        return false;
      }

      return true;
    });
  }

  goBack(): void {
    this.location.back();
  }

  get locationSummary(): string {
    const localityId = this.form.controls.localityId.value;
    const destinationId = this.form.controls.destinationId.value;
    const localityName = localityId ? this.localities.find((item) => item.id === localityId)?.name : '';
    const destinationName = destinationId ? this.destinations.find((item) => item.id === destinationId)?.name : '';

    if (localityName && destinationName) {
      return `${localityName}, ${destinationName}`;
    }

    return localityName || destinationName || 'Set destination/locality for location context';
  }

  get latitudeLabel(): string {
    const value = this.form.controls.latitude.value;
    return value == null ? '-' : Number(value).toFixed(6);
  }

  get longitudeLabel(): string {
    const value = this.form.controls.longitude.value;
    return value == null ? '-' : Number(value).toFixed(6);
  }

  getWorkingOpenControl(day: WorkingDayKey) {
    switch (day) {
      case 'pon': return this.workingHoursForm.controls.ponOpen;
      case 'uto': return this.workingHoursForm.controls.utoOpen;
      case 'sre': return this.workingHoursForm.controls.sreOpen;
      case 'cet': return this.workingHoursForm.controls.cetOpen;
      case 'pet': return this.workingHoursForm.controls.petOpen;
      case 'sub': return this.workingHoursForm.controls.subOpen;
      case 'ned': return this.workingHoursForm.controls.nedOpen;
    }
  }

  getWorkingCloseControl(day: WorkingDayKey) {
    switch (day) {
      case 'pon': return this.workingHoursForm.controls.ponClose;
      case 'uto': return this.workingHoursForm.controls.utoClose;
      case 'sre': return this.workingHoursForm.controls.sreClose;
      case 'cet': return this.workingHoursForm.controls.cetClose;
      case 'pet': return this.workingHoursForm.controls.petClose;
      case 'sub': return this.workingHoursForm.controls.subClose;
      case 'ned': return this.workingHoursForm.controls.nedClose;
    }
  }

  submit(): void {
    if (this.isManagerReview) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const destinationId = this.form.controls.destinationId.value ?? undefined;
    const localityId = this.form.controls.localityId.value ?? undefined;
    if (!destinationId && !localityId) {
      this.errorMessage = 'Please choose destination or locality.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateObjectDto | UpdateObjectDto = {
      name: this.form.controls.name.value?.trim() || '',
      address: this.optionalTrimmed(this.form.controls.address.value),
      description: this.optionalTrimmed(this.form.controls.description.value),
      objectTypeId: Number(this.form.controls.objectTypeId.value),
      destinationId,
      localityId,
      price: this.form.controls.price.value ?? undefined,
      latitude: this.form.controls.latitude.value ?? undefined,
      longitude: this.form.controls.longitude.value ?? undefined,
      workingHours: this.buildWorkingHoursPayload(),
      amenities: this.parseAmenities(this.form.controls.amenitiesInput.value)
    };

    const request$ = this.isEditMode && this.objectId
      ? this.objectService.update(this.objectId, payload as UpdateObjectDto)
      : this.objectService.create(payload as CreateObjectDto);

    request$
      .pipe(
        switchMap((obj) => {
          if (this.isEditMode && this.objectId) {
            return this.syncImagesAfterSave(this.objectId, this.editableImageUrls, this.imagesSnapshot).pipe(map(() => obj));
          }
          return this.attachImagesAfterCreate(obj as ObjectDto);
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/content-creator/objects']);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to save object.';
        }
      });
  }

  private attachImagesAfterCreate(created: ObjectDto): Observable<ObjectDto> {
    if (this.editableImageUrls.length === 0) {
      return of(created);
    }

    return this.uploadPendingImages(created.id, this.editableImageUrls, 0).pipe(
      map(() => created),
      catchError(() => of(created))
    );
  }

  /**
   * Applies gallery changes on edit: deletes removed rows, adds new URLs, then aligns main image with order.
   */
  private syncImagesAfterSave(
    objectId: number,
    desiredOrdered: string[],
    snapshot: ObjectImageDto[]
  ): Observable<void> {
    const desired = desiredOrdered.map((u) => u.trim()).filter((u) => u.length > 0);
    const desiredExistingSet = new Set(desired.filter((url) => !this.pendingImageFiles.has(url)));

    const toDelete = snapshot.filter((img) => !desiredExistingSet.has(img.url.trim()));
    const surviving = snapshot.filter((img) => desiredExistingSet.has(img.url.trim()));

    const urlToId = new Map<string, number>();
    for (const img of surviving) {
      urlToId.set(img.url.trim(), img.id);
    }

    const delete$ =
      toDelete.length === 0
        ? of(undefined)
        : forkJoin(toDelete.map((d) => this.objectService.deleteImageById(d.id))).pipe(
            map(() => undefined),
            catchError(() => of(undefined))
          );

    return delete$.pipe(
      switchMap(() => this.uploadPendingImages(objectId, desired, surviving.length, urlToId)),
      switchMap((updatedMap) => this.ensureMainImage(desired, updatedMap))
    );
  }

  private ensureMainImage(desired: string[], urlToId: Map<string, number>): Observable<void> {
    if (desired.length === 0) {
      return of(undefined);
    }

    const mainId = urlToId.get(desired[0]);
    if (!mainId) {
      return of(undefined);
    }

    return this.objectService.setMainImage(mainId).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  private uploadPendingImages(
    objectId: number,
    desiredOrdered: string[],
    existingCount: number,
    urlToId = new Map<string, number>()
  ): Observable<Map<string, number>> {
    const pendingEntries = desiredOrdered
      .filter((url) => this.pendingImageFiles.has(url))
      .map((previewUrl) => ({
        previewUrl,
        file: this.pendingImageFiles.get(previewUrl)!
      }));

    if (pendingEntries.length === 0) {
      return of(urlToId);
    }

    return from(pendingEntries).pipe(
      concatMap((entry, index) =>
        this.objectService.addImage(objectId, entry.file, existingCount === 0 && index === 0).pipe(
          tap((dto) => {
            urlToId.set(entry.previewUrl, dto.id);
          })
        )
      ),
      toArray(),
      map(() => urlToId)
    );
  }

  private revokePendingPreview(previewUrl: string | undefined): void {
    if (!previewUrl || !this.pendingImageFiles.has(previewUrl)) {
      return;
    }

    this.pendingImageFiles.delete(previewUrl);
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private releasePendingImagePreviews(): void {
    for (const previewUrl of this.pendingImageFiles.keys()) {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }
    this.pendingImageFiles.clear();
  }

  private loadOptions(): void {
    this.isLoadingOptions = true;

    this.fetchOptionLists().pipe(
      finalize(() => {
        this.isLoadingOptions = false;
      })
    ).subscribe({
      next: ({ objectTypes, destinations, localities }) => {
        this.objectTypes = objectTypes;
        this.destinations = destinations;
        this.localities = localities;
        this.applyLocationFromSelection();
      }
    });
  }

  /**
   * Loads dropdown options and the object together so selects always have matching options
   * before patchValue (avoids blank selects when options arrive after the object payload).
   */
  private loadObjectForEdit(id: number): void {
    this.isLoadingObject = true;
    this.isLoadingOptions = true;
    this.errorMessage = '';

    forkJoin({
      lists: this.fetchOptionLists(),
      objectItem: this.objectService.getById(id),
      images: this.objectService.getImages(id).pipe(catchError(() => of([] as ObjectImageDto[])))
    }).pipe(
      finalize(() => {
        this.isLoadingObject = false;
        this.isLoadingOptions = false;
      })
    ).subscribe({
      next: ({ lists, objectItem, images }) => {
        this.objectTypes = lists.objectTypes;
        this.destinations = lists.destinations;
        this.localities = lists.localities;
        const merged: ObjectDto = {
          ...objectItem,
          images: images.length > 0 ? images : objectItem.images ?? []
        };
        this.mergeOptionsFromLoadedObject(merged);
        this.applyFormFromObject(merged);
        this.loadCcPreviewReviews(merged.id);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load object details.';
        this.previewReviews = [];
        this.isLoadingPreviewReviews = false;
      }
    });
  }

  private loadCcPreviewReviews(objectId: number): void {
    if (!this.showCcReviewsPreview) {
      return;
    }

    this.isLoadingPreviewReviews = true;
    this.previewReviews = [];

    this.reviewService
      .getForCreator({ objectId, sortBy: 'createdAt', sortOrder: 'desc', pageSize: 100 }, { bypassRegion: true })
      .pipe(
        map((response) => response.items ?? []),
        catchError(() => of([] as ReviewDto[])),
        finalize(() => {
          this.isLoadingPreviewReviews = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((reviews) => {
        this.previewReviews = [...(reviews ?? [])]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, this.previewReviewsLimit);
      });
  }

  private fetchOptionLists(): Observable<{
    objectTypes: ObjectTypeOption[];
    destinations: DestinationDto[];
    localities: LocalityOption[];
  }> {
    return forkJoin({
      objectTypes: this.objectService.getObjectTypeOptions().pipe(catchError(() => of([]))),
      destinations: this.destinationService.getAll(
        {
          page: 1,
          pageSize: 300,
          sortBy: 'name',
          sortOrder: 'asc'
        },
        { bypassRegion: true }
      ).pipe(
        map((response: DestinationDto[] | { items?: DestinationDto[] }) => {
          return Array.isArray(response) ? response : (response.items ?? []);
        }),
        catchError(() => of([]))
      ),
      localities: this.activitiesService.getLocalityOptions().pipe(catchError(() => of([])))
    });
  }

  /** Ensures current IDs always appear in selects (region filter, pagination, or type derivation gaps). */
  private buildOrderedImageUrls(o: ObjectDto): string[] {
    const imgs = o.images ?? [];
    if (imgs.length > 0) {
      const sorted = [...imgs].sort((a, b) => {
        if (a.isMain === b.isMain) {
          return 0;
        }
        return a.isMain ? -1 : 1;
      });
      const urls = sorted.map((i) => i.url?.trim()).filter((u): u is string => !!u);
      const seen = new Set<string>();
      return urls.filter((u) => {
        if (seen.has(u)) {
          return false;
        }
        seen.add(u);
        return true;
      });
    }

    const main = o.mainImageUrl?.trim();
    if (main) {
      return [main];
    }
    return [];
  }

  private mergeOptionsFromLoadedObject(o: ObjectDto): void {
    const typeId = this.normalizeOptionalId(o.objectTypeId);
    if (typeId != null && !this.objectTypes.some((t) => t.id === typeId)) {
      this.objectTypes = [
        ...this.objectTypes,
        { id: typeId, name: o.objectTypeName?.trim() || `Type #${typeId}` }
      ].sort((a, b) => a.name.localeCompare(b.name));
    }

    const destId = this.normalizeOptionalId(o.destinationId);
    if (destId != null && !this.destinations.some((d) => d.id === destId)) {
      const synthetic: DestinationDto = {
        id: destId,
        name: o.destinationName?.trim() || `Destination #${destId}`,
        isActive: true,
        destinationTypeId: 0,
        destinationTypeName: ''
      };
      this.destinations = [...this.destinations, synthetic].sort((a, b) => a.name.localeCompare(b.name));
    }

    const locId = this.normalizeOptionalId(o.localityId);
    if (locId != null && !this.localities.some((l) => l.id === locId)) {
      const synthetic: LocalityOption = {
        id: locId,
        name: o.localityName?.trim() || `Locality #${locId}`,
        destinationId: this.normalizeOptionalId(o.destinationId) ?? 0,
        destinationName: o.destinationName?.trim() || ''
      };
      this.localities = [...this.localities, synthetic].sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private applyFormFromObject(objectItem: ObjectDto): void {
    this.loadedObject = objectItem;
    this.deletionRequestSubmitted = !!objectItem.hasPendingDeletionRequest;
    const imgs = objectItem.images ?? [];
    this.imagesSnapshot = imgs.map((i) => ({ ...i }));
    const orderedImageUrls = this.buildOrderedImageUrls(objectItem);
    if (this.isManagerReview) {
      this.imageUrls = orderedImageUrls;
      this.selectedReviewImageUrl = this.imageUrls[0] ?? '';
    } else {
      this.releasePendingImagePreviews();
      this.editableImageUrls = orderedImageUrls;
    }

    this.form.patchValue(
      {
        name: objectItem.name ?? '',
        address: objectItem.address ?? '',
        description: objectItem.description ?? '',
        objectTypeId: this.normalizeOptionalId(objectItem.objectTypeId),
        destinationId: this.normalizeOptionalId(objectItem.destinationId),
        localityId: this.normalizeOptionalId(objectItem.localityId),
        price: objectItem.price ?? null,
        latitude: objectItem.latitude ?? null,
        longitude: objectItem.longitude ?? null,
        amenitiesInput: (objectItem.amenities ?? []).join(', ')
      },
      { emitEvent: false }
    );

    const creatorName = this.resolveCreatorDisplayName(objectItem);
    this.editSidebar = {
      averageRating: this.normalizeOptionalNumber(objectItem.averageRating),
      reviewCount: Number.isFinite(Number(objectItem.reviewCount)) ? Number(objectItem.reviewCount) : 0,
      creatorFullName: creatorName,
      creatorInitials: this.initialsFromFullName(creatorName),
      createdUpdatedLine: this.formatCreatedUpdatedLine(objectItem.createdAt, objectItem.updatedAt)
    };

    const lat = this.form.controls.latitude.value;
    const lng = this.form.controls.longitude.value;
    if (lat == null || lng == null) {
      this.applyLocationFromSelection();
    }

    this.patchWorkingHours(objectItem.workingHours);
    this.reviewObjectStatus = (objectItem.status ?? '').trim();
    this.applyManagerReadOnlyState();
    if (this.isManagerReview && this.objectId) {
      this.loadManagerGuestReviews(this.objectId, creatorName, objectItem.createdByUserId);
    }
  }

  private loadManagerGuestReviews(
    objectId: number,
    creatorName: string,
    createdByUserId?: number,
  ): void {
    if (!this.isManagerReview) {
      return;
    }

    this.managerGuestReviewsLoading = true;
    this.managerGuestReviews = [];

    this.reviewService
      .getAll({ objectId, sortBy: 'createdAt', sortOrder: 'desc', pageSize: 100 })
      .pipe(
        map((response) => response.items ?? []),
        catchError(() => of([] as ReviewDto[])),
        finalize(() => {
          this.managerGuestReviewsLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((reviews) => {
        this.managerGuestReviews = mapReviewDtosToObjectThreads(
          reviews,
          createdByUserId ?? 0,
          creatorName.trim() || 'Content Creator',
        );
        this.initManagerGuestReviewExpansion();
        this.cdr.detectChanges();
      });
  }

  private initManagerGuestReviewExpansion(): void {
    if (!this.isManagerReview) {
      return;
    }

    const flagged = this.managerGuestReviews.find((t) => isConcerningCreatorReply(t));
    this.expandedGuestReviewId = flagged?.id ?? this.managerGuestReviews[0]?.id ?? null;
  }

  private normalizeOptionalId(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeOptionalNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private resolveCreatorDisplayName(o: ObjectDto): string {
    const apiName = o.createdByFullName?.trim();
    if (apiName) {
      return apiName;
    }

    const uid = this.normalizeOptionalId(o.createdByUserId);
    const me = this.authService.getCurrentUser();
    if (uid != null && me?.id != null && Number(me.id) === uid) {
      return `${me.firstName} ${me.lastName}`.trim();
    }
    return '';
  }

  private initialsFromFullName(fullName: string): string {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private formatCreatedUpdatedLine(createdIso?: string, updatedIso?: string): string {
    const created = createdIso ? this.formatSidebarMonthYear(createdIso) : '';
    const updated = updatedIso ? this.formatSidebarMonthYear(updatedIso) : '';
    if (created && updated && created !== updated) {
      return `${created}, edited ${updated}`;
    }
    if (created) {
      return created;
    }
    if (updated) {
      return `Updated ${updated}`;
    }
    return '';
  }

  private formatSidebarMonthYear(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) {
        return '';
      }
      return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(d);
    } catch {
      return '';
    }
  }

  isConcerningGuestReply(thread: ManagerObjectReviewThread): boolean {
    return isConcerningCreatorReply(thread);
  }

  toggleGuestReviewExpand(id: number): void {
    this.expandedGuestReviewId = this.expandedGuestReviewId === id ? null : id;
  }

  isGuestReviewExpanded(id: number): boolean {
    return this.expandedGuestReviewId === id;
  }

  formatGuestReviewDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  guestRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  reportCreatorQuery(thread: ManagerObjectReviewThread): Record<string, string> {
    return { creatorId: String(thread.creatorId) };
  }

  ratingStarsVisual(rating: number | null): string {
    if (rating == null || !Number.isFinite(rating)) {
      return '☆☆☆☆☆';
    }
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating))));
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  }

  ratingAverageDisplay(rating: number | null): string {
    if (rating == null || !Number.isFinite(rating)) {
      return '—';
    }
    return Number(rating).toFixed(1);
  }

  private applyLocationFromSelection(): void {
    const selectedLocalityId = this.form.controls.localityId.value;
    const selectedDestinationId = this.form.controls.destinationId.value;

    const selectedLocality = selectedLocalityId
      ? this.localities.find((locality) => locality.id === selectedLocalityId)
      : undefined;
    const localityLat = this.toNumber(selectedLocality?.latitude);
    const localityLng = this.toNumber(selectedLocality?.longitude);
    if (localityLat != null && localityLng != null) {
      this.form.patchValue(
        {
          latitude: localityLat,
          longitude: localityLng
        },
        { emitEvent: false }
      );
      return;
    }

    const selectedDestination = selectedDestinationId
      ? this.destinations.find((destination) => destination.id === selectedDestinationId)
      : undefined;
    const destinationLat = this.toNumber(selectedDestination?.latitude);
    const destinationLng = this.toNumber(selectedDestination?.longitude);
    if (destinationLat != null && destinationLng != null) {
      this.form.patchValue(
        {
          latitude: destinationLat,
          longitude: destinationLng
        },
        { emitEvent: false }
      );
    }
  }

  private buildWorkingHoursPayload(): string | undefined {
    const result: Partial<Record<WorkingDayKey, string>> = {};
    for (const day of this.workingDays) {
      const open = this.workingHoursForm.controls[`${day.key}Open`].value.trim();
      const close = this.workingHoursForm.controls[`${day.key}Close`].value.trim();
      if (open && close) {
        result[day.key] = `${open}-${close}`;
      }
    }

    return Object.keys(result).length > 0 ? JSON.stringify(result) : undefined;
  }

  private parseAmenities(raw: string): string[] | undefined {
    const amenities = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return amenities.length > 0 ? amenities : undefined;
  }

  private optionalTrimmed(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private applyManagerReadOnlyState(): void {
    if (!this.isManagerReview) {
      return;
    }

    this.form.disable({ emitEvent: false });
    this.workingHoursForm.disable({ emitEvent: false });
  }

  private patchWorkingHours(workingHours?: string): void {
    const resetValues = {
      ponOpen: '', ponClose: '',
      utoOpen: '', utoClose: '',
      sreOpen: '', sreClose: '',
      cetOpen: '', cetClose: '',
      petOpen: '', petClose: '',
      subOpen: '', subClose: '',
      nedOpen: '', nedClose: ''
    };
    this.workingHoursForm.patchValue(resetValues, { emitEvent: false });

    if (!workingHours?.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(workingHours) as Record<string, string>;
      for (const day of this.workingDays) {
        const value = parsed[day.key];
        if (!value || !value.includes('-')) {
          continue;
        }

        const [open, close] = value.split('-');
        if (!open || !close) {
          continue;
        }

        this.workingHoursForm.patchValue({
          [`${day.key}Open`]: open.trim(),
          [`${day.key}Close`]: close.trim()
        }, { emitEvent: false });
      }
    } catch {
      // ignore malformed working hours payload
    }
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
