using PolicyInstalments.Domain;

namespace PolicyInstalments.Api.GraphQL;

/// <summary>Keeps state-changing domain methods out of the read-only Policy type.</summary>
public sealed class PolicyType : ObjectType<Policy>
{
    protected override void Configure(IObjectTypeDescriptor<Policy> descriptor)
    {
        descriptor.Ignore(p => p.PayInstalment(default, default, default));
        descriptor.Field(p => p.OverdueOn(default)).Name("overdueInstalments");
    }
}

/// <summary>Returns domain rule violations to the client as readable errors instead of "Unexpected Execution Error".</summary>
public sealed class DomainErrorFilter : IErrorFilter
{
    public IError OnError(IError error) =>
        error.Exception is DomainException ex
            ? error.WithMessage(ex.Message).WithCode("DOMAIN_RULE_VIOLATION").WithException(null)
            : error;
}
