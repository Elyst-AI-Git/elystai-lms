-- One open ("created") payment per enrollment at a time. Without this, two
-- concurrent checkout requests for the same enrollment (double-click, two
-- tabs) can both pass the "reuse existing pending payment" check before
-- either has written its row, and both mint a separate Razorpay order. The
-- partial unique index makes the loser's insert fail with 23505, which the
-- order route catches and turns into "fetch and return the winner's order"
-- instead of a duplicate order.
create unique index if not exists payments_one_open_per_enrollment
  on app.payments (enrollment_id)
  where status = 'created';
