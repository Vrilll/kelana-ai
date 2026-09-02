---
title: Safety and Disruption Runbook
doc_id: KB-OPS-005
owner: KelanaAI Operations
effective: 2026-01-01
review: 2026-04-01
audience: support agents and the KelanaAI assistant
---

# Safety and Disruption Runbook

What KelanaAI does when a trip goes wrong, and the limits of what the assistant
may say.

> This runbook covers KelanaAI's own process. It is not medical, legal or
> insurance advice, and it never overrides an instruction from local authorities.

## 1. Severity levels

| Level | Definition | First response | Owner |
|-------|-----------|----------------|-------|
| S1 | Traveller safety at risk: natural disaster, civil unrest, medical emergency | 15 minutes, 24/7 | On-call duty manager |
| S2 | Trip broken: cancelled flight, closed border, uninhabitable accommodation | 1 hour | Support desk |
| S3 | Trip degraded: delayed transfer, closed attraction, downgraded room | 4 hours | Support desk |
| S4 | Cosmetic: itinerary wording, minor preference change | Next business day | Assistant, self-serve |

The assistant handles S4 alone. It may draft a response for S3 but must offer a
human. It must escalate S1 and S2 to a human immediately and must not attempt to
resolve them itself.

## 2. The S1 script

For anything the traveller describes as an emergency, the assistant does exactly
three things, in this order:

1. Tells the traveller to contact local emergency services first, and gives the
   local emergency number for the country they are in.
2. Gives the KelanaAI 24/7 duty line and says a human will take over.
3. Stops planning. It does not suggest itinerary changes during an S1.

The assistant never assesses a medical situation, never estimates whether a
region is safe to travel to, and never contradicts a government advisory.

## 3. Volcanic and seismic disruption

Relevant to our two largest destinations, Indonesia and Japan.

- When an eruption alert level rises, all itineraries with an activity inside the
  published exclusion zone are suspended, not modified. A designer rebuilds them.
- Ashfall closes airports at short notice. If a departure airport is closed, we
  treat it as an S2 supplier cancellation and the rebooking rules in the service
  policies apply, including the USD 150 absorption cap.
- The assistant must not predict when an airport will reopen, and must not tell a
  traveller a volcano is safe to visit. It points to the national agency:
  Indonesia's PVMBG or Japan's JMA.

## 4. Weather disruption

- Typhoon and cyclone season overlaps our Japan and Philippines routes. A named
  storm forecast to make landfall within the trip window triggers an S2 review of
  the affected days.
- Monsoon rain alone is an S3, not an S2. It degrades a trip; it does not break
  it. Offer indoor alternatives from the destination playbook.
- Flooded roads in Java and Bali are common in wet season. Any itinerary with a
  volcano sunrise or a long overland transfer during an active flood warning gets
  its transfer rebuilt.

## 5. Lost documents

The assistant may explain the general process - contact your embassy, file a
police report, keep a digital copy - and may reschedule the affected days. It may
not:

- advise on whether a replacement will be issued in time,
- contact an embassy on the traveller's behalf,
- promise that a booking will be held while documents are replaced.

Escalate to a human, who can ask suppliers to hold.

## 6. What the traveller is entitled to

Restating the service policy so support does not have to look it up:

- Supplier cancellation: rebooking at no service-fee cost, three alternatives
  within 4 hours, KelanaAI absorbs up to USD 150 per traveller of any price
  increase.
- Delay over 4 hours while travelling: Nomad and Voyager members get the
  remaining itinerary rearranged free. Wanderer members get a regenerated
  itinerary but rebook suppliers themselves.
- KelanaAI factual error that causes a cancellation: full service-fee refund and
  a free replan, regardless of the 24-hour window.

Anything beyond this is a goodwill decision that only a duty manager can make.
The assistant must never offer compensation on its own.

## 7. After the trip

Every S1 and S2 gets a written incident note within 48 hours: what happened, what
we did, what it cost the traveller, what we would change. Notes are reviewed
monthly. If the same failure appears twice in a quarter, the relevant playbook is
updated - which is why the playbooks carry a review date.
