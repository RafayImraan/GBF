export function buildNarrative() {
  return {
    pillars: [
      "Institutional green bonds broken into $1 FBT units",
      "Guardian-enforced dMRV policy checks before value transfer",
      "Consensus Service Truth Stream for live ecological accountability"
    ],
    workflow: [
      "Issuer submits bond and sustainability methodology",
      "Protocol fractionalizes the asset into HTS-backed retail units",
      "Satellite and IoT data flows into Guardian for validation",
      "Verified events are committed to the HCS Truth Stream",
      "Scheduled yield distribution executes when targets are met"
    ]
  };
}

export function computeProtocolHealth({ bonds, truthEvents, transactions, investors = [], holdings = [] }) {
  const lastTransaction = transactions[0] || null;

  return {
    bondsTracked: bonds.length,
    investorsTracked: investors.length,
    holdingsTracked: holdings.length,
    truthEvents: truthEvents.length,
    transactionsLogged: transactions.length,
    storage: "sqlite",
    lastTransaction
  };
}
