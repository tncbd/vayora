-- Guest payment screenshots. A guest may upload a screenshot only into guest/<their order's secret tracking token>/,
-- only while that order is waiting for its advance payment, at most 3 files per order. The bucket itself already
-- limits type (JPG/PNG/WebP) and size (3 MB). Files stay private: only payment staff and the order's owner can read them.

create or replace function public.guest_can_upload_proof(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(coalesce(p_path, ''), '/');
begin
  if array_length(parts, 1) is distinct from 3 or parts[1] <> 'guest'
     or parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or parts[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$' then
    return false;
  end if;
  if not exists (
    select 1 from public.orders o
     where o.tracking_token = parts[2]::uuid and o.status = 'pending_payment_verification' and o.advance_amount > 0
       and not exists (select 1 from public.payments p where p.order_id = o.id and p.status in ('submitted', 'verified'))) then
    return false;
  end if;
  return (select count(*) from storage.objects where bucket_id = 'payment-proofs' and name like 'guest/' || parts[2] || '/%') < 3;
end
$$;
revoke all on function public.guest_can_upload_proof(text) from public;
grant execute on function public.guest_can_upload_proof(text) to anon, authenticated;

drop policy if exists "guests upload proof with order token" on storage.objects;
create policy "guests upload proof with order token" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs' and public.guest_can_upload_proof(name));

-- submit_payment: same as Phase 6, but a proof may also be a guest file under the caller's own token
create or replace function public.submit_payment(
  p_order_id uuid, p_tracking_token uuid, p_method public.payment_method_code,
  p_sender text, p_txn text, p_proof_path text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_txn text := upper(trim(coalesce(p_txn, '')));
  v_sender text := trim(coalesce(p_sender, ''));
  v_count integer;
  v_limit integer := coalesce((select (value #>> '{}')::integer from public.site_settings where key = 'payment_resubmission_limit'), 3);
  v_pay public.payments;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not coalesce((p_tracking_token is not null and o.tracking_token = p_tracking_token)
                               or (auth.uid() is not null and o.user_id is not null and o.user_id = auth.uid()), false) then
    raise exception 'Order not found.';
  end if;
  if o.status <> 'pending_payment_verification' or o.advance_amount <= 0 then
    raise exception 'This order is not waiting for an advance payment.';
  end if;
  if exists (select 1 from public.payments where order_id = o.id and status in ('submitted', 'verified')) then
    raise exception 'A payment has already been submitted for this order.';
  end if;
  select count(*) into v_count from public.payments where order_id = o.id;
  if v_count >= v_limit then
    raise exception 'You have reached the maximum number of payment attempts. Please contact us.';
  end if;
  if not exists (select 1 from public.payment_methods where code = p_method and is_enabled and merchant_number is not null) then
    raise exception 'This payment method is not available.';
  end if;
  if v_sender !~ '^01[3-9][0-9]{8}$' then raise exception 'Enter the mobile number you sent the money from.'; end if;
  if v_txn !~ '^[A-Z0-9]{6,40}$' then raise exception 'Enter a valid Transaction ID (letters and numbers, 6-40 characters).'; end if;
  if p_proof_path is not null and not (
       length(p_proof_path) <= 200 and position('..' in p_proof_path) = 0 and (
         (auth.uid() is not null and o.user_id = auth.uid() and p_proof_path like auth.uid()::text || '/%')
         or (p_tracking_token is not null and o.tracking_token = p_tracking_token
             and p_proof_path like 'guest/' || p_tracking_token::text || '/%'
             and exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_proof_path)))) then
    raise exception 'Invalid payment proof.';
  end if;

  begin
    insert into public.payments (order_id, method, amount, status, sender_number, transaction_id, proof_path, attempt, submitted_at)
    values (o.id, p_method, o.advance_amount, 'submitted', v_sender, v_txn, p_proof_path, v_count + 1, now())
    returning * into v_pay;
  exception when unique_violation then
    raise exception 'This Transaction ID has already been used. Please check it and try again.';
  end;
  return jsonb_build_object('payment_id', v_pay.id, 'status', v_pay.status, 'attempt', v_pay.attempt);
end
$$;
revoke all on function public.submit_payment(uuid, uuid, public.payment_method_code, text, text, text) from public;
grant execute on function public.submit_payment(uuid, uuid, public.payment_method_code, text, text, text) to anon, authenticated;
