using MongoDB.Driver;
using PolicyInstalments.Api.GraphQL;
using PolicyInstalments.Api.Persistence;
using PolicyInstalments.Domain;

var builder = WebApplication.CreateBuilder(args);

var mongoConnection = builder.Configuration.GetConnectionString("Mongo")
    ?? throw new InvalidOperationException("Connection string 'Mongo' is not configured.");
var databaseName = builder.Configuration["Mongo:Database"] ?? "policy_instalments";

builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnection));
builder.Services.AddSingleton(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(databaseName));
builder.Services.AddSingleton<IPolicyRepository, MongoPolicyRepository>();

builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddType<PolicyType>()
    .AddMutationConventions(applyToAllMutations: true)
    .AddErrorFilter<DomainErrorFilter>();

builder.Services.AddHealthChecks();

var app = builder.Build();

await MongoPolicyRepository.EnsureIndexesAsync(app.Services.GetRequiredService<IMongoDatabase>());

app.MapGraphQL();
app.MapHealthChecks("/health");

app.Run();

public partial class Program;
