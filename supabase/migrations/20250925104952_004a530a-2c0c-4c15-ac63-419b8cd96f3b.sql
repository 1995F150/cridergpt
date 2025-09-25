-- Update the lifetime plan price to $100.00
UPDATE plan_configurations 
SET 
  price_monthly = 100.00,
  stripe_price_id = 'price_1SAGoNP90uC07RqGhogvN43V'
WHERE plan_name = 'lifetime';