using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using PolicyInstalments.Domain;

namespace PolicyInstalments.Api.Persistence;

/// <summary>
/// Storage shape for a policy. Kept separate from the domain model so that MongoDB concerns
/// (BSON attributes, Decimal128, UTC dates) never leak into the domain.
/// </summary>
internal sealed class PolicyDocument
{
    [BsonId, BsonGuidRepresentation(GuidRepresentation.Standard)]
    public Guid Id { get; set; }

    public string PolicyNumber { get; set; } = "";
    public string InsuredName { get; set; } = "";
    public string Currency { get; set; } = "";

    [BsonRepresentation(BsonType.Decimal128)]
    public decimal TotalPremium { get; set; }

    public DateTime InceptionDate { get; set; }
    public string Frequency { get; set; } = "";
    public List<InstalmentDocument> Instalments { get; set; } = [];

    public static PolicyDocument From(Policy policy) => new()
    {
        Id = policy.Id,
        PolicyNumber = policy.PolicyNumber,
        InsuredName = policy.InsuredName,
        Currency = policy.Currency,
        TotalPremium = policy.TotalPremium,
        InceptionDate = ToUtc(policy.InceptionDate),
        Frequency = policy.Frequency.ToString(),
        Instalments = policy.Instalments.Select(i => new InstalmentDocument
        {
            Number = i.Number,
            DueDate = ToUtc(i.DueDate),
            Amount = i.Amount,
            Status = i.Status.ToString(),
            PaidOn = i.PaidOn is { } paid ? ToUtc(paid) : null,
        }).ToList(),
    };

    public Policy ToDomain() => Policy.Restore(
        Id, PolicyNumber, InsuredName, Currency, TotalPremium, DateOnly.FromDateTime(InceptionDate),
        Enum.Parse<PaymentFrequency>(Frequency),
        Instalments.Select(i => new Instalment(
            i.Number,
            DateOnly.FromDateTime(i.DueDate),
            i.Amount,
            Enum.Parse<InstalmentStatus>(i.Status),
            i.PaidOn is { } paid ? DateOnly.FromDateTime(paid) : null)));

    private static DateTime ToUtc(DateOnly date) => date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
}

internal sealed class InstalmentDocument
{
    public int Number { get; set; }
    public DateTime DueDate { get; set; }

    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Amount { get; set; }

    public string Status { get; set; } = "";
    public DateTime? PaidOn { get; set; }
}
