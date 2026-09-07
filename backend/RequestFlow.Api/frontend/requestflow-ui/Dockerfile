FROM node:22-alpine AS build
WORKDIR /app

COPY backend/RequestFlow.Api/frontend/requestflow-ui/package.json ./
COPY backend/RequestFlow.Api/frontend/requestflow-ui/package-lock.json ./
RUN npm ci

COPY backend/RequestFlow.Api/frontend/requestflow-ui/ ./
ARG VITE_API_BASE_URL=/api
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_ENVIRONMENT=production
ARG VITE_SENTRY_TRACES_SAMPLE_RATE=0
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ENV VITE_SENTRY_TRACES_SAMPLE_RATE=$VITE_SENTRY_TRACES_SAMPLE_RATE
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY backend/RequestFlow.Api/frontend/requestflow-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
