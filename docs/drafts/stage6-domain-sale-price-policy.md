# Stage 6 draft domain sale price policy

Owner target: at least IDR 25,000 remaining after direct transaction costs, replacing the previous IDR 35,000 target. This is not a claim about company net profit after all operating costs or income tax.

The pure draft calculator is not imported by the Worker, search UI, quote router, checkout or billing. It performs no network calls, writes, purchases or payment requests. Live registrar costs, FX and payment fees are not configured by this commit.

All inputs must be supplied explicitly in whole rupiah, except paymentRateBps, which uses integer basis points (100 bps = 1%). Registrar cost must be positive. A zero fee is accepted only when explicitly provided, not assumed from missing data. USD quotes cannot be passed directly. Verified currency conversion belongs in a separate server-side step.

Fee model: fixed payment cost plus the ceiling of sale price times rate / 10,000. This is an illustrative model, not a declaration of any Midtrans fee schedule. Only use it where the actual payment contract, fee taxes and rounding can be conservatively represented. Include all other direct costs and applicable tax/FX costs in the supplied costs without double counting. If the real fee model or costs cannot be established, do not activate a price. Pass-through taxes that vary with the sale price need separate explicit handling; they must not be guessed as a fixed zero.

The calculator grosses up percentage fees, rounds upward by the supplied rupiah increment, recomputes the fee and asserts the target margin. BigInt arithmetic avoids floating-point fee rounding. Invalid, missing, negative, fractional and out-of-range inputs are rejected. Output is capped at IDR 1 trillion, marked indicative, costVerification not_performed and purchaseAllowed false. It is not a signed/redeemable quote.

Registration and renewal need independent verified cost inputs; this policy does not establish renewal/transfer API support or .co.id coverage. No per-method buyer surcharge is authorized by this draft.

Evidence: 12 local tests passed, including one 72-combination sweep. Test amounts and rates are fixtures only. Not a live margin, checkout, provider or production acceptance test.

Run: node --test tests/domain-sale-price-policy.test.mjs

Existing stage 6 and release holds remain; no merge to main or activation of transactions is authorized.
