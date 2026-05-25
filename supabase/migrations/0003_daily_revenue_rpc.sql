-- Daily revenue series for the dashboard, scoped to the caller's branches.
-- Mirrors bearhouse_branch_kpis: SECURITY DEFINER (runs as postgres/BYPASSRLS),
-- search_path locked, EXECUTE granted only to authenticated.
create or replace function public.bearhouse_daily_revenue(
  p_from date default ((now() - interval '30 days'))::date,
  p_to   date default (now())::date
)
returns table(day date, net_revenue numeric, bills bigint, member_bills bigint)
language sql stable security definer set search_path to 'public'
as $$
  select
    b.payment_date::date as day,
    coalesce(sum(b.net_paid), 0) as net_revenue,
    count(*) as bills,
    count(*) filter (where coalesce(b.cus_crm_member_id, '') <> '') as member_bills
  from public.bill_detail_data b
  join public.branch br on br.branch_name = b.store_name
  where br.branch_ref in (select public.authorized_branches())
    and b.payment_date::date between p_from and p_to
    and coalesce(b.void, '') <> 'true'
  group by b.payment_date::date
  order by day;
$$;

revoke all on function public.bearhouse_daily_revenue(date, date) from public;
grant execute on function public.bearhouse_daily_revenue(date, date) to authenticated;
