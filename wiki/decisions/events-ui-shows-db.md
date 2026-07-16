# Decision: Events UI, Shows DB

Status: accepted

Implementation status: implemented

The rebuild uses Events as the product language while keeping the existing `shows` database table.

This avoids unnecessary schema churn while preserving a broader UI concept. The first meaningful milestone focuses on performance Events with Rehearsal and Performance Occurrences; standalone practices, meetings, auditions, and workshops remain later extensions.

Implementation rule: use Events in UI copy and feature naming where it helps product clarity, but keep database references and generated types aligned with the `shows` table until a future migration explicitly changes it.
