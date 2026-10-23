export type MediaCategory =
  | "business_cover"
  | "business_gallery"
  | "service_photo"
  | "identity_document"
  | "review_photo";

export type MediaVisibility = "public" | "private";

export type MediaUploadTicket = {
  assetId: string;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
};

export type MediaAsset = {
  id: string;
  objectKey: string;
  category: MediaCategory;
  visibility: MediaVisibility;
  contentType: string;
  byteSize: number;
  originalFilename: string;
  status: "pending" | "active" | "failed" | "deleted";
  url?: string;
};
