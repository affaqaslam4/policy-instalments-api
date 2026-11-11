# syntax=docker/dockerfile:1

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore first, using only the project files, so the restore layer is cached until dependencies change.
COPY src/PolicyInstalments.Domain/PolicyInstalments.Domain.csproj src/PolicyInstalments.Domain/
COPY src/PolicyInstalments.Api/PolicyInstalments.Api.csproj src/PolicyInstalments.Api/
RUN dotnet restore src/PolicyInstalments.Api/PolicyInstalments.Api.csproj

COPY src/ src/
RUN dotnet publish src/PolicyInstalments.Api/PolicyInstalments.Api.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Run as the non-root user that ships with the .NET images.
USER $APP_UID
ENTRYPOINT ["dotnet", "PolicyInstalments.Api.dll"]
