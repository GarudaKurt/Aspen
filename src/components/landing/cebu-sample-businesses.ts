import type { BusinessCardProps } from "./business-card";

/**
 * Publicly listed Cebu businesses used only to exercise the map UI.
 *
 * These are not tenant records. Ratings and pricing are intentionally omitted.
 * Some coordinates identify the mapped street or venue rather than a confirmed
 * storefront; those records are marked so they can be manually pinned later.
 */
const sampleImages = [
  { src: "/img/mock/image_1.png", position: "object-center" },
  { src: "/img/mock/image_2.png", position: "object-center" },
  { src: "/img/mock/image_3.png", position: "object-center" },
];

type CebuSample = {
  name: string;
  slug: string;
  service: string;
  street: string;
  barangay: string;
  city: string;
  landmark?: string;
  coordinates: [number, number] | null;
  accuracy: "business" | "venue" | "street-reference" | "address-only";
};

const cebuSamples: CebuSample[] = [
  {
    name: "Caminade Petshop – Mabolo",
    slug: "caminade-petshop-mabolo",
    service: "Pet Supplies",
    street: "M.J. Cuenco Avenue",
    barangay: "Mabolo",
    city: "Cebu City",
    coordinates: [123.9060215, 10.2981612],
    accuracy: "street-reference",
  },
  {
    name: "Caminade Petshop – Banawa",
    slug: "caminade-petshop-banawa",
    service: "Pet Supplies",
    street: "294 Fortich Street, corner Duterte Street",
    barangay: "Banawa",
    city: "Cebu City",
    coordinates: [123.8820156, 10.3142411],
    accuracy: "street-reference",
  },
  {
    name: "Caminade Petshop – Banilad",
    slug: "caminade-petshop-banilad",
    service: "Pet Supplies",
    street: "Unit 3 Banilad Cebu Trade Center, Gov. M. Cuenco Avenue",
    barangay: "Kasambagan",
    city: "Cebu City",
    coordinates: [123.9178368, 10.3422038],
    accuracy: "street-reference",
  },
  {
    name: "Caminade Petshop – Lapu-Lapu",
    slug: "caminade-petshop-lapu-lapu",
    service: "Pet Supplies",
    street: "2512 M. Patalinghug Avenue",
    barangay: "Pajo",
    city: "Lapu-Lapu City",
    coordinates: null,
    accuracy: "address-only",
  },
  {
    name: "Caminade Petshop – Mambaling",
    slug: "caminade-petshop-mambaling",
    service: "Pet Supplies",
    street: "N. Bacalso Avenue",
    barangay: "Duljo Poblacion",
    city: "Cebu City",
    coordinates: [123.8843991, 10.2960909],
    accuracy: "street-reference",
  },
  {
    name: "Caminade Petshop – Talamban",
    slug: "caminade-petshop-talamban",
    service: "Pet Supplies",
    street: "Nasipit Road",
    barangay: "Talamban",
    city: "Cebu City",
    coordinates: [123.9145494, 10.3588217],
    accuracy: "street-reference",
  },
  {
    name: "Caminade South Petshop – Mandaue",
    slug: "caminade-south-petshop-mandaue",
    service: "Pet Supplies",
    street: "Lot 1916-A North Road, National Highway",
    barangay: "Basak",
    city: "Mandaue City",
    coordinates: [123.9467032, 10.3425695],
    accuracy: "street-reference",
  },
  {
    name: "Cebu Veterinary Doctors – Main",
    slug: "cebu-veterinary-doctors-main",
    service: "Vet Clinics",
    street: "F. Ramos Street",
    barangay: "Santa Cruz",
    city: "Cebu City",
    coordinates: [123.8953268, 10.3084901],
    accuracy: "business",
  },
  {
    name: "Happy Paws Veterinary Clinic",
    slug: "happy-paws-veterinary-clinic",
    service: "Vet Clinics",
    street: "947-A V. Rama Avenue",
    barangay: "Guadalupe",
    city: "Cebu City",
    coordinates: [123.8851174, 10.3171482],
    accuracy: "street-reference",
  },
  {
    name: "Happy Tails Veterinary Clinic",
    slug: "happy-tails-veterinary-clinic",
    service: "Vet Clinics",
    street: "Ground Floor, Unit 2 Labangon Town Center",
    barangay: "Labangon",
    city: "Cebu City",
    coordinates: [123.8770887, 10.3003187],
    accuracy: "venue",
  },
  {
    name: "Lil Paws Veterinary Clinic",
    slug: "lil-paws-veterinary-clinic",
    service: "Vet Clinics",
    street: "215 Francisco Llamas Street",
    barangay: "Punta Princesa, Labangon",
    city: "Cebu City",
    coordinates: [123.869612, 10.300776],
    accuracy: "street-reference",
  },
  {
    name: "MCA Animal Care Clinic",
    slug: "mca-animal-care-clinic",
    service: "Vet Clinics",
    street: "1014-A South Road, corner Cabreros Street",
    barangay: "Banawa",
    city: "Cebu City",
    coordinates: [123.8732863, 10.3176472],
    accuracy: "street-reference",
  },
  {
    name: "NDV Pet Lovers Clinic",
    slug: "ndv-pet-lovers-clinic",
    service: "Vet Clinics",
    street: "129 Carlock Street",
    barangay: "San Nicolas",
    city: "Cebu City",
    coordinates: [123.8869143, 10.293793],
    accuracy: "street-reference",
  },
  {
    name: "Zooey Pets Veterinary Clinic",
    slug: "zooey-pets-veterinary-clinic",
    service: "Vet Clinics",
    street: "JY Square Mall, Salinas Drive",
    barangay: "Lahug",
    city: "Cebu City",
    coordinates: [123.8982846, 10.3307903],
    accuracy: "venue",
  },
  {
    name: "Animal Kingdom Veterinary Clinic and Laboratory",
    slug: "animal-kingdom-veterinary-clinic",
    service: "Vet Clinics",
    street: "38 Gorordo Avenue",
    barangay: "Camputhaw",
    city: "Cebu City",
    coordinates: [123.9023924, 10.31336],
    accuracy: "street-reference",
  },
  {
    name: "Pet Lane Pet Supply & Grooming",
    slug: "pet-lane-pet-supply-grooming",
    service: "Grooming",
    street: "NR Lastimoso Building, Laray",
    barangay: "San Roque",
    city: "Talisay City",
    coordinates: [123.8579529, 10.2591858],
    accuracy: "venue",
  },
  {
    name: "DVMF Cebu City",
    slug: "dvmf-cebu-city",
    service: "Vet Clinics",
    street: "Back of SM City Cebu",
    barangay: "Carreta",
    city: "Cebu City",
    landmark: "Near SM City Cebu",
    coordinates: [123.91867, 10.31179],
    accuracy: "venue",
  },
  {
    name: "Meow Fresh – Fuente Branch",
    slug: "meow-fresh-fuente",
    service: "Grooming",
    street: "G/F Adelfa Hotel, J. Llorente Street",
    barangay: "Capitol Site",
    city: "Cebu City",
    coordinates: [123.8939192, 10.3111466],
    accuracy: "street-reference",
  },
  {
    name: "Animal Wellness Veterinary Clinic – Parkmall",
    slug: "animal-wellness-parkmall",
    service: "Vet Clinics",
    street: "Alfresco 4, Ground Floor, Unit 38, Parkmall, Ouano Avenue",
    barangay: "Mandaue Reclamation Area",
    city: "Mandaue City",
    coordinates: [123.9347064, 10.325702],
    accuracy: "venue",
  },
  {
    name: "Pocket Paw Pet Grooming Service & Hotel",
    slug: "pocket-paw-pet-grooming-hotel",
    service: "Boarding",
    street: "Sebastien Hotel, Manuel L. Quezon National Highway",
    barangay: "Mactan",
    city: "Lapu-Lapu City",
    coordinates: [124.0100577, 10.3069498],
    accuracy: "venue",
  },
];

export const cebuSampleBusinesses: BusinessCardProps[] = cebuSamples.map(
  (business) => ({
    location: `${business.city}, Cebu`,
    locationDetails: {
      province: "Cebu",
      cityMunicipality: business.city,
      barangay: business.barangay,
      streetAddress: business.street,
      landmark: business.landmark ?? "",
      additionalDetails: "Public business listing used for map validation only",
      coordinates: business.coordinates,
      locationAccuracy: business.accuracy,
      locationSource: "Public business listing and OpenStreetMap street/venue reference",
    },
    businessName: business.name,
    slug: business.slug,
    rating: "Not yet rated",
    services: business.service,
    priceStarts: "Contact provider",
    servicesOffered: [],
    href: `/business-profile/${business.slug}`,
    images: sampleImages,
  }),
);
