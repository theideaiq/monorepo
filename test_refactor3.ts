interface WebNavbarProps {
  navItems: { label: string; href: string }[];
  logo?: React.ReactNode;
  desktopActions?: React.ReactNode;
  mobileActions?: React.ReactNode;
}
