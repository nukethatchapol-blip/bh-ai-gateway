-- Dashboard insights — three new SECURITY DEFINER RPCs, each scoped by
-- authorized_branches() (so the gateway's branch ACL still applies).
-- All deployed manually via Management API in commit notes.

-- 1. Top promotions in a window — uses the dedicated `promotion` table (one
--    row per bill carrying a promo), not bill_detail_data.
create or replace function public.bearhouse_top_promotions(
  p_from date default ((now() - interval '30 days'))::date,
  p_to   date default (now())::date,
  p_limit int default 8
)
returns table(promotion_name text, bills bigint, total_value numeric)
language sql stable security definer set search_path to 'public'
as $$
  select
    p.promotion_name,
    count(*)::bigint as bills,
    coalesce(sum(p.bill_discounted_price), 0)::numeric as total_value
  from public.promotion p
  join public.branch br on br.branch_name = p.store_name
  where br.branch_ref in (select public.authorized_branches())
    and p.payment_date::date between p_from and p_to
    and coalesce(p.void, '') <> 'true'
    and coalesce(p.promotion_name, '') <> ''
  group by p.promotion_name
  order by bills desc
  limit p_limit;
$$;
revoke all on function public.bearhouse_top_promotions(date, date, int) from public;
grant execute on function public.bearhouse_top_promotions(date, date, int) to authenticated;

-- 2. Top products in a window — `product_data` is the bill-line-item table
--    (menu_name, menu_quantity, discounted_price_net, store_name, payment_dt).
create or replace function public.bearhouse_top_products(
  p_from date default ((now() - interval '30 days'))::date,
  p_to   date default (now())::date,
  p_limit int default 8
)
returns table(menu_name text, category text, qty bigint, net_revenue numeric)
language sql stable security definer set search_path to 'public'
as $$
  select
    p.menu_name,
    max(p.category) as category,
    sum(p.menu_quantity)::bigint as qty,
    coalesce(sum(p.discounted_price_net), 0)::numeric as net_revenue
  from public.product_data p
  join public.branch br on br.branch_name = p.store_name
  where br.branch_ref in (select public.authorized_branches())
    and p.payment_dt::date between p_from and p_to
    and coalesce(p.menu_name, '') <> ''
  group by p.menu_name
  order by net_revenue desc
  limit p_limit;
$$;
revoke all on function public.bearhouse_top_products(date, date, int) from public;
grant execute on function public.bearhouse_top_products(date, date, int) to authenticated;

-- 3. Inventory watch — from the precomputed v_forecast_ingredient_weekly view.
--    Returns SKUs that the forecaster recommends restocking for the user's
--    branches in the most recent forecast week.
create or replace function public.bearhouse_inventory_watch(
  p_limit int default 10
)
returns table(
  inventory_name text,
  unit text,
  branch_name text,
  avg_4wk_qty numeric,
  forecast_qty numeric,
  order_recommend_95 numeric,
  week_start date
)
language sql stable security definer set search_path to 'public'
as $$
  with latest as (
    select max(week_start) as wk from public.v_forecast_ingredient_weekly
  )
  select
    f.inventory_name,
    f.unit,
    f.branch_name,
    f.avg_4wk_qty,
    f.forecast_qty,
    f.order_recommend_95,
    f.week_start
  from public.v_forecast_ingredient_weekly f, latest
  where f.week_start = latest.wk
    and f.branch_name in (
      select br.branch_name from public.branch br
      where br.branch_ref in (select public.authorized_branches())
    )
    and coalesce(f.order_recommend_95, 0) > 0
  order by f.order_recommend_95 desc
  limit p_limit;
$$;
revoke all on function public.bearhouse_inventory_watch(int) from public;
grant execute on function public.bearhouse_inventory_watch(int) to authenticated;
