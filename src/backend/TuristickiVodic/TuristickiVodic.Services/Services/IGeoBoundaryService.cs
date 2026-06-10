namespace TuristickiVodic.Services.Services
{
    public interface IGeoBoundaryService
    {
        Task<List<string>> FetchAndStoreBoundariesAsync(CancellationToken cancellationToken = default);
    }
}
