# Single transferable Theater Owner

Each Theater has exactly one Owner, while Owner and Admin independently grant Theater Operator authority. Owners and Admins may appoint or remove Admins, but only an ownership transfer accepted by another active Theater Member can replace the Owner; that transfer explicitly leaves the former Owner as an Admin or Member, defaulting to Admin. This keeps routine administration easy to delegate while preserving one accountable final authority.

An Admin Invitation grants no authority while pending. The invited Member must
accept; decline leaves base membership intact. Owner and Admin may remove an
Admin, while an Admin may also relinquish their own authority. Removal never
changes the Owner relationship and takes effect for subsequent private reads
and commands. The current Owner retains authority until an ownership transfer
is accepted, and governance changes remain factual Theater history.
