# Admin instrument versioning handoff

The admin dashboard treats `standard` as provenance, not as a permanent edit lock. A published definition remains immutable; an administrator maintains it by creating and editing the next draft, submitting that revision for counselor review, and publishing only after at least one approval for the current definition revision. Historical versions and student results remain immutable.

The existing frontend contract uses `POST /admin/assessment-instruments/{instrument_id}/drafts` to create or reopen the next draft and `PUT /admin/assessment-instruments/versions/{version_id}/draft` to save its definition. Preview mode supports this versioned flow for DASS-21. Production currently rejects the save when `instrument_kind` is `standard`, and the current draft payload covers questions and answer options but not the complete metadata, dimension, multiplier, threshold, and source definition.

**Backend must allow creation of a new editable draft version derived from a standard instrument while keeping the published parent immutable.**

The production contract must also:

- copy the published parent definition into the new draft, including metadata, provenance, dimensions, mappings, answer choices, scores, multiplier/configuration, and interpretation thresholds;
- persist those fields atomically for the draft without changing its published parent;
- invalidate an approval whenever the approved definition revision changes;
- require at least one active counselor approval for the current revision before publication;
- keep historical submissions, calculated results, and prior published versions unchanged.
