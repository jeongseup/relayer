/**
 * HTTP server exposing /health and /metrics endpoints.
 *
 * Go analogy: This is equivalent to:
 *   http.Handle("/metrics", promhttp.Handler())
 *   http.ListenAndServe(":9090", nil)
 *
 * Usage:
 *   const server = new MetricsServer({ port: 9090, logger, pollingDelay: 60 });
 *   server.start();
 *   // On each loop completion:
 *   server.recordLoopCompleted(chainsSynced, chainsTotal);
 */
import http from "http";
import { registry } from "./metrics";
import { winston } from "../utils";

export interface MetricsServerConfig {
  port: number;
  logger: winston.Logger;
  pollingDelay: number;
}

interface HealthState {
  lastLoopCompletedAt: number; // unix ms
  lastLoopDurationMs: number;
  chainsSynced: number;
  chainsTotal: number;
}

export class MetricsServer {
  private server: http.Server;
  private readonly port: number;
  private readonly logger: winston.Logger;
  private readonly pollingDelay: number;
  private readonly startTime: number;
  private health: HealthState;

  constructor(config: MetricsServerConfig) {
    this.port = config.port;
    this.logger = config.logger;
    this.pollingDelay = config.pollingDelay;
    this.startTime = Date.now();
    this.health = {
      lastLoopCompletedAt: 0,
      lastLoopDurationMs: 0,
      chainsSynced: 0,
      chainsTotal: 0,
    };

    this.server = http.createServer(async (req, res) => {
      if (req.url === "/health") {
        this.handleHealth(res);
      } else if (req.url === "/metrics") {
        await this.handleMetrics(res);
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
  }

  start(): void {
    this.server.listen(this.port, () => {
      this.logger.debug({
        at: "MetricsServer",
        message: `Metrics server listening on :${this.port} (/health, /metrics)`,
      });
    });
  }

  stop(): void {
    this.server.close();
  }

  /**
   * Called at the end of each polling loop to update health state.
   */
  recordLoopCompleted(chainsSynced: number, chainsTotal: number, loopDurationMs: number): void {
    this.health = {
      lastLoopCompletedAt: Date.now(),
      lastLoopDurationMs: loopDurationMs,
      chainsSynced,
      chainsTotal,
    };
  }

  private handleHealth(res: http.ServerResponse): void {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    const loopAgeSeconds = this.health.lastLoopCompletedAt > 0 ? (now - this.health.lastLoopCompletedAt) / 1000 : -1;

    let status: "healthy" | "degraded" | "unhealthy";
    let httpCode: number;

    if (loopAgeSeconds < 0) {
      // No loop completed yet — still initializing
      status = "degraded";
      httpCode = 200;
    } else if (loopAgeSeconds > this.pollingDelay * 3) {
      status = "unhealthy";
      httpCode = 503;
    } else if (this.health.chainsSynced < this.health.chainsTotal) {
      status = "degraded";
      httpCode = 200;
    } else {
      status = "healthy";
      httpCode = 200;
    }

    const body = JSON.stringify({
      status,
      uptime: uptimeSeconds,
      lastLoopCompletedAt:
        this.health.lastLoopCompletedAt > 0 ? new Date(this.health.lastLoopCompletedAt).toISOString() : null,
      lastLoopDurationMs: this.health.lastLoopDurationMs,
      chainsSynced: this.health.chainsSynced,
      chainsTotal: this.health.chainsTotal,
    });

    res.writeHead(httpCode, { "Content-Type": "application/json" });
    res.end(body);
  }

  private async handleMetrics(res: http.ServerResponse): Promise<void> {
    try {
      const metricsOutput = await registry.metrics();
      res.writeHead(200, { "Content-Type": registry.contentType });
      res.end(metricsOutput);
    } catch (err) {
      res.writeHead(500);
      res.end("Error collecting metrics");
    }
  }
}
