export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { resourceFromAttributes } = await import("@opentelemetry/resources");
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = await import(
      "@opentelemetry/semantic-conventions"
    );
    const { SimpleSpanProcessor, ConsoleSpanExporter } = await import(
      "@opentelemetry/sdk-trace-node"
    );

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "ef-app",
        [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || "0.0.0",
      }),
      spanProcessor:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? undefined
          : process.env.NODE_ENV !== "production"
          ? new SimpleSpanProcessor(new ConsoleSpanExporter())
          : undefined,
    });

    sdk.start();

    process.on("SIGTERM", () => {
      sdk.shutdown().catch(console.error);
    });
  }
}
