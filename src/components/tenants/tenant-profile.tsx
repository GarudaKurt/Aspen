"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Accessibility,
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  Share2,
  Star,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

export function TenantProfile({ provider = defaultProvider }: TenantProfileProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [saved, setSaved] = useState(false);

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
          <div className="relative h-[220px] rounded-2xl bg-[#f0f0ef] sm:h-[300px] lg:h-[390px]">
            <Button
              variant="ghost"
              size="icon"
              aria-label="View more provider photos"
              className="absolute right-3 top-1/2 size-9 -translate-y-1/2 rounded-full bg-white/70 text-[#555957] hover:bg-white"
            >
              <span aria-hidden="true">›</span>
            </Button>

            <div className="absolute inset-x-3 bottom-[-34px] flex items-end justify-between gap-3 sm:inset-x-4 sm:bottom-[-40px]">
              <div className="flex min-w-0 items-end gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#3c6355] text-white shadow-sm sm:size-16">
                  <Plus size={25} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 pb-1">
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
              </div>

              <div className="flex shrink-0 items-center gap-2 pb-1">
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
                  className="hidden h-9 rounded-full bg-[#3c6355] px-3 text-xs text-white hover:bg-[#2f5044] sm:inline-flex"
                >
                  <MessageCircle size={14} />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Card className="mt-16 grid overflow-hidden rounded-2xl border-[#d8d8d5] bg-white shadow-none sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          <Stat label="Status" value="OPEN - Closes 8 PM" />
          <Stat label="Price tier" value="Start at 1500 - Premium" />
          <Stat label="Response time" value="Usually within 1 hr" />
          <Stat label="Since" value="Member since 2024" />
        </Card>

        <div className="mt-6 flex gap-7 overflow-x-auto border-b border-[#d8d8d5] px-2 sm:gap-9">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative h-10 shrink-0 rounded-none px-0 text-base font-medium text-[#171817] hover:bg-transparent hover:text-[#3c6355] sm:text-lg ${activeTab === tab ? "text-[#3c6355] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[#c5714e]" : ""}`}
            >
              {tab}
              {tab !== "Overview" && <span className="ml-1 text-sm text-[#777b78]">· 5</span>}
            </Button>
          ))}
        </div>

        <div className="grid gap-8 px-2 py-6 sm:px-4 lg:grid-cols-[1fr_190px] lg:gap-12">
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
                  <div className="flex max-w-[700px] flex-wrap gap-3">
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
                  <div className="max-w-[255px] space-y-2 text-xs font-semibold text-[#3c6355]">
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
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-[#3c6355] sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

function ScheduleCard() {
  return (
    <Card className="h-fit rounded-xl border-[#d8d8d5] bg-white p-3 shadow-none">
      <h2 className="text-base font-bold text-[#3c6355]">This week</h2>
      <div className="mt-3 space-y-2 text-[10px] font-semibold text-[#3c6355]">
        {hours.map(([day, time]) => (
          <div key={day} className="flex justify-between border-b border-[#bfc3c0] pb-2">
            <span>{day}</span>
            <span>{time}</span>
          </div>
        ))}
      </div>
      <Button className="mt-3 w-full bg-[#3c6355] px-2 text-[10px] text-white hover:bg-[#2f5044]">
        Request Appointment
      </Button>
      <p className="mt-3 text-center text-[7px] text-[#a7a9a7]">
        Free to request · no payment required now
      </p>
    </Card>
  );
}
