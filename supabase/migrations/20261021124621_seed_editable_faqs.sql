-- These are content records, not frontend defaults. The owner can edit, unpublish,
-- reorder, or delete every question in Admin > Content.
insert into public.faq_items (question, answer, sort_order, published)
select seed.question, seed.answer, seed.sort_order, true
from (values
  ('Are the cars shown online still available?', 'Availability can change. Open the car you like and ask our team to confirm before you visit.', 10),
  ('Can I see a car in person?', 'Yes. Find our locations and directions on the Contact page. Tell us which car you want to see so we can confirm it is there.', 20),
  ('How do I ask about a specific car?', 'Use the WhatsApp button on its detail page. It includes a link to the car, so our team knows which listing you mean.', 30),
  ('What financing options are available?', 'See the options currently listed on our Financing page. Our team can confirm the terms for a particular car; bank approval is decided by the lender.', 40),
  ('Can I trade in my current car?', 'Ask our team whether a trade-in is possible for the car you are considering and how an assessment works.', 50),
  ('Why do some cars show two prices?', 'A listing may show separate in-house and cash prices. Ask our team to confirm the current price and payment terms before you decide.', 60)
) as seed(question, answer, sort_order)
where not exists (select 1 from public.faq_items);
