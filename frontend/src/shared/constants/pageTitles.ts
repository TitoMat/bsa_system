type PageTitleEntry = { match: (pathname: string) => boolean; title: string };

export const PAGE_TITLES: PageTitleEntry[] = [
  { match: (pathname) => pathname === '/dashboard', title: 'Dashboard' },
  { match: (pathname) => pathname.startsWith('/permission'), title: 'Permission' },
  { match: (pathname) => pathname.startsWith('/users'), title: 'User Management' },
  { match: (pathname) => pathname.startsWith('/audit-logs'), title: 'Audit Logs' },
  { match: (pathname) => pathname.startsWith('/maps'), title: 'Maps' },
  { match: (pathname) => pathname.startsWith('/profile'), title: 'My Profile' },
  { match: (pathname) => pathname.startsWith('/catalogs/drivers'), title: 'Drivers' },
  { match: (pathname) => pathname.startsWith('/catalogs/cars'), title: 'Cars' },
  { match: (pathname) => pathname.startsWith('/transportation-requests/calendar'), title: 'Calendar' },
  { match: (pathname) => pathname.startsWith('/transportation-requests/lodge'), title: 'Lodge Request' },
  { match: (pathname) => pathname.startsWith('/transportation-requests'), title: 'Fleet Monitoring' },
];

export function getPageTitle(pathname: string): string {
  const matched = PAGE_TITLES.find((route) => route.match(pathname));
  return matched?.title ?? 'Workspace';
}
