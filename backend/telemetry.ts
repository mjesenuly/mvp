import { context, logs, metrics, SeverityNumber, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { RequestHandler } from 'express';

export function startTelemetry() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  const sdk = new NodeSDK({
    serviceName: 'repairlens',
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 10_000,
    })],
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  });
  sdk.start();
  return sdk;
}

export function apiTelemetry(): RequestHandler {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return (_req, _res, next) => next();

  const environment = process.env.DEPLOYMENT_ENVIRONMENT ??
    (process.env.RENDER === 'true' ? 'production' : 'development');
  const meter = metrics.getMeter('repairlens');
  const tracer = trace.getTracer('repairlens');
  const logger = logs.getLogger('repairlens');
  const serverErrors = meter.createCounter('repairlens_api_server_errors', {
    description: 'Completed API responses with HTTP status 5xx',
  });
  const duration = meter.createHistogram('repairlens_api_duration', {
    unit: 's',
    description: 'Time to complete an API response',
  });
  const operations = {
    request: meter.createCounter('repairlens_requests_created'),
    offer: meter.createCounter('repairlens_offers_saved'),
    select: meter.createCounter('repairlens_offers_accepted'),
    complete: meter.createCounter('repairlens_repairs_completed'),
  };
  const routes = new Map([
    ['/api/requests', operations.request],
    ['/api/requests/:id/offers', operations.offer],
    ['/api/requests/:id/select', operations.select],
    ['/api/requests/:id/complete', operations.complete],
  ]);
  const dimensions = { deployment_environment: environment };
  serverErrors.add(0, dimensions);
  for (const counter of Object.values(operations)) counter.add(0, dimensions);

  return (req, res, next) => {
    if (req.path !== '/api' && !req.path.startsWith('/api/')) return next();
    const started = performance.now();
    const method = req.method;
    tracer.startActiveSpan('RepairLens API', { kind: SpanKind.SERVER }, span => {
      res.once('close', () => {
        const status = res.statusCode;
        const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched';
        const attributes = { 'http.request.method': method, 'http.route': route, ...dimensions };
        span.updateName(`${method} ${route}`);
        span.setAttributes(attributes);

        if (res.writableFinished) {
          span.setAttribute('http.response.status_code', status);
          duration.record((performance.now() - started) / 1000, dimensions);
          if (status >= 500) serverErrors.add(1, dimensions);
          if (method === 'POST' && status >= 200 && status < 300) {
            routes.get(route)?.add(1, dimensions);
          }
        }
        const failed = !res.writableFinished || status >= 500;
        if (failed) span.setStatus({ code: SpanStatusCode.ERROR });
        logger.emit({
          context: trace.setSpanContext(context.active(), span.spanContext()),
          severityNumber: failed ? SeverityNumber.ERROR : SeverityNumber.INFO,
          body: res.writableFinished ? 'RepairLens API response' : 'RepairLens API connection closed',
          attributes: {
            ...attributes,
            ...(res.writableFinished ? { 'http.response.status_code': status } : {}),
          },
        });
        span.end();
      });
      next();
    });
  };
}
