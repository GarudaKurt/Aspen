"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "cn";

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: MenuPrimitive.Popup.Props & { sideOffset?: number }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner side="bottom" align="end" sideOffset={sideOffset}>
        <MenuPrimitive.Popup
          className={cn(
            "z-50 min-w-56 origin-(--transform-origin) rounded-xl border border-[#e0e0dd] bg-white p-2 text-[#242524] shadow-xl outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex min-h-10 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-[#eaf0ed] data-highlighted:text-[#315447] data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLinkItem({
  className,
  ...props
}: MenuPrimitive.LinkItem.Props) {
  return (
    <MenuPrimitive.LinkItem
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-[#eaf0ed] data-highlighted:text-[#315447]",
        className,
      )}
      {...props}
    />
  );
}

const DropdownMenuSeparator = MenuPrimitive.Separator;

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
