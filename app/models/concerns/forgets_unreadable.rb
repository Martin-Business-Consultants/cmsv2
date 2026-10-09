# frozen_string_literal: true

# For a record with an encrypted attribute this install's keys can't read (a
# site moved from another install without its keys): saving a new value
# reads the old one to see what changed, and that raises. So the unreadable
# value is cleared in the table first, and the save carries on as for a
# record that never had one.
#
#   def rotate!
#     forget_unreadable(:token)
#     update!(token: ...)
#   end
module ForgetsUnreadable
  extend ActiveSupport::Concern

  def forget_unreadable(attribute)
    public_send(attribute)
  rescue ActiveRecord::Encryption::Errors::Decryption
    self.class.where(id: id).update_all(attribute => nil)
    reload
  end
end
