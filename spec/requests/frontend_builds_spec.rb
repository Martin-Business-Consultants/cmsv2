# frozen_string_literal: true

require "rails_helper"

# The site's build reporting itself (POST /api/frontend/builds), and what
# Settings › Deploy makes of it: how the site renders, where purges go, the
# secret they're signed with.
RSpec.describe "Frontend builds", type: :request do
  let(:admin) { create(:user) }
  let(:site_token) { {"Authorization" => "Bearer #{create(:user, admin: false, role: create(:role, permissions: %w[pages:read])).api_token.token}"} }

  it "keeps how the site renders, where it takes purges and the content it was built from" do
    post "/api/frontend/builds", params: {integration: "@librepublish/astro", integration_version: "1.0.0", framework: "astro",
      framework_version: "7.0.0", pages: 12, render: "server", webhook_url: "https://acme.test/_cms/webhook",
      content_cursor: "c-2026-10-06T12:00:00Z-41"}, headers: site_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["build"]).to include("render" => "server", "webhook_url" => "https://acme.test/_cms/webhook",
      "content_cursor" => "c-2026-10-06T12:00:00Z-41")
    expect(Frontend.purges?).to be(true)
    expect(Frontend.prerendered?).to be(false)
  end

  it "drops what it doesn't understand rather than refusing the report" do
    post "/api/frontend/builds", params: {render: "edge", webhook_url: "javascript:alert(1)"}, headers: site_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(Frontend.render).to be_nil
    expect(Frontend.purges?).to be(false)
    expect(Frontend.prerendered?).to be(true)
  end

  it "shows it in Settings › Deploy, with the purge secret to reveal and rotate" do
    Frontend.record_build("render" => "server", "webhook_url" => "https://acme.test/_cms/webhook", "integration" => "@librepublish/astro",
      "content_cursor" => "abc123")
    sign_in_as admin

    get settings_deploy_path
    expect(response.body).to include("renders on demand", "https://acme.test/_cms/webhook", "abc123", "CMS_WEBHOOK_SECRET")
    expect(response.body).not_to include(Frontend.purge_secret)

    post settings_deploy_purge_secret_reveal_path
    old = Frontend.purge_secret
    expect(response.body).to include(old)
    expect(AuditLog.last.action).to eq("settings.purge_secret_revealed")

    post settings_deploy_purge_secret_rotation_path
    expect(Frontend.purge_secret).not_to eq(old)
  end

  it "says a static site is rebuilt" do
    Frontend.record_build("render" => "static")
    sign_in_as admin

    get settings_deploy_path
    expect(response.body).to include("renders statically, so publishing rebuilds it")
  end
end
