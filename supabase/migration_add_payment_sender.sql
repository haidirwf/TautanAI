-- Migration: Add payment_sender_name and payment_sender_account to orders table
-- Run this in your Supabase SQL Editor if not already executed.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_sender_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_sender_account TEXT DEFAULT '';
