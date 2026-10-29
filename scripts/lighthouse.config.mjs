export const profiles = {
  mobile: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
  },
  desktop: {
    formFactor: "desktop",
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
  },
};
export const pages = { inicio: "/", detalhe: "/nft/nft-1" };
export const common = {
  onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  output: ["html", "json"],
  throttlingMethod: "simulate",
  maxWaitForLoad: 45000,
  logLevel: "error",
};
