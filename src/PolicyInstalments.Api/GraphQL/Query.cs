using PolicyInstalments.Domain;

namespace PolicyInstalments.Api.GraphQL;

public sealed class Query
{
    public Task<IReadOnlyList<Policy>> GetPolicies([Service] IPolicyRepository policies, CancellationToken ct) =>
        policies.ListAsync(ct);

    public Task<Policy?> GetPolicyById(Guid id, [Service] IPolicyRepository policies, CancellationToken ct) =>
        policies.GetAsync(id, ct);

    /// <summary>Dashboard figures as of a date (today when omitted).</summary>
    public async Task<PortfolioReport> GetPortfolioReport(DateOnly? asOf, [Service] IPolicyRepository policies,
        [Service] TimeProvider clock, CancellationToken ct)
    {
        var date = asOf ?? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        return PortfolioReport.Build(await policies.ListAsync(ct), date);
    }
}
