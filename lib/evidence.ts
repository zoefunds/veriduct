export function parseObservationTime(value: string): number | null {
  const observedAt = Number(value);
  return Number.isSafeInteger(observedAt) && observedAt > 0 ? observedAt : null;
}

export function providerEvidence(observedAt: number) {
  return {
    service: "VERIDUCT Demo Payments API",
    publisher: "provider-operations",
    observed_at: observedAt,
    window_minutes: 30,
    availability_percent: 91.4,
    p95_latency_ms: 4820,
    error_rate_percent: 8.6,
    status: "major_outage",
    regions_affected: ["lagos-edge", "accra-edge"],
    maintenance_scheduled: false,
  };
}

export function monitorEvidence(observedAt: number) {
  return {
    service: "VERIDUCT Demo Payments API",
    publisher: "independent-observer",
    observed_at: observedAt,
    window_minutes: 30,
    successful_checks: 274,
    total_checks: 300,
    availability_percent: 91.33,
    median_latency_ms: 3910,
    status: "degraded",
    finding: "Sustained availability below 95 percent across two independent regions.",
  };
}
