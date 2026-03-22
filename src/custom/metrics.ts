/**
 * Prometheus metrics definitions for the Across Relayer.
 *
 * Go analogy: This is equivalent to a Go file with `var` blocks declaring
 * prometheus.NewCounterVec(), prometheus.NewHistogramVec(), etc.
 *
 * Usage: import { metrics } from "../custom/metrics";
 *        metrics.fillsSubmitted.inc({ origin_chain: "1", dest_chain: "10", token: "USDC" });
 */
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

// Use a dedicated registry to avoid conflicts with other modules (e.g., CCTP finalizer).
export const registry = new Registry();

// Collect Node.js default metrics (process_cpu_seconds_total, nodejs_heap_size, etc.)
collectDefaultMetrics({ register: registry });

// --- Loop-level metrics ---

export const loopDuration = new Histogram({
  name: "relayer_loop_duration_seconds",
  help: "Duration of each relayer polling loop in seconds",
  buckets: [5, 10, 30, 60, 120, 300],
  registers: [registry],
});

export const loopTotal = new Counter({
  name: "relayer_loop_total",
  help: "Total number of relayer polling loops executed",
  registers: [registry],
});

export const chainSynced = new Gauge({
  name: "relayer_chain_synced",
  help: "Whether a chain is synced (1) or not (0)",
  labelNames: ["chain_id"] as const,
  registers: [registry],
});

// --- Deposit processing metrics ---

export const depositsSeen = new Counter({
  name: "relayer_deposits_seen_total",
  help: "Number of unfilled deposits detected",
  labelNames: ["origin_chain"] as const,
  registers: [registry],
});

export const depositsFiltered = new Counter({
  name: "relayer_deposits_filtered_total",
  help: "Number of deposits filtered out before evaluation",
  labelNames: ["origin_chain", "reason"] as const,
  registers: [registry],
});

export const depositsEvaluated = new Counter({
  name: "relayer_deposits_evaluated_total",
  help: "Number of deposits evaluated with result",
  labelNames: ["dest_chain", "result"] as const,
  registers: [registry],
});

// --- Fill execution metrics ---

export const fillsSubmitted = new Counter({
  name: "relayer_fills_submitted_total",
  help: "Number of fill transactions submitted",
  labelNames: ["origin_chain", "dest_chain", "token"] as const,
  registers: [registry],
});

export const fillsAmountUsd = new Histogram({
  name: "relayer_fills_amount_usd",
  help: "Distribution of fill amounts in USD",
  labelNames: ["origin_chain", "dest_chain"] as const,
  buckets: [10, 100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [registry],
});

export const slowFillsTotal = new Counter({
  name: "relayer_slow_fills_total",
  help: "Number of slow fill requests submitted",
  labelNames: ["origin_chain", "dest_chain"] as const,
  registers: [registry],
});

// --- Profitability metrics ---

export const profitRelayerFeePct = new Histogram({
  name: "relayer_profit_relayer_fee_pct",
  help: "Distribution of realized relayer fee percentages",
  labelNames: ["token"] as const,
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
  registers: [registry],
});

export const profitGasCostUsd = new Histogram({
  name: "relayer_profit_gas_cost_usd",
  help: "Distribution of gas costs in USD per fill",
  labelNames: ["dest_chain"] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 50, 100],
  registers: [registry],
});

export const unprofitableTotal = new Counter({
  name: "relayer_unprofitable_total",
  help: "Number of deposits deemed unprofitable",
  labelNames: ["origin_chain", "dest_chain"] as const,
  registers: [registry],
});

// --- Transaction metrics ---

export const txSubmitted = new Counter({
  name: "relayer_tx_submitted_total",
  help: "Number of transactions submitted",
  labelNames: ["chain_id", "status"] as const,
  registers: [registry],
});

export const txGasUsed = new Histogram({
  name: "relayer_tx_gas_used",
  help: "Gas used per transaction",
  labelNames: ["chain_id"] as const,
  buckets: [50000, 100000, 200000, 500000, 1000000, 2000000, 5000000],
  registers: [registry],
});

// --- Inventory metrics ---

export const balanceToken = new Gauge({
  name: "relayer_balance_token",
  help: "Token balance per chain",
  labelNames: ["chain_id", "token"] as const,
  registers: [registry],
});

export const shortfallTotal = new Counter({
  name: "relayer_shortfall_total",
  help: "Number of token shortfall events",
  labelNames: ["chain_id", "token"] as const,
  registers: [registry],
});

// --- Health state (updated by MetricsServer) ---

export const loopLastCompletedAt = new Gauge({
  name: "relayer_loop_last_completed_at",
  help: "Unix timestamp of the last completed loop",
  registers: [registry],
});

/**
 * Grouped export for convenience.
 */
export const metrics = {
  // Loop
  loopDuration,
  loopTotal,
  chainSynced,
  loopLastCompletedAt,
  // Deposits
  depositsSeen,
  depositsFiltered,
  depositsEvaluated,
  // Fills
  fillsSubmitted,
  fillsAmountUsd,
  slowFillsTotal,
  // Profitability
  profitRelayerFeePct,
  profitGasCostUsd,
  unprofitableTotal,
  // Transactions
  txSubmitted,
  txGasUsed,
  // Inventory
  balanceToken,
  shortfallTotal,
};
