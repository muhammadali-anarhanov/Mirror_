FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /mirror ./cmd/api

FROM alpine:3.23
RUN apk add --no-cache ca-certificates wget && adduser -D -u 10001 mirror
WORKDIR /app
COPY --from=build /mirror /app/api
USER mirror
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:${PORT:-8080}/healthz || exit 1
ENTRYPOINT ["/app/api"]
