export type PhilippineLocation = {
  name: string;
  region: string;
  coordinates: [number, number];
};

// Lightweight local PSGC-inspired index for the selector. It keeps the first
// interaction instant and can be replaced with a generated PSGC dataset later
// without changing the combobox or filtering APIs.
export const philippineLocations: PhilippineLocation[] = [
  { name: "Cebu City", region: "Central Visayas", coordinates: [123.8854, 10.3157] },
  { name: "Mandaue City", region: "Central Visayas", coordinates: [123.9223, 10.3236] },
  { name: "Lapu-Lapu City", region: "Central Visayas", coordinates: [123.9494, 10.3103] },
  { name: "Talisay City", region: "Central Visayas", coordinates: [123.8494, 10.2447] },
  { name: "Consolacion", region: "Central Visayas", coordinates: [123.9574, 10.3769] },
  { name: "Naga City", region: "Central Visayas", coordinates: [123.758, 10.2089] },
  { name: "Carcar City", region: "Central Visayas", coordinates: [123.6402, 10.1061] },
  { name: "Danao City", region: "Central Visayas", coordinates: [124.027, 10.5207] },
  { name: "Minglanilla", region: "Central Visayas", coordinates: [123.796, 10.245] },
  { name: "San Fernando", region: "Central Visayas", coordinates: [123.706, 10.163] },
  { name: "Dumaguete City", region: "Central Visayas", coordinates: [123.3054, 9.3068] },
  { name: "Tagbilaran City", region: "Central Visayas", coordinates: [123.849, 9.6475] },
  { name: "Iloilo City", region: "Western Visayas", coordinates: [122.5644, 10.7202] },
  { name: "Bacolod City", region: "Western Visayas", coordinates: [122.9563, 10.6765] },
  { name: "Roxas City", region: "Western Visayas", coordinates: [122.7511, 11.5853] },
  { name: "Kalibo", region: "Western Visayas", coordinates: [122.3711, 11.7061] },
  { name: "Manila", region: "Metro Manila", coordinates: [120.9842, 14.5995] },
  { name: "Quezon City", region: "Metro Manila", coordinates: [121.0509, 14.676] },
  { name: "Makati City", region: "Metro Manila", coordinates: [121.0244, 14.5547] },
  { name: "Pasig City", region: "Metro Manila", coordinates: [121.0851, 14.5764] },
  { name: "Taguig City", region: "Metro Manila", coordinates: [121.0614, 14.5176] },
  { name: "Parañaque City", region: "Metro Manila", coordinates: [121.0178, 14.4793] },
  { name: "Caloocan City", region: "Metro Manila", coordinates: [120.9842, 14.6488] },
  { name: "Antipolo City", region: "CALABARZON", coordinates: [121.1763, 14.6255] },
  { name: "Cavite City", region: "CALABARZON", coordinates: [120.8969, 14.4791] },
  { name: "Dasmariñas", region: "CALABARZON", coordinates: [120.954, 14.3294] },
  { name: "Santa Rosa", region: "CALABARZON", coordinates: [121.111, 14.3122] },
  { name: "Batangas City", region: "CALABARZON", coordinates: [121.0584, 13.7565] },
  { name: "Lucena City", region: "CALABARZON", coordinates: [121.6174, 13.9411] },
  { name: "Baguio City", region: "Cordillera Administrative Region", coordinates: [120.596, 16.4023] },
  { name: "Dagupan City", region: "Ilocos Region", coordinates: [120.3333, 16.0433] },
  { name: "Laoag City", region: "Ilocos Region", coordinates: [120.5936, 18.196] },
  { name: "Vigan City", region: "Ilocos Region", coordinates: [120.3869, 17.5747] },
  { name: "Tuguegarao City", region: "Cagayan Valley", coordinates: [121.7269, 17.6132] },
  { name: "Angeles City", region: "Central Luzon", coordinates: [120.59, 15.145] },
  { name: "Olongapo City", region: "Central Luzon", coordinates: [120.2828, 14.8292] },
  { name: "Cabanatuan City", region: "Central Luzon", coordinates: [120.9675, 15.4859] },
  { name: "Legazpi City", region: "Bicol Region", coordinates: [123.7344, 13.1391] },
  { name: "Tacloban City", region: "Eastern Visayas", coordinates: [125.002, 11.2442] },
  { name: "Zamboanga City", region: "Zamboanga Peninsula", coordinates: [122.0739, 6.9214] },
  { name: "Cagayan de Oro City", region: "Northern Mindanao", coordinates: [124.6319, 8.4542] },
  { name: "Iligan City", region: "Northern Mindanao", coordinates: [124.2452, 8.228] },
  { name: "Davao City", region: "Davao Region", coordinates: [125.4553, 7.1907] },
  { name: "General Santos City", region: "SOCCSKSARGEN", coordinates: [125.1716, 6.1164] },
  { name: "Butuan City", region: "Caraga", coordinates: [125.5436, 8.9475] },
  { name: "Puerto Princesa City", region: "MIMAROPA", coordinates: [118.7384, 9.7392] },
];

export const cityCoordinates = Object.fromEntries(
  philippineLocations.map(({ name, coordinates }) => [name.toLowerCase(), coordinates]),
) as Record<string, [number, number]>;

export function distanceSquared(
  first: [number, number],
  second: [number, number],
) {
  return (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2;
}
