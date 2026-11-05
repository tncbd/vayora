-- Removes the optional demo products created by demo_products.sql.
-- Variants, inventory, images and collection links are deleted with them (ON DELETE CASCADE).
-- Past orders keep their item snapshots (order_items.product_id becomes null).
delete from public.products where sku like 'DEMO-%';
