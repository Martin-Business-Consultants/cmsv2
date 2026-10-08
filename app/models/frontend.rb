# frozen_string_literal: true

# The frontend this headless CMS serves, as far as the CMS knows it: where the
# site lives and its repo (Settings › General and › GitHub), and what its
# build last reported (POST /api/frontend/builds, sent by the Astro
# integration): which integration, how it renders, where it takes cache
# purges, and which content it was built from. Read by the Developers screen,
# the dashboard, Settings › Deploy — and Deploys, which rebuilds a site that
# renders statically and purges one that renders on demand.
module Frontend
  SETTING = "frontend"

  # Astro's output: every page built ahead ("static"), every page rendered
  # on request ("server"), or some of each ("hybrid": prerendered routes need
  # a rebuild, the rest a purge).
  RENDERS = %w[static server hybrid].freeze

  module_function

  # The build's report, kept as the last build. Unknown values are dropped
  # rather than refused: a newer integration may send more than this knows.
  def record_build(report)
    build = report.slice("integration", "integration_version", "framework", "framework_version", "site_url")
      .transform_values { it.to_s.first(100) }.compact_blank
    build["pages"] = report["pages"].to_i if report["pages"].present?
    build["duration_ms"] = report["duration_ms"].to_i if report["duration_ms"].present?
    build["render"] = report["render"].to_s.presence_in(RENDERS)
    build["webhook_url"] = web_url(report["webhook_url"])
    build["content_cursor"] = report["content_cursor"].to_s.first(200).presence
    build.compact!
    build["built_at"] = Time.current.iso8601
    Setting.set(SETTING, {"last_build" => build})
    Event.record("frontend.built", **build.symbolize_keys.except(:built_at, :webhook_url))
    build
  end

  # How the site last said it renders: "static", "server", "hybrid", or nil
  # before an integration has told.
  def render = last_build&.dig(:render)

  # Changes reach visitors only after a build — everything a static site
  # serves, a hybrid site's prerendered routes, and any site that hasn't
  # said how it renders.
  def prerendered? = render != "server"

  # Where a site that renders on demand takes cache purges (the integration's
  # /_cms/webhook); nil for a static site, which has nothing to purge.
  def purge_url
    last_build&.dig(:webhook_url) if %w[server hybrid].include?(render)
  end

  def purges? = purge_url.present?

  # What a purge is signed with (X-CMS-Signature, as webhooks are), and what
  # the site checks it with: its CMS_WEBHOOK_SECRET. Made on first use.
  def purge_secret
    Setting.secret(SETTING, "purge_secret") || rotate_purge_secret
  end

  def rotate_purge_secret
    SecureRandom.hex(32).tap { Setting.set_secret(SETTING, {"purge_secret" => it}) }
  end

  def web_url(value)
    uri = URI.parse(value.to_s.strip)
    uri.to_s.first(500) if uri.is_a?(URI::HTTP) && uri.host.present?
  rescue URI::InvalidURIError
    nil
  end

  # {integration:, integration_version:, framework:, framework_version:,
  #  pages:, built_at: Time, …} or nil when no build has reported.
  def last_build
    build = Setting.get(SETTING)["last_build"]
    return nil unless build.is_a?(Hash) && build["built_at"].present?

    build.symbolize_keys.merge(built_at: Time.zone.parse(build["built_at"]))
  end

  def connected? = last_build.present?

  def site_url = Setting.get("general")["site_base_url"].presence

  def repo = Setting.get("github")["frontend_github_repo"].presence

  # The tokens that used the API lately — people's (the CLI, MCP, scripts)
  # and service tokens (the site's build, jobs) — newest first, for the
  # dashboard: this CMS is mostly driven through them.
  # [{name:, kind: "personal" | "service", last_used_at:}, …]
  def recent_api_use(since: 7.days.ago, limit: 6)
    people = ApiToken.includes(:user).where(last_used_at: since..).map do |token|
      {name: token.user&.name.presence || token.user&.email || "Someone", kind: "personal", last_used_at: token.last_used_at}
    end
    services = ServiceToken.active.where(last_used_at: since..).map do |token|
      {name: token.name, kind: "service", last_used_at: token.last_used_at}
    end
    (people + services).sort_by { -it[:last_used_at].to_i }.first(limit)
  end
end
