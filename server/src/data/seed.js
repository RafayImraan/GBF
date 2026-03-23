export const protocolOverviewSeed = {
  projectTitle: "Global Green-Bond Fractionalizer",
  ticker: "GBF",
  network: "Hedera Testnet",
  assetLayer: "Hedera Token Service (HTS)",
  trustLayer: "Hedera Guardian",
  auditTrail: "Hedera Consensus Service (HCS)",
  thesis:
    "Democratize access to institutional-grade green bonds through $1 fractional tokens backed by live, tamper-evident impact verification."
};

export const bondSeeds = [
  {
    id: "gbf-wind-2028",
    name: "Sindh Wind Corridor Series A",
    issuer: "AetherGrid Infrastructure",
    category: "Wind Energy",
    faceValue: 10000000,
    tokenPrice: 1,
    couponRate: 6.2,
    maturity: "2028-12-31",
    verifiedImpact: "Onboarding baseline captured",
    impactMetric: "MWh generated",
    progress: 84,
    liquidityScore: 91,
    tokenId: null,
    topicId: null,
    guardianPolicy: "guardian-policy-gbf-wind",
    status: "Onboarded",
    walletHolders: 18422,
    treasuryAccountId: null,
    telemetryUnit: "MWh",
    telemetryBaseValue: 1842.2,
    onboardingTxId: null,
    onboardingMode: "pending"
  },
  {
    id: "gbf-forest-2030",
    name: "Amazon Reforestation Note",
    issuer: "Verdant Earth Trust",
    category: "Reforestation",
    faceValue: 15000000,
    tokenPrice: 1,
    couponRate: 5.4,
    maturity: "2030-06-30",
    verifiedImpact: "Onboarding baseline captured",
    impactMetric: "Trees planted",
    progress: 72,
    liquidityScore: 78,
    tokenId: null,
    topicId: null,
    guardianPolicy: "guardian-policy-gbf-forest",
    status: "Onboarded",
    walletHolders: 26311,
    treasuryAccountId: null,
    telemetryUnit: "trees",
    telemetryBaseValue: 6120,
    onboardingTxId: null,
    onboardingMode: "pending"
  },
  {
    id: "gbf-carbon-2029",
    name: "Blue Delta Carbon Capture Note",
    issuer: "HelioSequestration Labs",
    category: "Carbon Capture",
    faceValue: 17500000,
    tokenPrice: 1,
    couponRate: 7.1,
    maturity: "2029-09-15",
    verifiedImpact: "Onboarding baseline captured",
    impactMetric: "tCO2 captured",
    progress: 93,
    liquidityScore: 87,
    tokenId: null,
    topicId: null,
    guardianPolicy: "guardian-policy-gbf-carbon",
    status: "Onboarded",
    walletHolders: 15108,
    treasuryAccountId: null,
    telemetryUnit: "tCO2",
    telemetryBaseValue: 622.4,
    onboardingTxId: null,
    onboardingMode: "pending"
  }
];

export const investorSeeds = [
  {
    id: "inv-nadia-khan",
    name: "Maaz Khan",
    email: "maaz@invest.gbf",
    walletAlias: "GBF-MAAZ-01",
    accountId: "0.0.910001",
    region: "Pakistan",
    kycStatus: "approved",
    riskTier: "balanced"
  },
  {
    id: "inv-omar-reyes",
    name: "Omar Reyes",
    email: "omar@invest.gbf",
    walletAlias: "GBF-OMAR-02",
    accountId: "0.0.910002",
    region: "UAE",
    kycStatus: "approved",
    riskTier: "income"
  },
  {
    id: "inv-lina-park",
    name: "Lina Park",
    email: "lina@invest.gbf",
    walletAlias: "GBF-LINA-03",
    accountId: "0.0.910003",
    region: "Singapore",
    kycStatus: "approved",
    riskTier: "growth"
  }
];

export const holdingSeeds = [
  {
    id: "hold-wind-nadia",
    bondId: "gbf-wind-2028",
    investorId: "inv-nadia-khan",
    units: 1200,
    costBasis: 1200
  },
  {
    id: "hold-wind-omar",
    bondId: "gbf-wind-2028",
    investorId: "inv-omar-reyes",
    units: 850,
    costBasis: 850
  },
  {
    id: "hold-carbon-lina",
    bondId: "gbf-carbon-2029",
    investorId: "inv-lina-park",
    units: 2100,
    costBasis: 2100
  }
];
