-- Allow deleting a user without orphaning or blocking on their authored rows.
-- Published words already survive (words.created_by ON DELETE SET NULL). Here we
-- adjust the remaining user references so a delete cascades or nulls cleanly.

-- submissions.submitted_by is NOT NULL, so it cannot be nulled; a deleted user's
-- submission history is removed with them. Resulting published words are not
-- touched (they live in the words table).
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submitted_by_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_reviewed_by_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- reports keep their content but lose the reporter/resolver reference.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reported_by_fkey
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;
