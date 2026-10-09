# frozen_string_literal: true

# Search across pages and collection entries (Search, on the admin's search
# index).
class Api::SearchesController < Api::BaseController
  def create
    @query = params.require(:q).to_s.strip
    if @query.empty?
      render json: {error: "q is required"}, status: :bad_request
    else
      @search = Search.new(@query)
    end
  end
end
