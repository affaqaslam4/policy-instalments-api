using PolicyInstalments.Domain;

namespace PolicyInstalments.Domain.Tests;

public class PolicyTests
{
    private static Policy NewPolicy(int instalments = 3) =>
        Policy.Create("POL-001", "Acme Marine Ltd", "usd", 3000m, new DateOnly(2026, 1, 1),
            PaymentFrequency.Monthly, instalments);

    [Fact]
    public void Create_normalises_currency_and_builds_the_schedule()
    {
        var policy = NewPolicy();

        Assert.Equal("USD", policy.Currency);
        Assert.Equal(3, policy.Instalments.Count);
        Assert.Equal(3000m, policy.Outstanding);
        Assert.Equal(0m, policy.AmountPaid);
    }

    [Theory]
    [InlineData("", "Acme", "USD")]
    [InlineData("POL-1", " ", "USD")]
    [InlineData("POL-1", "Acme", "US")]
    [InlineData("POL-1", "Acme", "U5D")]
    public void Create_rejects_invalid_details(string number, string insured, string currency)
    {
        Assert.Throws<DomainException>(() =>
            Policy.Create(number, insured, currency, 100m, new DateOnly(2026, 1, 1), PaymentFrequency.Annual, 1));
    }

    [Fact]
    public void Paying_an_instalment_marks_it_paid_and_reduces_the_outstanding_balance()
    {
        var policy = NewPolicy();
        var paidOn = new DateOnly(2026, 1, 5);

        var instalment = policy.PayInstalment(1, 1000m, paidOn);

        Assert.Equal(InstalmentStatus.Paid, instalment.Status);
        Assert.Equal(paidOn, instalment.PaidOn);
        Assert.Equal(1000m, policy.AmountPaid);
        Assert.Equal(2000m, policy.Outstanding);
    }

    [Fact]
    public void Cannot_pay_the_same_instalment_twice()
    {
        var policy = NewPolicy();
        policy.PayInstalment(1, 1000m, new DateOnly(2026, 1, 5));

        var ex = Assert.Throws<DomainException>(() => policy.PayInstalment(1, 1000m, new DateOnly(2026, 1, 6)));
        Assert.Contains("already paid", ex.Message);
    }

    [Fact]
    public void Cannot_pay_out_of_order()
    {
        var policy = NewPolicy();

        var ex = Assert.Throws<DomainException>(() => policy.PayInstalment(2, 1000m, new DateOnly(2026, 2, 1)));
        Assert.Contains("in order", ex.Message);
    }

    [Fact]
    public void Payment_amount_must_match_the_instalment()
    {
        var policy = NewPolicy();

        Assert.Throws<DomainException>(() => policy.PayInstalment(1, 999.99m, new DateOnly(2026, 1, 5)));
        Assert.Equal(InstalmentStatus.Pending, policy.Instalments[0].Status);
    }

    [Fact]
    public void Paying_an_unknown_instalment_fails()
    {
        Assert.Throws<DomainException>(() => NewPolicy().PayInstalment(4, 1000m, new DateOnly(2026, 1, 5)));
    }

    [Fact]
    public void Overdue_lists_pending_instalments_due_before_the_date()
    {
        var policy = NewPolicy();
        policy.PayInstalment(1, 1000m, new DateOnly(2026, 1, 1));

        var overdue = policy.OverdueOn(new DateOnly(2026, 3, 2)).Select(i => i.Number);

        Assert.Equal([2, 3], overdue);
    }
}
