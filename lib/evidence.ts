export function parseObservationTime(value: string): number | null {
  const observedAt = Number(value);
  return Number.isSafeInteger(observedAt) && observedAt > 0 ? observedAt : null;
}

export function providerEvidence(observedAt: number) {
  return {
    service: "VERIDUCT Production Payments API",
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
    service: "VERIDUCT Production Payments API",
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

export const evidenceProvenance = {
  classification: "DEMONSTRATION_FIXTURE",
  measurement_independence: false,
  publisher_identity_independence: true,
  hosting_independence: false,
  operator: "VERIDUCT demonstration application",
  collection_method: "Deterministic synthetic JSON generated from the requested observation timestamp",
  accuracy_claim: "No claim of independently acquired production telemetry or real payments-service measurements",
  authentication_guarantee: "The onchain snapshot and validator fetch authenticate exact response bytes, URL origin, publisher wallet, and freshness; they do not prove measurement accuracy",
  feeds: {
    provider: "/api/evidence/provider/{unix_timestamp}",
    corroborator: "/api/evidence/monitor/{unix_timestamp}",
  },
} as const;
