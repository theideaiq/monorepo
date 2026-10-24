-- A new order status for cash payments: `confirmed`, an order accepted
-- without an online payment (cash on delivery or at pickup). It is added in
-- its own migration because Postgres can't use a new enum value in the
-- transaction that adds it; 20261120000160_delivery.sql uses it.

alter type public.order_status add value if not exists 'confirmed' after 'pending';
