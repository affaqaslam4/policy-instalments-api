namespace PolicyInstalments.Domain;

/// <summary>
/// Splits a premium into instalments. Every instalment gets the premium divided evenly and rounded down to the
/// cent; the remainder goes on the first instalment, so the schedule always adds up to the exact premium.
/// </summary>
public static class InstalmentSchedule
{
    public const int MaxInstalments = 12;

    public static IReadOnlyList<Instalment> Build(decimal totalPremium, DateOnly firstDueDate,
        PaymentFrequency frequency, int numberOfInstalments)
    {
        if (totalPremium <= 0)
            throw new DomainException("Total premium must be greater than zero.");
        if (numberOfInstalments is < 1 or > MaxInstalments)
            throw new DomainException($"Number of instalments must be between 1 and {MaxInstalments}.");
        if (!Enum.IsDefined(frequency))
            throw new DomainException($"Unknown payment frequency '{frequency}'.");

        var premium = decimal.Round(totalPremium, 2, MidpointRounding.ToEven);
        var regular = Math.Floor(premium / numberOfInstalments * 100m) / 100m;
        if (regular == 0)
            throw new DomainException("Premium is too small to split into that many instalments.");

        var first = premium - regular * (numberOfInstalments - 1);
        var monthsBetween = (int)frequency;

        return Enumerable.Range(0, numberOfInstalments)
            .Select(i => new Instalment(
                number: i + 1,
                dueDate: firstDueDate.AddMonths(i * monthsBetween),
                amount: i == 0 ? first : regular))
            .ToList();
    }
}
