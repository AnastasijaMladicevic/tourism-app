const productionHost =
  typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : 'softeng.pmf.kg.ac.rs';

const productionProtocol =
  typeof window !== 'undefined' && window.location.protocol
    ? window.location.protocol
    : 'https:';

export const environment = {
  production: true,
  apiUrl: `${productionProtocol}//${productionHost}:10201/api`,
};
