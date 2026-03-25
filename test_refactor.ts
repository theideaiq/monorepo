const isActive = (href: string, pathname: string | null) => {
  if (href === '/')
    return pathname === '/' || pathname?.match(/^\/[a-z]{2}$/) !== null;
  return pathname?.includes(href) ?? false;
};

console.log(isActive('/', '/'));
console.log(isActive('/', '/en'));
console.log(isActive('/', '/megastore'));
console.log(isActive('/megastore', '/en/megastore'));
