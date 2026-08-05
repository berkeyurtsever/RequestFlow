FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/RequestFlow.Api/RequestFlow.Api.csproj backend/RequestFlow.Api/
RUN dotnet restore backend/RequestFlow.Api/RequestFlow.Api.csproj

COPY backend/RequestFlow.Api/ backend/RequestFlow.Api/
WORKDIR /src/backend/RequestFlow.Api
RUN dotnet publish --configuration Release --no-restore --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
RUN mkdir -p /data /app/Uploads && chown -R "$APP_UID:$APP_UID" /data /app/Uploads
USER $APP_UID

ENTRYPOINT ["dotnet", "RequestFlow.Api.dll"]
