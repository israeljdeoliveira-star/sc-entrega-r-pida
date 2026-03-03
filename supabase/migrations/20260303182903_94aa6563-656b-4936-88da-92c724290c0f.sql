
-- Add car additionals and multi-trip discount fields to freight_settings
ALTER TABLE public.freight_settings
  ADD COLUMN IF NOT EXISTS car_min_value numeric NOT NULL DEFAULT 98.00,
  ADD COLUMN IF NOT EXISTS car_fee_helper numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS car_fee_stairs numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS car_fee_no_elevator numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS car_fee_bubble_wrap numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS car_fee_fragile numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multi_trip_discount_pct numeric NOT NULL DEFAULT 0;
