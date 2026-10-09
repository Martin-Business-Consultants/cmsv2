# frozen_string_literal: true

# GET /api/v1/content[?since=<cursor>] — every live page, entry and global, or
# what changed since a previous read's cursor (ContentSnapshot). Pages need
# pages:read; entries and globals come only with entries:read and
# globals:read.
class Api::V1::ContentsController < Api::V1::BaseController
  requires_capability "pages:read", only: :show

  def show
    @snapshot = ContentSnapshot.new(since: ContentSnapshot.parse_cursor(params[:since]))
    @pages = @snapshot.pages
    # Entries and globals only for a token that reads them; the site's own
    # (Production site) reads all three.
    @entries = granted?("entries:read") ? @snapshot.entries : []
    @globals = granted?("globals:read") ? @snapshot.globals : []
    @removed = @snapshot.removed
    @removed = @removed.merge(entries: []) unless granted?("entries:read")
    @removed = @removed.merge(globals: []) unless granted?("globals:read")
    @assets = included_assets(pages: @pages, entries: @entries, globals: @globals)
    cache_tags("content")
  end
end
