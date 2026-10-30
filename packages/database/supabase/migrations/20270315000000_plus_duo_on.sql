-- Plus Duo, part 2: the website can now invite the second person (Your
-- Plus, `/plus/duo/<code>`), so the Duo plans are offered.
update public.plans set active = true where duo;
