using MongoDB.Driver;
using PolicyInstalments.Domain;

namespace PolicyInstalments.Api.Persistence;

internal sealed class MongoPolicyRepository(IMongoDatabase database) : IPolicyRepository
{
    public const string CollectionName = "policies";

    private readonly IMongoCollection<PolicyDocument> _policies =
        database.GetCollection<PolicyDocument>(CollectionName);

    public async Task<Policy?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var doc = await _policies.Find(p => p.Id == id).FirstOrDefaultAsync(ct);
        return doc?.ToDomain();
    }

    public async Task<IReadOnlyList<Policy>> ListAsync(CancellationToken ct = default)
    {
        var docs = await _policies.Find(FilterDefinition<PolicyDocument>.Empty)
            .SortBy(p => p.PolicyNumber)
            .ToListAsync(ct);
        return docs.Select(d => d.ToDomain()).ToList();
    }

    public Task<bool> PolicyNumberExistsAsync(string policyNumber, CancellationToken ct = default) =>
        _policies.Find(p => p.PolicyNumber == policyNumber).AnyAsync(ct);

    public async Task AddAsync(Policy policy, CancellationToken ct = default)
    {
        try
        {
            await _policies.InsertOneAsync(PolicyDocument.From(policy), cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            // The unique index is the real guard; the pre-check in the mutation only gives a nicer message.
            throw new DomainException($"Policy number {policy.PolicyNumber} already exists.");
        }
    }

    public Task UpdateAsync(Policy policy, CancellationToken ct = default) =>
        _policies.ReplaceOneAsync(p => p.Id == policy.Id, PolicyDocument.From(policy), cancellationToken: ct);

    public static async Task EnsureIndexesAsync(IMongoDatabase database, CancellationToken ct = default)
    {
        var policies = database.GetCollection<PolicyDocument>(CollectionName);
        var uniqueNumber = new CreateIndexModel<PolicyDocument>(
            Builders<PolicyDocument>.IndexKeys.Ascending(p => p.PolicyNumber),
            new CreateIndexOptions { Unique = true, Name = "ux_policy_number" });
        await policies.Indexes.CreateOneAsync(uniqueNumber, cancellationToken: ct);
    }
}
