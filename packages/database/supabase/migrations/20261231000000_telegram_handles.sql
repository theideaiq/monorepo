-- The IDEA Club's Telegram group moved from @theideaclub to
-- @theideaiq_club (and Droid from @TheIdeaDroidBot to @theideaiq_bot);
-- the old addresses no longer open anything. Point the posts at the new
-- ones. Only the bodies change: the Telegram news trigger watches
-- published_at, so nothing is posted again.

update public.posts
set
  body_en = regexp_replace(
    regexp_replace(body_en, 't\.me/theideaclub\M', 't.me/theideaiq_club', 'gi'),
    'TheIdeaDroidBot', 'theideaiq_bot', 'gi'
  ),
  body_ar = regexp_replace(
    regexp_replace(body_ar, 't\.me/theideaclub\M', 't.me/theideaiq_club', 'gi'),
    'TheIdeaDroidBot', 'theideaiq_bot', 'gi'
  )
where concat(body_en, body_ar) ~* 't\.me/theideaclub\M|TheIdeaDroidBot';
