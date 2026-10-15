import type { BusinessCardProps } from "./business-card";

const researchImages = [
  { src: "/img/mock/image_1.png", position: "object-center" },
  { src: "/img/mock/image_3.png", position: "object-center" },
  { src: "/img/mock/image_5.png", position: "object-center" },
];

type ResearchBusiness = {
  slug: string;
  businessName: string;
  city: string;
  streetAddress: string;
  barangay?: string;
  landmark?: string;
  services: string;
  sourceUrl: string;
  priceStarts?: string;
  coordinates?: [number, number];
};

function createResearchBusiness({
  slug,
  businessName,
  city,
  streetAddress,
  barangay = "",
  landmark = "",
  services,
  sourceUrl,
  priceStarts,
  coordinates,
}: ResearchBusiness): BusinessCardProps {
  return {
    location: `${city}, Philippines`,
    locationDetails: {
      province: "Cebu",
      cityMunicipality: city,
      barangay,
      streetAddress,
      landmark,
      additionalDetails: "",
      // Coordinates remain null until a business-level pin is independently verified.
      coordinates: coordinates ?? null,
    },
    businessName,
    slug,
    // Ratings remain blank. Starting prices are UI-only mock fixtures, not researched claims.
    rating: "",
    services,
    priceStarts: priceStarts ?? (services === "Grooming" ? "Php 900" : services === "Pet Supplies" ? "Php 650" : "Php 1,200"),
    servicesOffered: [],
    sourceUrl,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName}, ${streetAddress}, ${city}, Cebu`)}`,
    images: researchImages,
  };
}

const vetPhilippines = {
  cebu: "https://vetphilippines.com/cebu/cebu-city/",
  talisay: "https://vetphilippines.com/cebu/talisay-city/",
  mandaue: "https://vetphilippines.com/cebu/mandaue/",
  lapuLapu: "https://vetphilippines.com/cebu/lapu-lapu-city/",
  consolacion: "https://vetphilippines.com/cebu/consolacion/",
};

// Research-backed development fixtures. Ratings, prices, and coordinates are not inferred.
export const mockBusinesses: BusinessCardProps[] = [
  // Cebu City
  createResearchBusiness({ slug: "animal-kingdom-veterinary-hospital-cebu-city", businessName: "Animal Kingdom Veterinary Hospital", city: "Cebu City", streetAddress: "38 Gorordo Avenue", services: "Vet Clinics", sourceUrl: vetPhilippines.cebu }),
  createResearchBusiness({ slug: "animal-medical-center-cebu-city", businessName: "Animal Medical Center", city: "Cebu City", streetAddress: "13 RR Landon and D. Jakosalem Street", barangay: "Cogon Ramos", services: "Vet Clinics", sourceUrl: vetPhilippines.cebu }),
  createResearchBusiness({ slug: "animal-wellness-vibo-place-cebu-city", businessName: "Animal Wellness – Vibo Place", city: "Cebu City", streetAddress: "N. Escario Street", landmark: "Axis Entertainment Avenue, Vibo Place", services: "Vet Clinics", sourceUrl: "https://philippines.worldplaces.me/business-centers-in-cebu-city/55889971-vibo-place.html", coordinates: [123.8957, 10.31813] }),
  createResearchBusiness({ slug: "cebu-veterinary-doctors-btc-branch", businessName: "Cebu Veterinary Doctors – BTC Branch", city: "Cebu City", streetAddress: "BTC Building, 208 Governor M. Cuenco Avenue", barangay: "Banilad", landmark: "Banilad Town Centre", services: "Vet Clinics", sourceUrl: vetPhilippines.cebu }),
  createResearchBusiness({ slug: "pets-in-the-city-talamban", businessName: "Pets in the City Veterinary Center", city: "Cebu City", streetAddress: "Unit 23, Upper Ground Floor, Talamban Times Square, Governor M. Cuenco Avenue", barangay: "Talamban", services: "Vet Clinics", sourceUrl: "https://petsinthecitycebu.my.canva.site/" }),

  // Talisay City
  createResearchBusiness({ slug: "akkadia-veterinary-clinic-talisay", businessName: "Akkadia Veterinary Clinic – Talisay", city: "Talisay City", streetAddress: "Unit 3, MCP Building, National Highway", barangay: "Linao", services: "Vet Clinics", sourceUrl: vetPhilippines.talisay }),
  createResearchBusiness({ slug: "apawthecary-veterinary-clinic-talisay", businessName: "Apawthecary Veterinary Clinic", city: "Talisay City", streetAddress: "Lower Ground, Cogal-Garces Arcade, J.P. Jose Rizal Street", barangay: "Poblacion", services: "Vet Clinics", sourceUrl: vetPhilippines.talisay }),
  createResearchBusiness({ slug: "doc-johns-veterinary-clinic-talisay", businessName: "Doc John's Veterinary Clinic – Talisay", city: "Talisay City", streetAddress: "AR Building, Regner Compound, San Isidro Road", barangay: "San Isidro", services: "Vet Clinics", sourceUrl: "https://vetphilippines.com/cebu/talisay-city/doc-johns-veterinary-clinic-2/" }),
  createResearchBusiness({ slug: "island-pet-paradise-talisay", businessName: "Island Pet Paradise", city: "Talisay City", streetAddress: "Cebu South Coastal Road", barangay: "Cansojong", services: "Vet Clinics", sourceUrl: "https://www.clinicfinderph.com/clinic/island-pet-paradise" }),
  createResearchBusiness({ slug: "1furpaws-talisay", businessName: "1FURPAWS Grooming & Pet Supplies Shop", city: "Talisay City", streetAddress: "6065 Provincial Highway", services: "Grooming", sourceUrl: "https://www.waze.com/live-map/directions/ph/central-visayas/talisay/1furpaws-grooming-and-pet-supplies-shop?to=place.ChIJ_7sE2kOdqTMRz1PyUQRRRVw" }),

  // Mandaue City
  createResearchBusiness({ slug: "pets-society-mandaue", businessName: "Pets Society Veterinary and Wellness", city: "Mandaue City", streetAddress: "880 A.S. Fortuna Street", barangay: "Banilad", landmark: "Oakridge Business Park", services: "Vet Clinics", sourceUrl: "https://philippines.worldplaces.me/places-in-mandaue-city/43242857-oakridge-business-park.html", coordinates: [123.91909, 10.34277] }),
  createResearchBusiness({ slug: "animal-touch-veterinary-clinic-mandaue", businessName: "Animal Touch Veterinary Clinic", city: "Mandaue City", streetAddress: "M.L. Quezon Avenue", services: "Vet Clinics", sourceUrl: vetPhilippines.mandaue }),
  createResearchBusiness({ slug: "aycardo-veterinary-center-mandaue", businessName: "Aycardo Veterinary Center Inc. – Mandaue Branch", city: "Mandaue City", streetAddress: "2/F TG Arcade, Hernan Cortes Street", services: "Vet Clinics", sourceUrl: "https://aycardovet.com/avci-mandaue-location/" }),
  createResearchBusiness({ slug: "doggyverse-veterinary-clinic-mandaue", businessName: "DoggyVerse Veterinary Clinic and Supplies", city: "Mandaue City", streetAddress: "Door 3, DCJ Building, 225 S.B. Cabahug", services: "Vet Clinics", sourceUrl: vetPhilippines.mandaue }),
  createResearchBusiness({ slug: "shambala-veterinary-clinic-mandaue", businessName: "Shambala Veterinary Clinic", city: "Mandaue City", streetAddress: "523-C Hernan Cortes Street", services: "Vet Clinics", sourceUrl: "https://vetphilippines.com/cebu/mandaue/shambala-2/" }),

  // Lapu-Lapu City
  createResearchBusiness({ slug: "cebu-animal-doctors-hospital-lapulapu", businessName: "Cebu Animal Doctors Hospital – Lapulapu Branch", city: "Lapu-Lapu City", streetAddress: "Collinwood Subdivision Road", barangay: "Basak", services: "Vet Clinics", sourceUrl: vetPhilippines.lapuLapu }),
  createResearchBusiness({ slug: "claws-and-paws-veterinary-clinic-lapulapu", businessName: "Claws And Paws Veterinary Clinic", city: "Lapu-Lapu City", streetAddress: "1790 Maximo V. Patalinjug Jr. Avenue", services: "Vet Clinics", sourceUrl: "https://philippines.worldplaces.me/places-in-lapu-lapu-city/50857489-claws-and-paws.html", coordinates: [123.95999, 10.31572] }),
  createResearchBusiness({ slug: "doc-johns-veterinary-clinic-lapulapu", businessName: "Doc John's Veterinary Clinic – LLC", city: "Lapu-Lapu City", streetAddress: "P&G Enterprise Building, Tiangue Road", barangay: "Babag 1", services: "Vet Clinics", sourceUrl: vetPhilippines.lapuLapu }),
  createResearchBusiness({ slug: "doggyverse-veterinary-clinic-lapulapu", businessName: "DoggyVerse Veterinary Clinic and Supplies", city: "Lapu-Lapu City", streetAddress: "M.L. Quezon National Highway", barangay: "Masiwa", services: "Vet Clinics", sourceUrl: vetPhilippines.lapuLapu }),
  createResearchBusiness({ slug: "mactan-animal-clinic-lapulapu", businessName: "Mactan Animal Clinic", city: "Lapu-Lapu City", streetAddress: "Door 2–3, Amistiso Building, Osmeña Street", barangay: "Gun-Ob", services: "Vet Clinics", sourceUrl: vetPhilippines.lapuLapu }),

  // Consolacion
  createResearchBusiness({ slug: "gpy-veterinare-animale-consolacion", businessName: "GPY Veterinare Animale", city: "Consolacion", streetAddress: "Cebu North Road", services: "Vet Clinics", sourceUrl: vetPhilippines.consolacion }),
  createResearchBusiness({ slug: "taf-animal-clinic-consolacion", businessName: "TAF Animal Clinic", city: "Consolacion", streetAddress: "National Highway Road", barangay: "Poblacion Occidental", services: "Vet Clinics", sourceUrl: "https://www.cybo.com/PH-biz/taf-animal-clinic" }),
  createResearchBusiness({ slug: "vet-co-animal-clinic-consolacion", businessName: "Vet Co. Animal Clinic", city: "Consolacion", streetAddress: "Central Nautical Highway", services: "Vet Clinics", sourceUrl: "https://www.cybo.com/PH-biz/vet-co-animal-clinic" }),
  createResearchBusiness({ slug: "la-consolacion-veterinary-farm-supply", businessName: "La Consolacion Veterinary and Farm Supply", city: "Consolacion", streetAddress: "Cebu North Road", barangay: "Pitogo", services: "Pet Supplies", sourceUrl: "https://www.waze.com/live-map/directions/ph/central-visayas/consolacion/la-consolacion-veterinary-and-farm-supply?to=place.ChIJ8zbMHLSiqTMREvfTutrJaMA" }),
  createResearchBusiness({ slug: "kimoya-petshoppe-consolacion", businessName: "Kimoya Petshoppe and Pet Grooming Salon", city: "Consolacion", streetAddress: "Cebu North Road", services: "Grooming", sourceUrl: "https://www.cybo.com/PH/consolacion-cebu/animal-and-pet-stores/" }),
];
