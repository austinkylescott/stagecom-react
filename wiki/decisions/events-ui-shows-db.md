# Decision: Events UI, Shows DB

Status: accepted

The rebuild uses Events as the product language while keeping the existing `shows` database table.

This avoids unnecessary schema churn while preserving a broader UI concept that can represent shows, practices, meetings, auditions, and workshops.

Implementation rule: use Events in UI copy and feature naming where it helps product clarity, but keep database references and generated types aligned with the `shows` table until a future migration explicitly changes it.
