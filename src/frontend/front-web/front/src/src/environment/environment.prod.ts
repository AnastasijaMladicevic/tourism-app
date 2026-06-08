const productionHost =
  typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : 'softeng.pmf.kg.ac.rs';

const apiHost =
  productionHost === '147.91.204.115'
    ? 'softeng.pmf.kg.ac.rs'
    : productionHost;

export const environment = {
  production: true,
  apiUrl: `https://${apiHost}:10203/api`,
};
