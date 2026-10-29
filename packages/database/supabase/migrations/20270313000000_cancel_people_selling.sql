-- People selling is cancelled (the owner, 30 October 2026): a person who
-- wants to sell joins Partners as an individual trader shop (the owner's ID
-- only, a monthly sales limit) instead. This removes everything
-- `20270311000000_member_listings.sql` added; no code ever used it.

drop policy "Sellers upload photos of their listings" on storage.objects;
drop policy "Listing photos while they can be seen" on storage.objects;
drop policy "Sellers delete photos of their listings" on storage.objects;

drop function public.create_member_listing(text, public.product_condition, text, text[], text, bigint, boolean, uuid);
drop function private.create_member_listing(text, public.product_condition, text, text[], text, bigint, boolean, uuid);
drop function public.update_member_listing(uuid, bigint, boolean, text);
drop function private.update_member_listing(uuid, bigint, boolean, text);
drop function public.remove_member_listing(uuid);
drop function private.remove_member_listing(uuid);
drop function public.renew_member_listing(uuid);
drop function private.renew_member_listing(uuid);
drop function public.member_listings_for_sale(uuid, text, text);
drop function private.member_listings_for_sale(uuid, text, text);
drop function public.member_listing(bigint);
drop function private.member_listing(bigint);
drop function public.my_member_deals();
drop function private.my_member_deals();
drop function public.buy_member_listing(uuid, bigint, text);
drop function private.buy_member_listing(uuid, bigint, text);
drop function public.withdraw_member_deal(uuid);
drop function private.withdraw_member_deal(uuid);
drop function public.answer_member_deal(uuid, boolean);
drop function private.answer_member_deal(uuid, boolean);
drop function public.finish_member_deal(uuid, boolean);
drop function private.finish_member_deal(uuid, boolean);
drop function public.send_member_message(uuid, text);
drop function private.send_member_message(uuid, text);
drop function public.take_down_member_listing(uuid, text);
drop function private.take_down_member_listing(uuid, text);
drop function public.sweep_member_listings();
drop function private.sweep_member_listings();
drop function private.end_member_deals(public.member_listings);
drop function private.member_trade_problem(uuid, boolean);
drop function private.can_see_listing_photo(text);

drop table public.member_messages;
drop table public.member_deals;
drop table public.member_listings;

drop type public.member_deal_status;
drop type public.member_listing_status;

-- The bucket is empty unless someone listed in the minutes it existed.
set local storage.allow_delete_query = 'true';
delete from storage.objects where bucket_id = 'member-listing-photos';
delete from storage.buckets where id = 'member-listing-photos';
