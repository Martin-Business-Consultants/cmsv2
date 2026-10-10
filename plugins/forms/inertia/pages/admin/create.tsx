import { Head } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import FormEditor from '../../components/form_editor'
import type { EmailKind, FormEmailData } from '../../../app/types'

type Props = InertiaProps<{
  emails: Record<EmailKind, FormEmailData>
  defaultRecipients: string | null
}>

export default function FormsCreate({ emails, defaultRecipients }: Props) {
  return (
    <>
      <Head title="New form" />
      <PageHeader title="New form" back={{ href: '/admin/forms', label: 'Forms' }} />
      <FormEditor
        initial={{
          title: '',
          slug: '',
          status: 'draft',
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: true },
          ],
          submitLabel: 'Submit',
          successMessage: 'Thanks, your message has been sent.',
          submitUrl: '',
          webhookUrl: '',
          emails: {
            notification: { ...emails.notification, enabled: true, fromField: 'email' },
            confirmation: { ...emails.confirmation, fromField: 'email' },
          },
        }}
        action="/admin/forms"
        method="post"
        submitLabel="Create form"
        defaultRecipients={defaultRecipients}
      />
    </>
  )
}
