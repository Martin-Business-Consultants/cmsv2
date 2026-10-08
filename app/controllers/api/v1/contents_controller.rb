# frozen_string_literal: true

# GET /api/v1/content[?since=<cursor>] — every live page, entry and global, or
# what changed since a previous read's cursor (ContentSnapshot).
class Api::V1::ContentsController < Api::V1::BaseController
  requires_capability "pages:read", only: :show

  def show
    @snapshot = ContentSnapshot.new(since: ContentSnapshot.parse_cursor(params[:since]))
    @pages = @snapshot.pages
    @entries = @snapshot.entries
    @globals = @snapshot.globals
    @assets = included_assets(pages: @pages, entries: @entries, globals: @globals)
    cache_tags("content")
  end
end
