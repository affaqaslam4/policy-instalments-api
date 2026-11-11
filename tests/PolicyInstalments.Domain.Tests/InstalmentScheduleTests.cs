using PolicyInstalments.Domain;

namespace PolicyInstalments.Domain.Tests;

public class InstalmentScheduleTests
{
    private static readonly DateOnly Inception = new(2026, 1, 31);

    [Fact]
    public void Splits_an_even_premium_into_equal_instalments()
    {
        var schedule = InstalmentSchedule.Build(1200m, Inception, PaymentFrequency.Quarterly, 4);

        Assert.Equal(4, schedule.Count);
        Assert.All(schedule, i => Assert.Equal(300m, i.Amount));
    }

    [Fact]
    public void Puts_the_rounding_remainder_on_the_first_instalment_so_the_total_is_exact()
    {
        var schedule = InstalmentSchedule.Build(1000m, Inception, PaymentFrequency.Monthly, 3);

        Assert.Equal([333.34m, 333.33m, 333.33m], schedule.Select(i => i.Amount));
        Assert.Equal(1000m, schedule.Sum(i => i.Amount));
    }

    [Theory]
    [InlineData(PaymentFrequency.Monthly, "2026-02-28")]   // month-end is clamped, not rolled into March
    [InlineData(PaymentFrequency.Quarterly, "2026-04-30")]
    [InlineData(PaymentFrequency.SemiAnnual, "2026-07-31")]
    public void Spaces_due_dates_by_the_payment_frequency(PaymentFrequency frequency, string expectedSecondDue)
    {
        var schedule = InstalmentSchedule.Build(500m, Inception, frequency, 2);

        Assert.Equal(Inception, schedule[0].DueDate);
        Assert.Equal(DateOnly.Parse(expectedSecondDue), schedule[1].DueDate);
    }

    [Fact]
    public void Numbers_instalments_from_one()
    {
        var schedule = InstalmentSchedule.Build(900m, Inception, PaymentFrequency.Monthly, 3);

        Assert.Equal([1, 2, 3], schedule.Select(i => i.Number));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public void Rejects_a_premium_that_is_not_positive(decimal premium)
    {
        Assert.Throws<DomainException>(() =>
            InstalmentSchedule.Build(premium, Inception, PaymentFrequency.Monthly, 1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    public void Rejects_an_instalment_count_outside_one_to_twelve(int count)
    {
        Assert.Throws<DomainException>(() =>
            InstalmentSchedule.Build(1000m, Inception, PaymentFrequency.Monthly, count));
    }

    [Fact]
    public void Rejects_a_premium_too_small_to_split()
    {
        Assert.Throws<DomainException>(() =>
            InstalmentSchedule.Build(0.05m, Inception, PaymentFrequency.Monthly, 12));
    }
}
