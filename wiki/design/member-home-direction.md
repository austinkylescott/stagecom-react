# Member Home direction

Documentation status: active

Implementation status: Exploratory — selected prototype direction; production implementation pending.

## STA-64 review decision

On September 29, 2026, the reviewer selected **A — Priorities then discovery** from the Member journey prototype. The personal Home presents:

- A dedicated area for responses the person needs to give.
- Their upcoming commitments.
- Their Theater, or Theaters, alongside the personal work.
- Published Event discovery below.

Home always means the person's Callsheet. Theater landing pages use the actual Theater name in navigation, rather than a competing “Theater home” label. Calendar, Events, and People are visibly scoped to that Theater.

Prioritize the one-Theater case. Multiple memberships remain supported, but should not drive the common layout. This reflects reviewer guidance, not measured membership statistics.

B (Daybook) was rejected because the resulting timeline design did not work. C (Theater portal) was rejected because it felt more cramped than A. Both remain available in the throwaway prototype for comparison.

## Evidence and limits

See [the STA-64 prototype and review record](../../src/features/member-journey-prototype/README.md). This decision selects the Home structure and navigation language. It does not validate every destination, specify avatar-based casting, or authorize shipping the prototype as production code.
