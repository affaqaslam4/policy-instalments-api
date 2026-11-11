using System.Net.Http.Json;
using System.Text.Json;

namespace PolicyInstalments.Api.IntegrationTests;

[Collection(ApiCollection.Name)]
public class PolicyGraphQLTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    private const string CreatePolicy = """
        mutation Create($input: CreatePolicyInput!) {
          createPolicy(input: $input) {
            policy { id policyNumber currency totalPremium outstanding instalments { number dueDate amount status } }
          }
        }
        """;

    private const string PayInstalment = """
        mutation Pay($input: PayInstalmentInput!) {
          payInstalment(input: $input) {
            policy { amountPaid outstanding instalments { number status paidOn } }
          }
        }
        """;

    [Fact]
    public async Task Creates_a_policy_and_reads_it_back_from_MongoDB()
    {
        var number = UniqueNumber();
        var created = await Send(CreatePolicy, new { input = NewPolicy(number) });

        var policy = created.GetProperty("data").GetProperty("createPolicy").GetProperty("policy");
        Assert.Equal("GBP", policy.GetProperty("currency").GetString());
        Assert.Equal(4, policy.GetProperty("instalments").GetArrayLength());

        var id = policy.GetProperty("id").GetString();
        var read = await Send("query($id: UUID!) { policyById(id: $id) { policyNumber outstanding } }", new { id });

        var stored = read.GetProperty("data").GetProperty("policyById");
        Assert.Equal(number, stored.GetProperty("policyNumber").GetString());
        Assert.Equal(1000m, stored.GetProperty("outstanding").GetDecimal());
    }

    [Fact]
    public async Task Paying_an_instalment_is_persisted()
    {
        var id = await CreateAndGetId();

        await Send(PayInstalment, new { input = new { policyId = id, instalmentNumber = 1, amount = 250m, paidOn = "2026-01-02" } });
        var read = await Send(
            "query($id: UUID!) { policyById(id: $id) { amountPaid instalments { number status paidOn } } }",
            new { id });

        var policy = read.GetProperty("data").GetProperty("policyById");
        Assert.Equal(250m, policy.GetProperty("amountPaid").GetDecimal());
        var first = policy.GetProperty("instalments")[0];
        Assert.Equal("PAID", first.GetProperty("status").GetString());
        Assert.Equal("2026-01-02", first.GetProperty("paidOn").GetString());
    }

    [Fact]
    public async Task Rule_violations_come_back_as_readable_GraphQL_errors()
    {
        var id = await CreateAndGetId();

        var result = await Send(PayInstalment,
            new { input = new { policyId = id, instalmentNumber = 2, amount = 250m, paidOn = "2026-01-02" } });

        var error = result.GetProperty("errors")[0];
        Assert.Contains("in order", error.GetProperty("message").GetString());
        Assert.Equal("DOMAIN_RULE_VIOLATION", error.GetProperty("extensions").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Duplicate_policy_numbers_are_rejected()
    {
        var number = UniqueNumber();
        await Send(CreatePolicy, new { input = NewPolicy(number) });

        var second = await Send(CreatePolicy, new { input = NewPolicy(number) });

        Assert.Contains("already exists", second.GetProperty("errors")[0].GetProperty("message").GetString());
    }

    [Fact]
    public async Task Portfolio_report_includes_overdue_instalments_as_of_a_date()
    {
        var number = UniqueNumber();
        await Send(CreatePolicy, new { input = NewPolicy(number) }); // GBP 1,000 quarterly from 2026-01-01

        var result = await Send("""
            query($asOf: LocalDate) {
              portfolioReport(asOf: $asOf) {
                asOf
                byCurrency { currency overdueCount }
                overdue { policyNumber instalmentNumber daysOverdue }
              }
            }
            """, new { asOf = "2026-05-01" });

        var report = result.GetProperty("data").GetProperty("portfolioReport");
        Assert.Equal("2026-05-01", report.GetProperty("asOf").GetString());
        var mine = report.GetProperty("overdue").EnumerateArray()
            .Where(o => o.GetProperty("policyNumber").GetString() == number)
            .Select(o => o.GetProperty("instalmentNumber").GetInt32());
        Assert.Equal([1, 2], mine); // due Jan 1 and Apr 1; Jul 1 is not due yet
    }

    private async Task<string> CreateAndGetId()
    {
        var created = await Send(CreatePolicy, new { input = NewPolicy(UniqueNumber()) });
        return created.GetProperty("data").GetProperty("createPolicy").GetProperty("policy")
            .GetProperty("id").GetString()!;
    }

    private static object NewPolicy(string number) => new
    {
        policyNumber = number,
        insuredName = "Northwind Shipping",
        currency = "gbp",
        totalPremium = 1000m,
        inceptionDate = "2026-01-01",
        frequency = "QUARTERLY",
        numberOfInstalments = 4,
    };

    private static string UniqueNumber() => $"POL-{Guid.NewGuid():N}"[..12];

    private async Task<JsonElement> Send(string query, object variables)
    {
        var response = await _client.PostAsJsonAsync("/graphql", new { query, variables });
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
