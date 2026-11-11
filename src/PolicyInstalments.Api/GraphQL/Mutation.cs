using PolicyInstalments.Domain;

namespace PolicyInstalments.Api.GraphQL;

public sealed record CreatePolicyInput(
    string PolicyNumber,
    string InsuredName,
    string Currency,
    decimal TotalPremium,
    DateOnly InceptionDate,
    PaymentFrequency Frequency,
    int NumberOfInstalments);

public sealed record PayInstalmentInput(Guid PolicyId, int InstalmentNumber, decimal Amount, DateOnly PaidOn);

public sealed class Mutation
{
    public async Task<Policy> CreatePolicy(CreatePolicyInput input, [Service] IPolicyRepository policies,
        CancellationToken ct)
    {
        if (await policies.PolicyNumberExistsAsync(input.PolicyNumber.Trim(), ct))
            throw new DomainException($"Policy number {input.PolicyNumber} already exists.");

        var policy = Policy.Create(input.PolicyNumber, input.InsuredName, input.Currency, input.TotalPremium,
            input.InceptionDate, input.Frequency, input.NumberOfInstalments);

        await policies.AddAsync(policy, ct);
        return policy;
    }

    public async Task<Policy> PayInstalment(PayInstalmentInput input, [Service] IPolicyRepository policies,
        CancellationToken ct)
    {
        var policy = await policies.GetAsync(input.PolicyId, ct)
            ?? throw new DomainException($"Policy {input.PolicyId} was not found.");

        policy.PayInstalment(input.InstalmentNumber, input.Amount, input.PaidOn);
        await policies.UpdateAsync(policy, ct);
        return policy;
    }
}
