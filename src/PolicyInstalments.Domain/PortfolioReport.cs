namespace PolicyInstalments.Domain;

/// <summary>
/// Read model for the reporting dashboard. Amounts are always grouped by currency:
/// adding USD to EUR without an exchange rate would give a meaningless number.
/// </summary>
public sealed record PortfolioReport(
    DateOnly AsOf,
    IReadOnlyList<CurrencySummary> ByCurrency,
    IReadOnlyList<UpcomingCollection> Upcoming,
    IReadOnlyList<OverdueInstalment> Overdue)
{
    public const int UpcomingMonths = 6;

    public static PortfolioReport Build(IEnumerable<Policy> policies, DateOnly asOf)
    {
        var list = policies.ToList();

        var byCurrency = list
            .GroupBy(p => p.Currency)
            .Select(g =>
            {
                var overdue = g.SelectMany(p => p.OverdueOn(asOf)).ToList();
                return new CurrencySummary(
                    g.Key,
                    g.Count(),
                    g.Sum(p => p.TotalPremium),
                    g.Sum(p => p.AmountPaid),
                    g.Sum(p => p.Outstanding),
                    overdue.Count,
                    overdue.Sum(i => i.Amount));
            })
            .OrderBy(c => c.Currency)
            .ToList();

        var windowStart = new DateOnly(asOf.Year, asOf.Month, 1).AddMonths(1);
        var windowEnd = windowStart.AddMonths(UpcomingMonths);
        var upcoming = list
            .SelectMany(p => p.Instalments
                .Where(i => i.Status == InstalmentStatus.Pending && i.DueDate >= windowStart && i.DueDate < windowEnd)
                .Select(i => (p.Currency, Month: i.DueDate.ToString("yyyy-MM"), i.Amount)))
            .GroupBy(x => (x.Month, x.Currency))
            .Select(g => new UpcomingCollection(g.Key.Month, g.Key.Currency, g.Sum(x => x.Amount), g.Count()))
            .OrderBy(u => u.Month).ThenBy(u => u.Currency)
            .ToList();

        var overdueList = list
            .SelectMany(p => p.OverdueOn(asOf).Select(i => new OverdueInstalment(
                p.Id, p.PolicyNumber, p.InsuredName, p.Currency, i.Number, i.DueDate, i.Amount,
                asOf.DayNumber - i.DueDate.DayNumber)))
            .OrderByDescending(o => o.DaysOverdue).ThenBy(o => o.PolicyNumber)
            .ToList();

        return new PortfolioReport(asOf, byCurrency, upcoming, overdueList);
    }
}

public sealed record CurrencySummary(
    string Currency, int Policies, decimal TotalPremium, decimal Collected, decimal Outstanding,
    int OverdueCount, decimal OverdueAmount);

public sealed record UpcomingCollection(string Month, string Currency, decimal Amount, int Instalments);

public sealed record OverdueInstalment(
    Guid PolicyId, string PolicyNumber, string InsuredName, string Currency, int InstalmentNumber,
    DateOnly DueDate, decimal Amount, int DaysOverdue);
