-- Migration: Fix and assign proper categories for products
-- Ensures categories exist for store 'haidar' (ec7fc781-774b-446f-aafc-f2d62c0309ae)
-- and store 'demo' (29e4fdf6-f3d5-4ce1-a196-8bc97ee75acf)

DO $$
DECLARE
  v_store_id UUID := 'ec7fc781-774b-446f-aafc-f2d62c0309ae';
  v_cat_kemeja UUID;
  v_cat_dress UUID;
  v_cat_tas UUID;
BEGIN
  -- 1. Ensure Kemeja Pria category exists
  SELECT id INTO v_cat_kemeja FROM categories WHERE store_id = v_store_id AND name ILIKE 'Kemeja Pria' LIMIT 1;
  IF v_cat_kemeja IS NULL THEN
    INSERT INTO categories (store_id, name, sort_order)
    VALUES (v_store_id, 'Kemeja Pria', 1)
    RETURNING id INTO v_cat_kemeja;
  END IF;

  -- 2. Ensure Dress Wanita category exists
  SELECT id INTO v_cat_dress FROM categories WHERE store_id = v_store_id AND name ILIKE 'Dress Wanita' LIMIT 1;
  IF v_cat_dress IS NULL THEN
    INSERT INTO categories (store_id, name, sort_order)
    VALUES (v_store_id, 'Dress Wanita', 2)
    RETURNING id INTO v_cat_dress;
  END IF;

  -- 3. Ensure Aksesoris & Tas category exists
  SELECT id INTO v_cat_tas FROM categories WHERE store_id = v_store_id AND name ILIKE 'Aksesoris & Tas' LIMIT 1;
  IF v_cat_tas IS NULL THEN
    INSERT INTO categories (store_id, name, sort_order)
    VALUES (v_store_id, 'Aksesoris & Tas', 3)
    RETURNING id INTO v_cat_tas;
  END IF;

  -- 4. Update the 3 products to their respective correct categories
  UPDATE products
  SET category_id = v_cat_dress
  WHERE store_id = v_store_id AND (name ILIKE '%dress%' OR id = '354c0bc6-bfc6-4f3a-b652-5a1dc574c4d5');

  UPDATE products
  SET category_id = v_cat_kemeja
  WHERE store_id = v_store_id AND (name ILIKE '%kemeja%' OR id = '6f4ee73a-7b63-4a00-934e-61a685e96a5e');

  UPDATE products
  SET category_id = v_cat_tas
  WHERE store_id = v_store_id AND (name ILIKE '%tas%' OR id = '49629b30-df5e-4334-a7f5-f59392001ac8');
END $$;
