namespace PolicyInstalments.Domain;

public sealed class Instalment
{
    public Instalment(int number, DateOnly dueDate, decimal amount,
        InstalmentStatus status = InstalmentStatus.Pending, DateOnly? paidOn = null)
    {
        Number = number;
        DueDate = dueDate;
        Amount = amount;
        Status = status;
        PaidOn = paidOn;
    }

    public int Number { get; }
    public DateOnly DueDate { get; }
    public decimal Amount { get; }
    public InstalmentStatus Status { get; private set; }
    public DateOnly? PaidOn { get; private set; }

    internal void MarkPaid(decimal amount, DateOnly paidOn)
    {
        if (Status == InstalmentStatus.Paid)
            throw new DomainException($"Instalment {Number} is already paid.");
        if (amount != Amount)
            throw new DomainException($"Payment of {amount} does not match the instalment amount of {Amount}.");

        Status = InstalmentStatus.Paid;
        PaidOn = paidOn;
    }
}

public enum InstalmentStatus
{
    Pending,
    Paid,
}

public enum PaymentFrequency
{
    Monthly = 1,
    Quarterly = 3,
    SemiAnnual = 6,
    Annual = 12,
}

public sealed class DomainException(string message) : Exception(message);
