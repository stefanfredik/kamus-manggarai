-- Revert to the original RESTRICT behavior on user references.
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submitted_by_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id);

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_reviewed_by_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reported_by_fkey
    FOREIGN KEY (reported_by) REFERENCES users(id);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES users(id);
