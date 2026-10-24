import { context, propagation, trace } from '@opentelemetry/api'
import { randomUUID } from 'node:crypto'
import { emitTelemetryLog } from '../utils/telemetry-logs'

const workspacePath = /\/api\/workspaces\/([0-9a-f-]{36})(?:\/|$)/i

export default defineEventHandler((event) => {
  const tracer = trace.getTracer('situm-explore.server')
  const incomingRequestId = getRequestHeader(event, 'x-request-id')?.trim()
  const requestId = incomingRequestId && /^[\w-]{8,64}$/.test(incomingRequestId) ? incomingRequestId : randomUUID()
  const carrier: Record<string, string> = {}
  const traceparent = getRequestHeader(event, 'traceparent')
  if (traceparent) carrier.traceparent = traceparent
  const extracted = propagation.extract(context.active(), carrier)
  const workspaceId = getRequestURL(event).pathname.match(workspacePath)?.[1]
  const span = tracer.startSpan('http.request', {
    attributes: {
      'http.request.method': event.method,
      'url.path': getRequestURL(event).pathname,
      'app.request_id': requestId,
      ...(workspaceId ? { 'app.workspace_id': workspaceId } : {}),
    },
  }, extracted)
  const spanContext = trace.setSpan(extracted, span)
  const responseCarrier: Record<string, string> = {}
  propagation.inject(spanContext, responseCarrier)
  setResponseHeader(event, 'x-request-id', requestId)
  if (responseCarrier.traceparent) setResponseHeader(event, 'traceparent', responseCarrier.traceparent)
  event.context.telemetry = { span, requestId }

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    const statusCode = event.node.res.statusCode
    span.setAttribute('http.response.status_code', statusCode)
    emitTelemetryLog(statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO', 'http.request', {
      'app.request_id': requestId,
      'http.request.method': event.method,
      'http.response.status_code': statusCode,
      'url.path': getRequestURL(event).pathname,
      ...(workspaceId ? { 'app.workspace_id': workspaceId } : {}),
    })
    span.end()
  }
  event.node.res.once('finish', finish)
  event.node.res.once('close', finish)
})
