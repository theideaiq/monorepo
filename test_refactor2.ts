const locales = ['en', 'ar'] as const;
type Locale = (typeof locales)[number];

const checkLocale = (locale: string | undefined) => {
  return locales.includes(locale as Locale);
};

console.log(checkLocale('en'));
console.log(checkLocale('fr'));
console.log(checkLocale(undefined));
