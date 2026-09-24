"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent, type ReactNode } from "react";
import {
  Accessibility,
  ArrowLeft,
  Check,
  CreditCard,
  Heart,
  ImagePlus,
  MapPin,
  Menu,
  MessageCircle,
  Pencil,
  Phone,
  Share2,
  Star,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export type TenantProfileData = {
  name: string;
  rating: string;
  reviews: string;
  category: string;
  address: string;
  verified?: boolean;
};

type TenantProfileProps = {
  provider?: TenantProfileData;
};

const defaultProvider: TenantProfileData = {
  name: "Kalinga Animal Hospital",
  rating: "4.9",
  reviews: "212 reviews",
  category: "Vet Clinic",
  address: "Kalayaan Ave, Quezon City",
  verified: true,
};

const tabs = ["Overview", "Photos", "Services", "Reviews"];

const amenities = [
  { label: "Walk-ins welcome", icon: Check },
  { label: "Free parking", icon: Truck },
  { label: "Cards payment", icon: CreditCard },
  { label: "Wheel chair accessible", icon: Accessibility },
  { label: "24/7 Emergency hotline", icon: Phone },
];

const hours = [
  ["Mon – Fri", "8 AM – 8 PM"],
  ["Saturday", "9 AM – 6 PM"],
  ["Sunday", "8 AM – 12 PM"],
];

type ServiceItem = {
  title: string;
  description: string;
  price: string;
};

type ServiceCategory = {
  label: string;
  services: ServiceItem[];
};

type ReviewData = {
  name: string;
  starRating: number;
  comment: string;
  photos?: string[];
};

const mockReviews: ReviewData[] = [
  {
    name: "Marisse T.",
    starRating: 5,
    comment: "Staff were gentle with my very anxious cat. Dr. Reyes explained everything clearly before the procedure.",
    photos: ["/kalinga-anima-hospital.png"],
  },
  {
    name: "Daniel R.",
    starRating: 5,
    comment: "Very professional team and a smooth appointment from check-in to follow-up.",
    photos: ["/kalinga-anima-hospital.png"],
  },
  {
    name: "Andrea M.",
    starRating: 4,
    comment: "Clean clinic, kind staff, and helpful advice for keeping my dog healthy.",
  },
  {
    name: "Nico P.",
    starRating: 5,
    comment: "They took great care of my pet and made sure I understood the next steps.",
  },
];

const serviceCategories: ServiceCategory[] = [
  {
    label: "Veterinary",
    services: [
      { title: "General Consultation", description: "Checkup and health assessment", price: "₱500" },
      { title: "Core Vaccination", description: "Rabies, DHPPi, or feline core vaccines", price: "₱650" },
      { title: "Dental Cleaning", description: "Scaling and polishing under sedation", price: "₱650" },
      { title: "Emergency Care", description: "Walk-in urgent and after-hours care", price: "₱650" },
    ],
  },
  {
    label: "Grooming",
    services: [
      { title: "Full Grooming", description: "Bath, haircut, nail trim, and ear cleaning", price: "₱900" },
      { title: "Grooming Add-on", description: "Bath, nail trim, and ear cleaning", price: "₱500" },
      { title: "De-shedding Treatment", description: "Deep coat care for heavy shedders", price: "₱750" },
    ],
  },
  {
    label: "Boarding",
    services: [
      { title: "Day Boarding", description: "Supervised daytime care and play", price: "₱800" },
      { title: "Overnight Boarding", description: "Comfortable overnight stay with check-ins", price: "₱1,500" },
      { title: "Boarding Add-on", description: "Medication and special care support", price: "₱300" },
    ],
  },
];

export function TenantProfile({ provider = defaultProvider }: TenantProfileProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [saved, setSaved] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);

  const handleImageUpload = (
    event: ChangeEvent<HTMLInputElement>,
    setPreview: (preview: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 text-[#171817] sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <header className="flex items-center justify-between border-b border-[#d9d9d6] pb-4">
          <Link
            href="/#browse"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#242524] transition-colors hover:text-[#3c6355] sm:text-base"
          >
            <ArrowLeft size={16} />
            Back to search
          </Link>
          <Link href="/" className="text-base font-medium tracking-wide">
            Logo here
          </Link>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Open menu"
            className="rounded-lg border-[#d8dfdc] bg-white text-[#3c6355] hover:bg-[#eef3f0]"
          >
            <Menu size={17} />
          </Button>
        </header>

        <section className="pt-6 sm:pt-8">
          <label className="relative block h-[150px] cursor-pointer overflow-hidden rounded-2xl bg-[#f0f0ef] sm:h-[190px] lg:h-[230px]">
            {coverPhoto && (
              <Image
                src={coverPhoto}
                alt="Cover photo preview"
                fill
                unoptimized
                sizes="(min-width: 1024px) 1120px, 100vw"
                className="object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleImageUpload(event, setCoverPhoto)}
            />
            <span className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-[#3c6355] shadow-sm">
              <Pencil size={16} />
              <span className="sr-only">Upload or edit cover photo</span>
            </span>
          </label>
          <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl lg:text-3xl">
                  {provider.name}
                </h1>
                {provider.verified && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2768f5] px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Check size={11} />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-[#838684] sm:text-xs">
                <Star size={11} fill="#ffd000" strokeWidth={0} />
                <span className="font-semibold text-[#242524]">{provider.rating}</span>
                <span>·</span>
                <span>{provider.reviews}</span>
                <span>·</span>
                <span>{provider.category}</span>
                <span>·</span>
                <span>{provider.address}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label={saved ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={saved}
                onClick={() => setSaved((current) => !current)}
                className={`rounded-full border-[#d8dfdc] bg-white text-[#3c6355] hover:bg-[#eef3f0] ${saved ? "bg-[#3c6355] text-white hover:bg-[#3c6355]" : ""}`}
              >
                <Heart size={17} fill={saved ? "currentColor" : "none"} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Share provider"
                className="rounded-full border-[#d8dfdc] bg-white text-[#3c6355] hover:bg-[#eef3f0]"
              >
                <Share2 size={16} />
              </Button>
              <Button
                type="button"
                className="h-9 rounded-full bg-[#3c6355] px-3 text-xs text-white hover:bg-[#2f5044]"
              >
                <MessageCircle size={14} />
                Message
              </Button>
            </div>
          </div>
        </section>

        <Card className="mt-14 grid overflow-hidden rounded-2xl border-[#d8d8d5] bg-white shadow-none sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          <Stat label="Status" value="OPEN - Closes 8 PM" />
          <Stat label="Price tier" value="Start at 1500 - Premium" />
          <Stat label="Response time" value="Usually within 1 hr" />
          <Stat label="Since" value="Member since 2024" />
        </Card>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-b border-[#d8d8d5] px-2 sm:gap-x-10">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative h-10 shrink-0 rounded-none px-0 text-base font-medium text-[#171817] hover:bg-transparent hover:text-[#3c6355] sm:text-lg ${activeTab === tab ? "text-[#3c6355] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[#c5714e]" : ""}`}
            >
              {tab}
              
            </Button>
          ))}
        </div>

        <div className="grid gap-12 px-2 py-8 sm:px-4 lg:grid-cols-[1fr_260px] lg:gap-16">
          <div>
            {activeTab === "Overview" ? (
              <>
                <ProfileSection title="About">
                  <p className="max-w-[650px] text-sm font-semibold leading-5 text-[#929492] sm:text-base">
                    Full-service animal hospital offering general checkups, vaccinations,
                    surgery, and 24/7 emergency care. Our team of licensed veterinarians
                    has cared for pets in Quezon City since 2024, with a focus on gentle
                    handling and clear communication with owners.
                  </p>
                </ProfileSection>

                <ProfileSection title="Amenities">
                  <div className="flex max-w-[700px] flex-wrap gap-4">
                    {amenities.map(({ label, icon: Icon }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd8] px-3 py-1.5 text-xs font-semibold text-[#272927]"
                      >
                        <Icon size={14} className="text-[#3c6355]" />
                        {label}
                      </span>
                    ))}
                  </div>
                </ProfileSection>

                <ProfileSection title="Hours">
                  <div className="max-w-[320px] space-y-3 text-xs font-semibold text-[#3c6355]">
                    {hours.map(([day, time]) => (
                      <div
                        key={day}
                        className="flex justify-between border-b border-[#bfc3c0] pb-2"
                      >
                        <span>{day}</span>
                        <span>{time}</span>
                      </div>
                    ))}
                  </div>
                </ProfileSection>

                <ProfileSection title="Location">
                  <div className="flex h-36 max-w-[520px] items-center justify-center rounded-xl bg-[#e7e7e7] text-sm text-[#555957]">
                    <MapPin size={18} className="mr-2 text-[#ef4444]" />
                    {provider.address} — map preview
                  </div>
                </ProfileSection>
              </>
            ) : activeTab === "Photos" ? (
              <PhotoGallery providerName={provider.name} />
            ) : activeTab === "Services" ? (
              <ServicesPanel />
            ) : activeTab === "Reviews" ? (
              <ReviewsPanel />
            ) : (
              <div className="rounded-xl border border-dashed border-[#d8d8d5] p-8 text-sm text-[#777b78]">
                {activeTab} for {provider.name} will appear here.
              </div>
            )}
          </div>

          <ScheduleCard />
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#d8d8d5] px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
      <p className="text-xs font-bold uppercase text-[#a7a9a7]">{label}</p>
      <p className="mt-2 text-xs font-bold text-[#161716]">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-6 text-lg font-bold text-[#3c6355] sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

function ReviewsPanel() {
  return (
    <div className="rounded-2xl border border-[#d8d8d5] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-5 border-b border-[#e5e6e4] pb-5">
        <div>
          <p className="text-4xl font-bold text-[#3c6355]">4.9</p>
          <div className="mt-1 flex gap-0.5 text-[#ffd000]" aria-label="Average rating: 4.9 out of 5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} size={14} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
        </div>
        <p className="max-w-[180px] pt-1 text-xs leading-4 text-[#929492]">
          Based on 222 reviews
          <br />
          from verified visits
        </p>
      </div>
      <div className="space-y-3">
        {mockReviews.map((review) => (
          <ReviewItem key={`${review.name}-${review.comment}`} {...review} />
        ))}
      </div>
    </div>
  );
}

function ReviewItem({ name, starRating, comment, photos = [] }: ReviewData) {
  const [reviewPhotos, setReviewPhotos] = useState(photos);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <article className="rounded-xl border border-[#e5e6e4] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f7f5ed] text-xs font-bold text-[#3c6355]">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#272927]">{name}</p>
          <div className="mt-1 flex gap-0.5 text-[#ffd000]" aria-label={`${starRating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                size={13}
                fill={index < Math.round(starRating) ? "currentColor" : "none"}
                strokeWidth={index < Math.round(starRating) ? 0 : 1.5}
              />
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#929492] sm:text-sm">{comment}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {reviewPhotos.map((photo, index) => (
              <Image
                key={`${photo}-${index}`}
                src={photo}
                alt={`${name} review photo ${index + 1}`}
                width={72}
                height={72}
                className="size-16 rounded-lg object-cover"
              />
            ))}
            <label className="inline-flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#cfd4d1] text-[#3c6355] transition-colors hover:bg-[#f2f5f3]">
              <ImagePlus size={18} />
              <span className="sr-only">Upload a photo with your review</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setReviewPhotos((current) => [...current, URL.createObjectURL(file)]);
                }}
              />
            </label>
          </div>
        </div>
        <time className="ml-auto shrink-0 text-[10px] text-[#929492]">2 weeks ago</time>
      </div>
    </article>
  );
}

function ServicesPanel() {
  const [selectedCategory, setSelectedCategory] = useState(serviceCategories[0].label);
  const category =
    serviceCategories.find(({ label }) => label === selectedCategory) ??
    serviceCategories[0];

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#777b78]">
          Service type
        </p>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger
            aria-label="Choose a service type"
            className="h-11 rounded-xl border-[#d8d8d5] bg-white text-sm font-semibold text-[#3c6355] shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {serviceCategories.map(({ label }) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[#e5e6e4] bg-white px-4 sm:px-6">
        <div className="border-b border-[#e5e6e4] py-4">
          <h3 className="text-base font-bold text-[#3c6355]">{category.label}</h3>
          <p className="mt-1 text-xs text-[#929492]">
            Available services and starting prices
          </p>
        </div>
        <div className="divide-y divide-[#e5e6e4]">
          {category.services.map((service) => (
            <ServiceItemRow key={service.title} {...service} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceItemRow({ title, description, price }: ServiceItem) {
  return (
    <article className="flex items-start justify-between gap-6 py-5">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#272927] sm:text-base">{title}</h3>
        <p className="mt-1 text-xs text-[#929492] sm:text-sm">{description}</p>
      </div>
      <p className="shrink-0 pt-0.5 text-sm font-bold text-[#3c6355] sm:text-base">{price}</p>
    </article>
  );
}

function PhotoGallery({ providerName }: { providerName: string }) {
  const photos = [
    { src: "/kalinga-anima-hospital.png", position: "object-center" },
    { src: "/kalinga-anima-hospital.png", position: "object-[25%_center]" },
    { src: "/kalinga-anima-hospital.png", position: "object-[75%_center]" },
    { src: "/kalinga-anima-hospital.png", position: "object-center" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map(({ src, position }, index) => (
        <div
          key={`${src}-${index}`}
          className="relative aspect-square overflow-hidden rounded-2xl bg-[#f0f0ef]"
        >
          <Image
            src={src}
            alt={`${providerName} photo ${index + 1}`}
            fill
            sizes="(min-width: 640px) 220px, 50vw"
            className={`object-cover transition-transform duration-300 hover:scale-105 ${position}`}
          />
        </div>
      ))}
    </div>
  );
}

function ScheduleCard() {
  return (
    <Card className="h-fit rounded-xl border-[#d8d8d5] bg-white p-5 shadow-none">
      <h2 className="text-lg font-bold text-[#3c6355]">This week</h2>
      <div className="mt-5 space-y-3 text-xs font-semibold text-[#3c6355]">
        {hours.map(([day, time]) => (
          <div key={day} className="flex justify-between border-b border-[#bfc3c0] pb-2">
            <span>{day}</span>
            <span>{time}</span>
          </div>
        ))}
      </div>
      <Link
        href="/request-appointment"
        className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md bg-[#3c6355] px-2 text-[10px] font-medium text-white hover:bg-[#2f5044]"
      >
        Request Appointment
      </Link>
      <p className="mt-5 text-center text-[8px] text-[#a7a9a7]">
        Free to request · no payment required now
      </p>
    </Card>
  );
}
