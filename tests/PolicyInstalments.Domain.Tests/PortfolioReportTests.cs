using PolicyInstalments.Domain;

namespace PolicyInstalments.Domain.Tests;

public class PortfolioReportTests
{
    private static readonly DateOnly AsOf = new(2026, 4, 15);

    private static Policy Usd(string number, decimal premium = 1200m) =>
        Policy.Create(number, "Acme", "USD", premium, new DateOnly(2026, 1, 1), PaymentFrequency.Monthly, 12);

    [Fact]
    public void Totals_are_grouped_by_currency_and_never_mixed()
    {
        var usd = Usd("P1");
        usd.PayInstalment(1, 100m, new DateOnly(2026, 1, 1));
        var eur = Policy.Create("P2", "Beta", "EUR", 400m, new DateOnly(2026, 1, 1), PaymentFrequency.Quarterly, 4);

        var report = PortfolioReport.Build([usd, eur], AsOf);

        var usdLine = report.ByCurrency.Single(c => c.Currency == "USD");
        Assert.Equal(1, usdLine.Policies);
        Assert.Equal(1200m, usdLine.TotalPremium);
        Assert.Equal(100m, usdLine.Collected);
        Assert.Equal(1100m, usdLine.Outstanding);

        var eurLine = report.ByCurrency.Single(c => c.Currency == "EUR");
        Assert.Equal(400m, eurLine.Outstanding);
    }

    [Fact]
    public void Overdue_counts_unpaid_instalments_due_before_the_report_date()
    {
        var policy = Usd("P1");
        policy.PayInstalment(1, 100m, new DateOnly(2026, 1, 1));

        var report = PortfolioReport.Build([policy], AsOf);

        // Feb 1, Mar 1 and Apr 1 are unpaid and before Apr 15.
        var line = report.ByCurrency.Single();
        Assert.Equal(3, line.OverdueCount);
        Assert.Equal(300m, line.OverdueAmount);
        Assert.Equal([2, 3, 4], report.Overdue.Select(o => o.InstalmentNumber));
        Assert.Equal(73, report.Overdue[0].DaysOverdue); // Feb 1 → Apr 15
    }

    [Fact]
    public void Upcoming_collections_are_bucketed_by_month_for_the_next_six_months()
    {
        var report = PortfolioReport.Build([Usd("P1")], AsOf);

        // Pending instalments from next month: May 1 … Dec 1, 2026, but only six months are shown (May–Oct).
        Assert.Equal(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"],
            report.Upcoming.Select(u => u.Month));
        Assert.All(report.Upcoming, u => Assert.Equal(100m, u.Amount));
    }

    [Fact]
    public void Paid_instalments_are_not_counted_as_upcoming()
    {
        var policy = Usd("P1");
        for (var i = 1; i <= 5; i++) policy.PayInstalment(i, 100m, new DateOnly(2026, 1, 1));

        var report = PortfolioReport.Build([policy], AsOf);

        Assert.DoesNotContain(report.Upcoming, u => u.Month == "2026-05");
    }

    [Fact]
    public void An_empty_portfolio_gives_an_empty_report()
    {
        var report = PortfolioReport.Build([], AsOf);

        Assert.Empty(report.ByCurrency);
        Assert.Empty(report.Upcoming);
        Assert.Empty(report.Overdue);
    }
}
