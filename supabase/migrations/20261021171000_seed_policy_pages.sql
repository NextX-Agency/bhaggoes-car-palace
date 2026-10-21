-- Initial website notices. Existing dealership edits take precedence.
insert into public.content_pages (slug, title, body, published, seo_title, seo_description)
values
  (
    'privacy',
    'Privacy policy',
    $privacy$Bhaggoes Car Palace uses this website to show available vehicles and help visitors get in touch. Visitors can browse without creating a customer account or completing an online purchase.

## Contacting us
When you contact the dealership by phone, email or WhatsApp, you choose what information to share. The team uses your message and contact details to answer your question, discuss a vehicle or arrange a visit.

## Saved cars
Cars you save on this website are stored in the browser on your device. They are not attached to a customer account and are not automatically sent to the dealership. You can remove saved cars on the site or clear your browser's local storage.

## Maps and external services
The contact page displays embedded Google Maps. Loading a map connects your browser to Google. Links to WhatsApp, Facebook and TikTok open those services, which have their own privacy practices.

## Your questions
For questions about information you shared with Bhaggoes Car Palace, contact the team through the details on the Contact page.$privacy$,
    true,
    'Privacy Policy',
    'How Bhaggoes Car Palace handles website browsing and contact information.'
  ),
  (
    'terms',
    'Terms and conditions',
    $terms$This website helps visitors browse vehicles and contact Bhaggoes Car Palace. Browsing the website does not reserve a vehicle, create a purchase agreement or complete a payment.

## Vehicle listings
Photos, specifications, mileage, condition, prices and availability are provided to help you compare vehicles. Listing details may change. Please confirm the current details and inspect the vehicle with the dealership before making a purchase decision.

## Prices and financing
Vehicle prices are shown in USD unless a listing says otherwise. Financing figures and examples on the website are general information, not an approval or final offer. The available options and final terms depend on the vehicle and, where applicable, the lender. Ask the dealership to confirm the full terms before you commit.

## External services
Links to WhatsApp and social platforms, and the Google Maps display, are provided for convenience. Those services have their own terms and policies.

## Questions
Contact Bhaggoes Car Palace using the details on the Contact page if you have a question about a listing or this website.$terms$,
    true,
    'Terms and Conditions',
    'Website terms for browsing vehicles at Bhaggoes Car Palace.'
  )
on conflict (slug) do nothing;
