export type BusinessServiceStatus = "Active" | "Draft" | "Paused";

export type BusinessService = {
  id: string;
  title: string;
  category: string;
  description: string;
  price: string;
  duration: string;
  photos: string[];
  status: BusinessServiceStatus;
};
