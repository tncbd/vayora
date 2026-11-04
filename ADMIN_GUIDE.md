# Admin Guide

**Status: access control only (Phase 3). Management screens arrive in Phases 4-8.**

## Signing in
1. Open `/login` and sign in with a staff account.
2. Open `/admin` (or My Account -> Admin). Visitors are sent to sign-in; signed-in customers without a role see "No access".

## Roles
| Role | Area |
|---|---|
| Super Admin | Everything, including admin users and roles |
| Admin | All content, catalogue, orders, payments, settings (not roles) |
| Order Manager | Orders, customers |
| Product Manager | Products, categories, variants, inventory |
| Payment Manager | Payment verification, payment settings |

The dashboard lists only the sections your role can use. These limits are enforced in the database, not just the screen.

## Granting a role (Super Admin, until the Phase 8 screen exists)
```sql
insert into public.user_roles (user_id, role)
select id, 'order_manager' from auth.users where email = 'staff@example.com';
```
Valid roles: `super_admin`, `admin`, `order_manager`, `product_manager`, `payment_manager`. The last Super Admin cannot be removed.
