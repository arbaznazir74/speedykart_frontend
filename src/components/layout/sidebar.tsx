"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { RoleType } from "@/lib/constants";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Layers,
  Star,
  HelpCircle,
  Ruler,
  CookingPot,
  Percent,
  Image,
  Megaphone,
  MapPin,
  Bike,
  Receipt,
  Wallet,
  BadgeDollarSign,
  Users,
  Store,
  Settings,
  Ticket,
  HeadphonesIcon,
  MessageSquare,
  UserCircle,
  ChevronDown,
  Filter,
  Boxes,
  Truck,
  Flame,
  ShoppingBag,
  Zap,
  Link2,
  Warehouse,
  AlertTriangle,
  Banknote,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: RoleType[];
  children?: NavItem[];
}

interface NavSection {
  label: string;
  icon?: LucideIcon;
  color?: string;
  roles: RoleType[];
  items: NavItem[];
}

const navSections: NavSection[] = [
  // ══════════════════════════════════════════════
  //  ADMIN  –  General
  // ══════════════════════════════════════════════
  {
    label: "Overview",
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Orders", href: "/admin/orders", icon: ShoppingCart, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
    ],
  },

  // ══════════════════════════════════════════════
  //  ADMIN  –  HotBox (Food Delivery)
  // ══════════════════════════════════════════════
  {
    label: "HotBox",
    icon: Flame,
    color: "text-orange-500",
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      { title: "Categories", href: "/admin/hotbox/categories", icon: Layers, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Products", href: "/admin/hotbox/products", icon: Package, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Inventory", href: "/admin/hotbox/inventory", icon: Warehouse, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Toppings", href: "/admin/hotbox/toppings", icon: CookingPot, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Units", href: "/admin/hotbox/units", icon: Ruler, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
    ],
  },

  // ══════════════════════════════════════════════
  //  ADMIN  –  SpeedyMart (Grocery / Mart)
  // ══════════════════════════════════════════════
  {
    label: "SpeedyMart",
    icon: ShoppingBag,
    color: "text-emerald-500",
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      { title: "Categories", href: "/admin/speedymart/categories", icon: Layers, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Products", href: "/admin/speedymart/products", icon: Package, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Inventory", href: "/admin/speedymart/inventory", icon: Warehouse, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Brands", href: "/admin/brands", icon: Tags, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Spec Filters", href: "/admin/speedymart/specification-filters", icon: Filter, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Units", href: "/admin/speedymart/units", icon: Ruler, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
    ],
  },

  // ══════════════════════════════════════════════
  //  ADMIN  –  Product Management
  // ══════════════════════════════════════════════
  {
    label: "Product Management",
    icon: Package,
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      { title: "Product Listings", href: "/admin/product-listings", icon: Layers, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Associate Products", href: "/admin/associate-products", icon: Link2, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Price Management", href: "/admin/price-management", icon: BadgeDollarSign, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
    ],
  },

  // ══════════════════════════════════════════════
  //  ADMIN  –  Shared Catalog
  // ══════════════════════════════════════════════
  {
    label: "Catalog (Shared)",
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      { title: "Banners", href: "/admin/banners", icon: Image, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Offers", href: "/admin/offers", icon: Percent, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      {
        title: "Product Extras",
        href: "#",
        icon: Boxes,
        roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
        children: [
          { title: "Product Tags", href: "/admin/product-tags", icon: Tags, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
          { title: "Product FAQs", href: "/admin/product-faqs", icon: HelpCircle, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
          { title: "Product Ratings", href: "/admin/product-ratings", icon: Star, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
        ],
      },
      { title: "Promotional Content", href: "/admin/promotional-contents", icon: Megaphone, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Promo Codes", href: "/admin/promo-codes", icon: Ticket, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
    ],
  },

  // ══════════════════════════════════════════════
  //  ADMIN  –  Delivery & Operations
  // ══════════════════════════════════════════════
  {
    label: "Delivery & Operations",
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      {
        title: "Delivery",
        href: "#",
        icon: Truck,
        roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
        children: [
          { title: "Delivery Places", href: "/admin/delivery-places", icon: MapPin, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
          { title: "Delivery Boys", href: "/admin/delivery-boys", icon: Bike, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
          { title: "Delivery Requests", href: "/admin/delivery-requests", icon: Receipt, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
          { title: "Rider Transactions", href: "/admin/delivery-boy-order-transactions", icon: Wallet, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
          { title: "Rider Earnings", href: "/admin/delivery-boy-transactions", icon: BadgeDollarSign, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════
  //  ADMIN  –  People & Settings
  // ══════════════════════════════════════════════
  {
    label: "People & Settings",
    roles: [RoleType.SuperAdmin, RoleType.SystemAdmin],
    items: [
      { title: "Admins", href: "/admin/admins", icon: UserCircle, roles: [RoleType.SuperAdmin] },
      { title: "Users", href: "/admin/users", icon: Users, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Sellers", href: "/admin/sellers", icon: Store, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Seller Settings", href: "/admin/seller-settings", icon: Settings, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "User Support", href: "/admin/user-support", icon: HeadphonesIcon, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "FAQs", href: "/admin/faqs", icon: MessageSquare, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
      { title: "Settings", href: "/admin/settings", icon: Settings, roles: [RoleType.SuperAdmin, RoleType.SystemAdmin] },
    ],
  },

  // ══════════════════════════════════════════════
  //  SELLER  –  Overview
  // ══════════════════════════════════════════════
  {
    label: "Overview",
    roles: [RoleType.Seller],
    items: [
      { title: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard, roles: [RoleType.Seller] },
      { title: "Incoming Orders", href: "/seller/orders", icon: ShoppingCart, roles: [RoleType.Seller] },
      { title: "Complaints", href: "/seller/complaints", icon: AlertTriangle, roles: [RoleType.Seller] },
    ],
  },

  // ══════════════════════════════════════════════
  //  SELLER  –  HotBox
  // ══════════════════════════════════════════════
  {
    label: "HotBox",
    icon: Flame,
    color: "text-orange-500",
    roles: [RoleType.Seller],
    items: [
      { title: "Categories", href: "/seller/hotbox/categories", icon: Layers, roles: [RoleType.Seller] },
      { title: "Products", href: "/seller/hotbox/products", icon: Package, roles: [RoleType.Seller] },
      { title: "Inventory", href: "/seller/hotbox/inventory", icon: Warehouse, roles: [RoleType.Seller] },
      { title: "Product Timings", href: "/seller/hotbox/product-timings", icon: Clock, roles: [RoleType.Seller] },
      { title: "Product Tags", href: "/seller/product-tags", icon: Tags, roles: [RoleType.Seller] },
      { title: "Toppings", href: "/seller/hotbox/toppings", icon: CookingPot, roles: [RoleType.Seller] },
      { title: "Units", href: "/seller/hotbox/units", icon: Ruler, roles: [RoleType.Seller] },
    ],
  },

  // ══════════════════════════════════════════════
  //  SELLER  –  SpeedyMart
  // ══════════════════════════════════════════════
  {
    label: "SpeedyMart",
    icon: ShoppingBag,
    color: "text-emerald-500",
    roles: [RoleType.Seller],
    items: [
      { title: "Categories", href: "/seller/speedymart/categories", icon: Layers, roles: [RoleType.Seller] },
      { title: "Products", href: "/seller/speedymart/products", icon: Package, roles: [RoleType.Seller] },
      { title: "Inventory", href: "/seller/speedymart/inventory", icon: Warehouse, roles: [RoleType.Seller] },
      { title: "Units", href: "/seller/speedymart/units", icon: Ruler, roles: [RoleType.Seller] },
    ],
  },

  // ══════════════════════════════════════════════
  //  SELLER  –  Delivery
  // ══════════════════════════════════════════════
  {
    label: "Delivery",
    roles: [RoleType.Seller],
    items: [
      { title: "Order Deliveries", href: "/seller/order-deliveries", icon: Package, roles: [RoleType.Seller] },
      { title: "Delivery Boys", href: "/seller/delivery-boys", icon: Truck, roles: [RoleType.Seller] },
      { title: "COD Collections", href: "/seller/cod-collections", icon: Banknote, roles: [RoleType.Seller] },
    ],
  },

  // ══════════════════════════════════════════════
  //  SELLER  –  Store
  // ══════════════════════════════════════════════
  {
    label: "Store",
    roles: [RoleType.Seller],
    items: [
      { title: "Store Hours", href: "/seller/store-hours", icon: Clock, roles: [RoleType.Seller] },
      { title: "Store Location", href: "/seller/delivery-places", icon: MapPin, roles: [RoleType.Seller] },
      { title: "Delivery Settings", href: "/seller/seller-settings", icon: Settings, roles: [RoleType.Seller] },
      { title: "Profile", href: "/seller/profile", icon: UserCircle, roles: [RoleType.Seller] },
    ],
  },
];

function NavItemComponent({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    const childActive = item.children!.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/")
    );
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
            childActive
              ? "bg-indigo-500/15 text-indigo-300"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 opacity-50 transition-transform", open && "rotate-180")}
          />
        </button>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/60 pl-3">
            {item.children!.map((child) => (
              <NavItemComponent key={child.href} item={child} pathname={pathname} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
        isActive
          ? "bg-indigo-500/15 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-indigo-400" : "opacity-60 group-hover:opacity-80")} />
      <span>{item.title}</span>
      {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />}
    </Link>
  );
}

function NavSections({ sections, pathname }: { sections: NavSection[]; pathname: string }) {
  return (
    <>
      {sections.map((section, idx) => (
        <div key={section.label} className={cn(idx > 0 && "mt-2")}>
          <div className="flex items-center gap-2 px-3 pt-5 pb-2">
            {section.icon && <section.icon className={cn("h-3.5 w-3.5", section.color ?? "text-slate-500")} />}
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.12em]",
              section.color ?? "text-slate-500"
            )}>
              {section.label}
            </span>
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavItemComponent key={item.href + item.title} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SidebarBrand({ onClick }: { onClick?: () => void }) {
  return (
    <div className="flex h-16 items-center px-5">
      <Link href="/" className="flex items-center gap-3" onClick={onClick}>
        <img src="/logo.jpg" alt="SpeedyKart" className="h-9 w-9 rounded-xl border-2 border-white shadow-lg shadow-indigo-500/25 object-cover" />
        <div>
          <span className="text-[15px] font-bold text-white tracking-tight">SpeedyKart</span>
          <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Management Console</p>
        </div>
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const filtered = navSections.filter(
    (section) => role !== null && section.roles.includes(role)
  );

  return (
    <aside className="hidden md:flex md:w-[260px] md:flex-col bg-[#0f172a] border-r border-slate-800">
      <SidebarBrand />
      <div className="mx-4 h-px bg-slate-800" />
      <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin scrollbar-thumb-slate-700">
        <NavSections sections={filtered} pathname={pathname} />
      </nav>
      <div className="mx-4 h-px bg-slate-800" />
      <div className="px-5 py-3">
        <p className="text-[10px] text-slate-600">v1.0.0 — SpeedyKart</p>
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { role } = useAuth();

  const filtered = navSections.filter(
    (section) => role !== null && section.roles.includes(role)
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0f172a] shadow-2xl shadow-black/50">
        <SidebarBrand onClick={onClose} />
        <div className="mx-4 h-px bg-slate-800" />
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <NavSections sections={filtered} pathname={pathname} />
        </nav>
      </aside>
    </>
  );
}
