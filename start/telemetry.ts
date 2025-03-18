/*
|--------------------------------------------------------------------------
| OpenTelemetry Configuration
|--------------------------------------------------------------------------
|
| Here you can define the configuration for OpenTelemetry. The configuration
| is loaded when the application starts.
|
*/

import env from '#start/env'
import opentelemetry from '@opentelemetry/api'
import otelLogs from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { HostMetrics } from '@opentelemetry/host-metrics'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2'
import { Resource } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

/**
 * Define the OpenTelemetry Resource for the application
 * which contains metadata about the service.
 *
 * Here, service name and version are set from
 * the environment variables.
 */
const resource = new Resource({
  [ATTR_SERVICE_NAME]: env.get('OTEL_APPLICATION_SERVICE_NAME'),
  [ATTR_SERVICE_VERSION]: env.get('OTEL_APPLICATION_SERVICE_VERSION'),
})

/**
 * Create an OpenTelemetry Trace Provider with a Batch Span Processor
 * that exports spans to the OpenTelemetry Collector via OTLP.
 */
export const otelTraceProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
})
otelTraceProvider.register()

/**
 * Create an OpenTelemetry Meter Provider with a Periodic Exporting Metric Reader
 * that exports metrics to the OpenTelemetry Collector via OTLP.
 *
 * Note: Do not use built-in Effect's metrics, as they are not compatible
 *       with current OpenTelemetry implementation and require different
 *       setup of the metrics different from the one used in this project.
 */
export const otelMeterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
    }),
  ],
})

/**
 * Start the Host Metrics collection, which collects metrics about the host
 * and exports them to the OpenTelemetry Collector via OTLP.
 */
const hostMetrics = new HostMetrics({
  meterProvider: otelMeterProvider,
})
hostMetrics.start()

/**
 * Create an OpenTelemetry Logger Provider with a Batch Log Record Processor
 * that exports logs to the OpenTelemetry Collector via OTLP.
 */
export const otelLoggerProvider = new LoggerProvider({ resource })
otelLoggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter()))

/**
 * Register OpenTelemetry Instrumentations for the application.
 *
 * This is where you can enable instrumentations for various libraries
 * and frameworks to automatically collect traces and metrics.
 */
registerInstrumentations({
  instrumentations: [new MySQL2Instrumentation()],
  loggerProvider: otelLoggerProvider,
  tracerProvider: otelTraceProvider,
  meterProvider: otelMeterProvider,
})

/**
 * Set the global OpenTelemetry providers for the application.
 */
opentelemetry.trace.setGlobalTracerProvider(otelTraceProvider)
opentelemetry.metrics.setGlobalMeterProvider(otelMeterProvider)
otelLogs.logs.setGlobalLoggerProvider(otelLoggerProvider)
