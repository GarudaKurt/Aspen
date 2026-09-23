import { Button } from "@/components/ui/button";
import { Circle, Dog, Scissors, ShoppingBag, Stethoscope } from "lucide-react";

const services = [
  {
    label: "Vet Clinic",
    count: "42 listed",
    icon: Stethoscope,
    color: "text-[#3c6355]",
  },
  {
    label: "Pet Supplies",
    count: "31 listed",
    icon: ShoppingBag,
    color: "text-[#ffbf00]",
  },
  {
    label: "Grooming",
    count: "42 listed",
    icon: Scissors,
    color: "text-[#6d55f4]",
  },
  { label: "Boarding", count: "31 listed", icon: Dog, color: "text-[#25b96d]" },
  {
    label: "Training",
    count: "31 listed",
    icon: Circle,
    color: "text-[#c5714e]",
  },
];

export function ServiceBrowse() {
  return (
    <section className="border-b border-[#d6d9d6] py-12 sm:py-16">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[130px]">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#3c6355] sm:text-4xl">
          Browse by service
        </h2>
        <p className="mt-2 text-sm text-[#777b78] sm:text-base">
          Jump straight to what your pet needs.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {services.map(({ label, count, icon: Icon, color }) => (
            <Button
              variant="ghost"
              type="button"
              key={label}
              className="flex min-w-[112px] items-center gap-2 rounded-full bg-white px-8 py-5.5 text-left shadow-[0_3px_5px_rgba(20,20,20,0.18)] transition-transform hover:-translate-y-0.5"
            >
              <Icon size={17} className={color} strokeWidth={1.5} />
              <span>
                <span className="block text-xs font-semibold text-[#171817]">
                  {label}
                </span>
                <span className="block text-[9px] text-[#a0a39f]">{count}</span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
