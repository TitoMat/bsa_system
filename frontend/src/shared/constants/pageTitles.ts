import { sidebarItems, type SidebarItem } from "../../components/layout/sidebar.config";

type PageTitleEntry = { path: string; title: string };

const EXTRA_TITLES: PageTitleEntry[] = [
  { path: "/profile", title: "My Profile" },
  { path: "/fleet/insights", title: "Fleet Insights" },
];

function flattenSidebarItems(
  items: SidebarItem[],
  entries: PageTitleEntry[] = [],
): PageTitleEntry[] {
  for (const item of items) {
    if (item.path) {
      entries.push({ path: item.path, title: item.label });
    }
    if (item.children) {
      flattenSidebarItems(item.children, entries);
    }
  }
  return entries;
}

export function getPageTitle(pathname: string): string {
  const entries = [
    ...flattenSidebarItems(sidebarItems),
    ...EXTRA_TITLES,
  ].sort((a, b) => b.path.length - a.path.length);

  const matched = entries.find(
    (entry) =>
      pathname === entry.path || pathname.startsWith(`${entry.path}/`),
  );

  return matched?.title ?? "Workspace";
}