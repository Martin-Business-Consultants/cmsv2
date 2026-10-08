# frozen_string_literal: true

# Every live page, entry and global, or what changed since `since`
# (ContentSnapshot). With `full: true`, replace what you have; otherwise
# apply `data` and drop `removed`. Read again with ?since=<meta.cursor>.
json.data do
  json.pages @pages, partial: "api/v1/pages/page", as: :page
  json.entries @entries, partial: "api/v1/entries/entry", as: :entry
  json.globals @globals, partial: "api/v1/globals/global", as: :global
  json.removed @snapshot.removed
end
json.meta({cursor: @snapshot.cursor, full: @snapshot.full?, since: @snapshot.since&.utc&.iso8601(6)})
json.partial! "api/v1/shared/included", assets: @assets
