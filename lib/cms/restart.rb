# frozen_string_literal: true

module Cms
  # Restarts this install so it boots on changed code: a plugin installed,
  # updated or removed (PluginChange). A few seconds later, so the request or
  # job that asked has finished: it migrates (an installed plugin's tables),
  # then asks Puma to restart (its tmp_restart plugin), in a Docker container
  # as anywhere else. A plugin's stylesheets compile as it boots
  # (config/initializers/installed_plugins.rb).
  module Restart
    extend self

    def later(delay: 5)
      log = Rails.root.join("log/restart.log").to_s
      Bundler.with_unbundled_env do
        pid = Process.spawn("/bin/bash", "-c", %(sleep #{Integer(delay)}; bin/rails db:migrate && bin/rails restart),
          chdir: Rails.root.to_s, pgroup: true, in: File::NULL, out: log, err: [:child, :out])
        Process.detach(pid)
      end
    end
  end
end
