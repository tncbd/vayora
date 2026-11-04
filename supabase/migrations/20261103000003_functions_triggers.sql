-- VAYORA FASHION — 0003 functions and triggers
-- All SECURITY DEFINER functions pin search_path and fully qualify names.

-- ---------- role helpers ----------
create or replace function public.has_any_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = any (roles)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid());
$$;

-- ---------- new user -> profile (never grants roles) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
begin
  if v_phone is not null and v_phone !~ '^01[3-9][0-9]{8}$' then
    v_phone := null; -- never let a bad value block sign-up
  end if;
  insert into public.profiles (id, full_name, phone)
  values (new.id, nullif(left(new.raw_user_meta_data ->> 'full_name', 120), ''), v_phone)
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- role safety ----------
-- The last super admin can never be removed (by anyone, including SQL editor users).
create or replace function public.protect_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') and old.role = 'super_admin'
     and (tg_op = 'DELETE' or new.role <> 'super_admin' or new.user_id <> old.user_id) then
    if not exists (
      select 1 from public.user_roles
      where role = 'super_admin' and id <> old.id
    ) then
      raise exception 'Cannot remove the last super_admin';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger protect_last_super_admin
  before update or delete on public.user_roles
  for each row execute function public.protect_last_super_admin();

create or replace function public.stamp_role_grant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.granted_by := coalesce(auth.uid(), new.granted_by);
  return new;
end
$$;

create trigger stamp_role_grant
  before insert on public.user_roles
  for each row execute function public.stamp_role_grant();

-- ---------- inventory row per variant ----------
create or replace function public.create_inventory_for_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory (variant_id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger create_inventory_for_variant
  after insert on public.product_variants
  for each row execute function public.create_inventory_for_variant();

-- ---------- order numbers: VAY-YYMMDD-00001 (Asia/Dhaka date) ----------
create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'VAY-' || to_char(now() at time zone 'Asia/Dhaka', 'YYMMDD') || '-'
         || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

alter table public.orders
  alter column order_number set default public.generate_order_number();

-- ---------- orders: financial integrity + history ----------
-- Signed-in browser clients (role "authenticated") can never alter money, identity
-- or routing columns, even if they have staff UPDATE access. Server code using the
-- service role, and SQL run by the project owner, are not restricted.
create or replace function public.guard_order_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and (
       new.order_number     is distinct from old.order_number
    or new.tracking_token   is distinct from old.tracking_token
    or new.user_id          is distinct from old.user_id
    or new.subtotal         is distinct from old.subtotal
    or new.discount_total   is distinct from old.discount_total
    or new.delivery_charge  is distinct from old.delivery_charge
    or new.total            is distinct from old.total
    or new.advance_amount   is distinct from old.advance_amount
    or new.cod_amount       is distinct from old.cod_amount
    or new.coupon_id        is distinct from old.coupon_id
    or new.coupon_code      is distinct from old.coupon_code
    or new.delivery_zone_id is distinct from old.delivery_zone_id
    or new.placed_at        is distinct from old.placed_at
  ) then
    raise exception 'Order financial and identity fields are immutable from the client';
  end if;
  return new;
end
$$;

create trigger guard_order_changes
  before update on public.orders
  for each row execute function public.guard_order_changes();

create or replace function public.record_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end
$$;

create trigger record_order_status_insert
  after insert on public.orders
  for each row execute function public.record_order_status();
create trigger record_order_status_update
  after update of status on public.orders
  for each row execute function public.record_order_status();

-- ---------- payments: clients cannot change verification state ----------
create or replace function public.guard_payment_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Inside verify_payment() (SECURITY DEFINER) current_user is the function owner;
  -- a direct client UPDATE runs as the API role, which cannot be spoofed.
  if current_user in ('authenticated', 'anon') then
    raise exception 'Payments can only be verified or rejected through verify_payment()';
  end if;
  return new;
end
$$;

create trigger guard_payment_changes
  before update on public.payments
  for each row execute function public.guard_payment_changes();

-- ---------- admin activity log ----------
create or replace function public.log_admin_action(
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_details jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Not authorised';
  end if;
  insert into public.admin_activity_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), left(p_action, 120), left(p_entity_type, 60), left(p_entity_id, 120), coalesce(p_details, '{}'));
end
$$;

-- ---------- manual payment verification (the only path to "verified") ----------
create or replace function public.verify_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments;
begin
  if not public.has_any_role('super_admin', 'admin', 'payment_manager') then
    raise exception 'Not authorised';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if v_pay.status <> 'submitted' then
    raise exception 'Only submitted payments can be verified or rejected (current: %)', v_pay.status;
  end if;
  if not p_approve and (p_reason is null or length(trim(p_reason)) = 0) then
    raise exception 'A rejection reason is required';
  end if;

  if p_approve then
    update public.payments
       set status = 'verified', verified_by = auth.uid(), verified_at = now(), rejection_reason = null
     where id = p_payment_id;
    update public.orders
       set status = 'confirmed'
     where id = v_pay.order_id and status = 'pending_payment_verification';
  else
    update public.payments
       set status = 'rejected', verified_by = auth.uid(), verified_at = now(),
           rejection_reason = left(trim(p_reason), 500)
     where id = p_payment_id;
  end if;

  insert into public.admin_activity_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(),
          case when p_approve then 'payment.verified' else 'payment.rejected' end,
          'payment', p_payment_id::text,
          jsonb_build_object('order_id', v_pay.order_id, 'amount', v_pay.amount, 'reason', p_reason));
end
$$;

-- ---------- stock (server-side only: Edge Functions with the service role) ----------
create or replace function public.reserve_stock(p_variant_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be positive'; end if;
  update public.inventory
     set reserved = reserved + p_qty
   where variant_id = p_variant_id and quantity - reserved >= p_qty;
  if not found then
    raise exception 'Insufficient stock for variant %', p_variant_id;
  end if;
end
$$;

create or replace function public.release_stock(p_variant_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be positive'; end if;
  update public.inventory set reserved = greatest(reserved - p_qty, 0) where variant_id = p_variant_id;
end
$$;

-- Permanently deduct (e.g. when an order ships): consumes the reservation.
create or replace function public.commit_stock(p_variant_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_qty is null or p_qty <= 0 then raise exception 'Quantity must be positive'; end if;
  update public.inventory
     set quantity = quantity - p_qty, reserved = reserved - p_qty
   where variant_id = p_variant_id and reserved >= p_qty and quantity >= p_qty;
  if not found then
    raise exception 'Cannot commit % units for variant %', p_qty, p_variant_id;
  end if;
end
$$;

-- ---------- function privileges ----------
revoke execute on function public.reserve_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.release_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.commit_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_stock(uuid, integer) to service_role;
grant execute on function public.release_stock(uuid, integer) to service_role;
grant execute on function public.commit_stock(uuid, integer) to service_role;

revoke execute on function public.verify_payment(uuid, boolean, text) from public, anon;
grant execute on function public.verify_payment(uuid, boolean, text) to authenticated;
revoke execute on function public.log_admin_action(text, text, text, jsonb) from public, anon;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;
