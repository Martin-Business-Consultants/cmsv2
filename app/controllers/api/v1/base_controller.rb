# frozen_string_literal: true

# The delivery API, /api/v1: what a site reads to build and serve itself,
# read-only and frozen. It only ever shows what's live, whatever the token —
# a draft never reaches a site — and every answer has one shape:
#
#   {"data": …, "meta": {…}, "included": {"assets": {id => asset}}}
#
# `meta` carries paging on lists ({page, per, total, next_page}) and the
# cursor on /content; `included.assets` is every asset the records point at,
# resolved (MediaLibrary), when there's a media library. Each answer also
# names its cache tags (Cache-Tag), the ones a publish purges.
#
# /api stays the admin's and the CLI's: writes, drafts, management.
class Api::V1::BaseController < Api::BaseController
  enforce_authorization

  MAX_PER = 100

  private

  def paginate(scope)
    @page_number = params[:page].to_i.clamp(1, 100_000)
    @per = (params[:per].presence || 50).to_i.clamp(1, MAX_PER)
    @total = scope.count
    @meta = {page: @page_number, per: @per, total: @total,
             next_page: (@page_number + 1 if @page_number * @per < @total)}
    scope.offset((@page_number - 1) * @per).limit(@per)
  end

  # {id => asset} for the records, merged; nil without a media library.
  def included_assets(pages: [], entries: [], globals: [])
    return unless MediaLibrary.available?

    [MediaLibrary.resolve(:pages, pages), MediaLibrary.resolve(:entries, entries), MediaLibrary.resolve(:globals, globals)]
      .compact.reduce({}, :merge)
  end

  def cache_tags(*tags)
    response.headers["Cache-Tag"] = tags.flatten.compact.uniq.join(",")
  end
end
