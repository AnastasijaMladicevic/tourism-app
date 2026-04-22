FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY TuristickiVodic.API/TuristickiVodic.API.csproj TuristickiVodic.API/
COPY TuristickiVodic.Core/TuristickiVodic.Core.csproj TuristickiVodic.Core/
COPY TuristickiVodic.Infrastructure/TuristickiVodic.Infrastructure.csproj TuristickiVodic.Infrastructure/
COPY TuristickiVodic.Services/TuristickiVodic.Services.csproj TuristickiVodic.Services/

RUN dotnet restore TuristickiVodic.API/TuristickiVodic.API.csproj

COPY . .
WORKDIR /src/TuristickiVodic.API
RUN dotnet publish TuristickiVodic.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "TuristickiVodic.API.dll"]
