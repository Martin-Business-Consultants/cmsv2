# frozen_string_literal: true

# Search across pages and collection entries for the API (POST /api/search,
# cms search): the admin's search index (SearchIndexed), 25 of each, best
# match first, each with a highlighted snippet of where it matched.
class Search
  LIMIT = 25
  SNIPPET = {body: {markers: ["<mark>", "</mark>"], snippet: {words: 12}}}.freeze

  def initialize(query)
    @query = query
  end

  def pages
    hits(Page) do |page|
      {id: page.id, slug: page.slug, title: page.title, status: page.status, locale: page.locale, updated_at: page.updated_at}
    end
  end

  def entries
    hits(CollectionEntry, scope: CollectionEntry.includes(:collection)) do |entry|
      {id: entry.id, slug: entry.slug, collection_slug: entry.collection.slug, title: entry.title, status: entry.status,
       locale: entry.locale, updated_at: entry.updated_at}
    end
  end

  private

  def hits(model, scope: nil)
    model.search(@query, **{scope:}.compact).highlight(**SNIPPET).limit(LIMIT).results.map do |record|
      yield(record).merge(snippet: record.hit.highlight(:body))
    end
  end
end
