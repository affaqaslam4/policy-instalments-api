namespace PolicyInstalments.Domain;

public interface IPolicyRepository
{
    Task<Policy?> GetAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Policy>> ListAsync(CancellationToken ct = default);
    Task<bool> PolicyNumberExistsAsync(string policyNumber, CancellationToken ct = default);
    Task AddAsync(Policy policy, CancellationToken ct = default);
    Task UpdateAsync(Policy policy, CancellationToken ct = default);
}
