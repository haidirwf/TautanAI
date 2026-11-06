-- ==============================================================================
-- Migration: AI WhatsApp Copilot Order Status & Payment Verification RPC
-- Purpose: Safely allow serverless AI WhatsApp bot to query recent orders
--          and transition order statuses to PAID / CANCELLED via SECURITY DEFINER.
-- Safe for public repository (zero credentials or sensitive keys included).
-- ==============================================================================

-- 1. Allow status update of pending orders by AI / customer payment confirmation
DROP POLICY IF EXISTS "Allow AI order updates" ON orders;
CREATE POLICY "Allow AI order updates" ON orders
  FOR UPDATE 
  USING (status IN ('PENDING_WA', 'PENDING'))
  WITH CHECK (status IN ('PAID', 'PROCESSING', 'CANCELLED', 'PENDING_WA'));

-- 2. Safe RPC function to update order status by AI WhatsApp Copilot
CREATE OR REPLACE FUNCTION update_order_status_by_ai(
  p_store_id uuid,
  p_order_id uuid DEFAULT NULL,
  p_order_code text DEFAULT '',
  p_buyer_phone text DEFAULT '',
  p_status text DEFAULT 'PAID',
  p_proof_url text DEFAULT '',
  p_notes text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders;
  v_target_id uuid;
  v_target_status text;
  v_clean_code text;
BEGIN
  v_target_status := UPPER(COALESCE(p_status, 'PAID'));
  IF v_target_status NOT IN ('PAID', 'PROCESSING', 'CANCELLED') THEN
    v_target_status := 'PAID';
  END IF;

  v_target_id := p_order_id;
  v_clean_code := TRIM(REPLACE(COALESCE(p_order_code, ''), '#', ''));

  -- 1. Try finding by order_code within store if provided
  IF v_target_id IS NULL AND v_clean_code != '' AND LENGTH(v_clean_code) >= 3 THEN
    SELECT id INTO v_target_id FROM orders
    WHERE store_id = p_store_id
      AND order_code ILIKE ('%' || v_clean_code || '%')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- 2. If not found by code, find latest pending order for this buyer phone
  IF v_target_id IS NULL AND p_buyer_phone != '' THEN
    SELECT id INTO v_target_id FROM orders
    WHERE store_id = p_store_id
      AND (
        buyer_phone = p_buyer_phone 
        OR buyer_phone = ('0' || SUBSTRING(p_buyer_phone FROM 3))
        OR buyer_phone = ('62' || SUBSTRING(p_buyer_phone FROM 2))
      )
      AND status IN ('PENDING_WA', 'PENDING')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Pesanan tidak ditemukan');
  END IF;

  UPDATE orders
  SET 
    status = v_target_status,
    paid_at = CASE WHEN v_target_status = 'PAID' THEN NOW() ELSE paid_at END,
    managed_by_ai = true,
    payment_proof_url = CASE 
      WHEN p_proof_url IS NOT NULL AND p_proof_url != '' THEN p_proof_url 
      ELSE payment_proof_url 
    END,
    seller_internal_note = CONCAT('Status diubah oleh AI WhatsApp: ', COALESCE(p_notes, 'Konfirmasi transfer diterima')),
    updated_at = NOW()
  WHERE id = v_target_id AND store_id = p_store_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Pesanan tidak ditemukan');
  END IF;

  RETURN json_build_object(
    'success', true,
    'order_code', v_order.order_code,
    'status', v_order.status
  );
END;
$$;

-- 3. Safe RPC function to query buyer's recent orders for AI conversation context
CREATE OR REPLACE FUNCTION get_buyer_orders_by_ai(
  p_store_id uuid,
  p_buyer_phone text,
  p_alt_phone text DEFAULT ''
)
RETURNS SETOF orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM orders
  WHERE store_id = p_store_id
    AND (
      buyer_phone = p_buyer_phone 
      OR (p_alt_phone != '' AND buyer_phone = p_alt_phone)
    )
  ORDER BY created_at DESC
  LIMIT 5;
$$;

-- 4. Grant execution permissions
GRANT EXECUTE ON FUNCTION update_order_status_by_ai TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_buyer_orders_by_ai TO anon, authenticated, service_role;
