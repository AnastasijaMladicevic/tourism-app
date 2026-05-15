namespace TuristickiVodic.Core.Models
{
    public enum NotificationType
    {
        PlannerEventReminder2Hours = 1,
        ReviewReply = 2,
        FavoritedLocationNewEvent = 3,
        PlannerEventUpdated = 4,
        PlannerEventUnavailable = 5,
        ManagerNewPendingContent = 6,
        ManagerNewDeletionRequest = 7,
        CreatorContentReviewed = 8,
        CreatorNewObjectReview = 9,
        CreatorDeletionRequestReviewed = 10,
        AdminNewCreatorRoleRequest = 11,
        AdminNewManagerReport = 12,
        ManagerReportReviewed = 13,
        ReviewReplyUpdated = 14,
        CreatorObjectReviewDeleted = 15,
        AdminRepeatedManagerReports = 16,
        AdminCreatorMultipleRejectedContent = 17,
        CreatorRoleRequestApproved = 18,
        CreatorRoleRequestRejected = 19,
        CreatorRoleAccessRevoked = 20
    }
}
