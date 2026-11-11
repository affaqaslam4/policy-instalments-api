using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.MongoDb;

namespace PolicyInstalments.Api.IntegrationTests;

/// <summary>Starts a real MongoDB in Docker and points the API at it. Shared by all tests in the collection.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MongoDbContainer _mongo = new MongoDbBuilder().WithImage("mongo:8.0").Build();

    public Task InitializeAsync() => _mongo.StartAsync();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Mongo", _mongo.GetConnectionString());
        builder.UseSetting("Mongo:Database", $"tests_{Guid.NewGuid():N}");
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _mongo.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
