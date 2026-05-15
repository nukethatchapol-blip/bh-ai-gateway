-- Phase 2: scope-aware accessors over production data.
-- SECURITY DEFINER so each function runs with elevated rights, but every
-- function filters by public.authorized_branches() — data outside the
-- caller's scope is never returned. Production tables stay untouched.

create or replace function public.my_branches()
returns table(id text, name text, region text)
language sql stable security definer set search_path = public as $$
  select branch_ref, branch_name, coalesce(restaurant_name, 'BEARHOUSE')
  from public.branch
  where branch_ref in (select public.authorized_branches());
$$;
revoke all on function public.my_branches() from public;
grant execute on function public.my_branches() to authenticated;

create or replace function public.bearhouse_sales(
  p_from date default null,
  p_to   date default null,
  p_branch_ref text default null
)
returns table(
  payment_date timestamptz,
  branch_ref   text,
  store_name   text,
  net_paid     numeric,
  sub_amount   numeric,
  bill_discounted_price numeric,
  order_type   text,
  payment_type text,
  promotion_name text
)
language sql stable security definer set search_path = public as $$
  select
    b.payment_date, br.branch_ref, b.store_name,
    b.net_paid, b.sub_amount, b.bill_discounted_price,
    b.order_type, b.payment_type, b.promotion_name
  from public.bill_detail_data b
  left join public.branch br on br.branch_name = b.store_name
  where
    br.branch_ref in (select public.authorized_branches())
    and (p_from is null or b.payment_date::date >= p_from)
    and (p_to   is null or b.payment_date::date <= p_to)
    and (p_branch_ref is null or br.branch_ref = p_branch_ref);
$$;
revoke all on function public.bearhouse_sales(date, date, text) from public;
grant execute on function public.bearhouse_sales(date, date, text) to authenticated;

create or replace function public.bearhouse_branch_kpis(
  p_from date default (now() - interval '30 days')::date,
  p_to   date default now()::date
)
returns table(
  branch_ref text,
  branch_name text,
  bills      bigint,
  net_revenue numeric,
  avg_ticket  numeric
)
language sql stable security definer set search_path = public as $$
  select
    br.branch_ref, br.branch_name,
    count(*) as bills,
    coalesce(sum(b.net_paid), 0),
    coalesce(avg(b.net_paid), 0)
  from public.bill_detail_data b
  join public.branch br on br.branch_name = b.store_name
  where
    br.branch_ref in (select public.authorized_branches())
    and b.payment_date::date between p_from and p_to
    and coalesce(b.void, '') <> 'true'
  group by br.branch_ref, br.branch_name
  order by 4 desc;
$$;
revoke all on function public.bearhouse_branch_kpis(date, date) from public;
grant execute on function public.bearhouse_branch_kpis(date, date) to authenticated;

create or replace function public.bearhouse_inventory()
returns table(inventory_id text, inventory_name text, target_stock text, threshold text)
language sql stable security definer set search_path = public as $$
  select inventory_id, inventory_name, target_stock, threshold from public.inventory;
$$;
revoke all on function public.bearhouse_inventory() from public;
grant execute on function public.bearhouse_inventory() to authenticated;

create or replace function public.bearhouse_goods_issue(
  p_from date default (now() - interval '14 days')::date
)
returns table(
  branch_ref text, branch_name text,
  inventory_code text, inventory_name text,
  movements bigint
)
language sql stable security definer set search_path = public as $$
  select g.branch_ref, g.branch_name, g.inventory_code, g.inventory_name, count(*)
  from public.goods_issue g
  where
    g.branch_ref in (select public.authorized_branches())
    and (g.posting_date is null or g.posting_date::date >= p_from)
  group by 1,2,3,4;
$$;
revoke all on function public.bearhouse_goods_issue(date) from public;
grant execute on function public.bearhouse_goods_issue(date) to authenticated;
