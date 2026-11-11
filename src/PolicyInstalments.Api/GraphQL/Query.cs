using PolicyInstalments.Domain;

namespace PolicyInstalments.Api.GraphQL;

public sealed class Query
{
    public Task<IReadOnlyList<Policy>> GetPolicies([Service] IPolicyRepository policies, CancellationToken ct) =>
        policies.ListAsync(ct);

    public Task<Policy?> GetPolicyById(Guid id, [Service] IPolicyRepository policies, CancellationToken ct) =>
        policies.GetAsync(id, ct);
}
