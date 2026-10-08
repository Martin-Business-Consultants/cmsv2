# frozen_string_literal: true

# A saved version of a page or an entry (PageVersion, CollectionEntryVersion):
# what it holds, and what restoring it would change on the record now, as a
# ContentDiff.
module VersionSnapshot
  extend ActiveSupport::Concern

  # The attributes this version holds, as the record would take them back.
  def snapshot
    self.class::SNAPSHOT_ATTRIBUTES.index_with { public_send(it) }
  end

  # Only the attributes that differ from the record now.
  def changes_from_current
    current = versioned_record.slice(*self.class::SNAPSHOT_ATTRIBUTES)
    changed = snapshot.reject { |key, value| ContentDiff.normalize(value) == ContentDiff.normalize(current[key]) }
    ContentDiff.new(changed, current).call
  end

  def matches_current?
    changes_from_current[:fields].empty?
  end
end
