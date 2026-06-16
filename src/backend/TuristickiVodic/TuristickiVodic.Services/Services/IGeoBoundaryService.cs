namespace TuristickiVodic.Services.Services
{
    public interface IGeoBoundaryService
    {
        Task<List<string>> FetchAndStoreBoundariesAsync(CancellationToken cancellationToken = default);
        Task<List<string>> FetchAndStoreBoundariesAsync(ISet<string>? destinationNames, CancellationToken cancellationToken = default);
    }
}
