export const evidenceProvenance = {
  classification: "INDEPENDENT_AUTHORITATIVE_RECORDS",
  measurement_independence: true,
  publisher_identity_independence: null,
  hosting_independence: true,
  event: {
    name: "M8.8 2025 Kamchatka Peninsula earthquake",
    usgs_event_id: "us6000qw60",
    emsc_source_id: "1838723",
    usgs_origin_time: "2025-07-29T23:24:52Z",
    emsc_origin_time: "2025-07-29T23:24:51.44Z",
  },
  collection_method: "Validators independently fetch exact event records from the separately operated USGS and EMSC public authority endpoints",
  authentication_guarantee: "Each snapshot binds the authority registry entry, HTTPS host and path scope, exact URL, source class, event time, and SHA-256 response digest",
  accuracy_claim: "VERIDUCT does not originate either measurement. It proves exact retrieval and requires material cross-authority agreement; the scientific catalogs remain responsible for their measurements",
  sources: {
    usgs: {
      operator: "United States Geological Survey",
      class: "GOVERNMENT",
      host: "earthquake.usgs.gov",
      provenance: "https://www.usgs.gov/programs/earthquake-hazards",
      event: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000qw60/executive",
    },
    emsc: {
      operator: "Euro-Mediterranean Seismological Centre",
      class: "INTERGOVERNMENTAL",
      host: "www.seismicportal.eu",
      provenance: "https://www.emsc-csem.org/",
      mapping: "https://www.seismicportal.eu/eventid/",
    },
  },
} as const;
