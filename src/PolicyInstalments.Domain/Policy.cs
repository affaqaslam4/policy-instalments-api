namespace PolicyInstalments.Domain;

/// <summary>
/// An insurance policy whose premium is collected in instalments.
/// The aggregate root: instalments are only changed through the policy, so its rules always hold.
/// </summary>
public sealed class Policy
{
    private readonly List<Instalment> _instalments;

    private Policy(Guid id, string policyNumber, string insuredName, string currency, decimal totalPremium,
        DateOnly inceptionDate, PaymentFrequency frequency, List<Instalment> instalments)
    {
        Id = id;
        PolicyNumber = policyNumber;
        InsuredName = insuredName;
        Currency = currency;
        TotalPremium = totalPremium;
        InceptionDate = inceptionDate;
        Frequency = frequency;
        _instalments = instalments;
    }

    public Guid Id { get; }
    public string PolicyNumber { get; }
    public string InsuredName { get; }
    public string Currency { get; }
    public decimal TotalPremium { get; }
    public DateOnly InceptionDate { get; }
    public PaymentFrequency Frequency { get; }
    public IReadOnlyList<Instalment> Instalments => _instalments;

    public decimal AmountPaid => _instalments.Where(i => i.Status == InstalmentStatus.Paid).Sum(i => i.Amount);
    public decimal Outstanding => TotalPremium - AmountPaid;

    public static Policy Create(string policyNumber, string insuredName, string currency, decimal totalPremium,
        DateOnly inceptionDate, PaymentFrequency frequency, int numberOfInstalments)
    {
        if (string.IsNullOrWhiteSpace(policyNumber))
            throw new DomainException("Policy number is required.");
        if (string.IsNullOrWhiteSpace(insuredName))
            throw new DomainException("Insured name is required.");
        if (currency is null || currency.Length != 3 || !currency.All(char.IsLetter))
            throw new DomainException("Currency must be a 3-letter ISO 4217 code.");

        var schedule = InstalmentSchedule.Build(totalPremium, inceptionDate, frequency, numberOfInstalments);

        return new Policy(Guid.NewGuid(), policyNumber.Trim(), insuredName.Trim(), currency.ToUpperInvariant(),
            decimal.Round(totalPremium, 2, MidpointRounding.ToEven), inceptionDate, frequency, schedule.ToList());
    }

    /// <summary>Rebuilds a policy from storage without re-running creation rules.</summary>
    public static Policy Restore(Guid id, string policyNumber, string insuredName, string currency,
        decimal totalPremium, DateOnly inceptionDate, PaymentFrequency frequency, IEnumerable<Instalment> instalments)
        => new(id, policyNumber, insuredName, currency, totalPremium, inceptionDate, frequency, instalments.ToList());

    public Instalment PayInstalment(int number, decimal amount, DateOnly paidOn)
    {
        var instalment = _instalments.SingleOrDefault(i => i.Number == number)
            ?? throw new DomainException($"Instalment {number} does not exist on policy {PolicyNumber}.");

        var earlierUnpaid = _instalments.Any(i => i.Number < number && i.Status == InstalmentStatus.Pending);
        if (earlierUnpaid)
            throw new DomainException("Instalments must be paid in order; an earlier instalment is still pending.");

        instalment.MarkPaid(amount, paidOn);
        return instalment;
    }

    public IEnumerable<Instalment> OverdueOn(DateOnly date) =>
        _instalments.Where(i => i.Status == InstalmentStatus.Pending && i.DueDate < date);
}
