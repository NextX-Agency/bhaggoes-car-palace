alter table public.site_settings
  add column sales_terms jsonb not null default '{
    "benefits": [
      "1 jaar keuring en verzekering",
      "Nieuwe kentekenplaat",
      "Snelle en vlotte afhandeling",
      "Complete servicebeurt",
      "Stoom- en poetsbeurt",
      "Volle tank benzine"
    ],
    "internal_down_percent": 70,
    "internal_max_months": 6,
    "bank_down_percent": 25,
    "trade_in": true,
    "promo_text": "Neem vandaag contact op voor eventuele extra korting."
  }'::jsonb;

update public.site_settings
set financing_notes = null
where financing_notes = 'Interne financiering: 70% aanbetaling, maximaal 6 maanden. Bankfinanciering: vanaf 25% aanbetaling. Inruil mogelijk.';
