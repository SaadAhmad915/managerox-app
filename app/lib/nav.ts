import type { IconName } from "@/app/components/Icon";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

/** Sidebar order matches the product design. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/leads", label: "Leads", icon: "group" },
  { href: "/contacts", label: "Contacts", icon: "person" },
  { href: "/deals", label: "Deals", icon: "work" },
  { href: "/tasks", label: "Tasks", icon: "task_alt" },
  { href: "/calendar", label: "Calendar", icon: "calendar_month" },
  { href: "/reports", label: "Reports", icon: "bar_chart" },
  { href: "/automation", label: "Automation", icon: "bolt" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** The five slots on the phone tab bar; "Add" is the centre action. */
export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/leads", label: "Leads", icon: "group" },
  { href: "/deals", label: "Deals", icon: "work" },
  { href: "/more", label: "More", icon: "more_horiz" },
];
