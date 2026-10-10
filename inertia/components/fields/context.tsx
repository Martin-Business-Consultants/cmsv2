import { createContext, useContext, type ReactNode } from 'react'
import type { BlockTypeOption, CollectionOption } from '#types/content'
import type { Errors } from '~/lib/errors'

type FieldsContextValue = {
  blockTypes: BlockTypeOption[]
  collections: CollectionOption[]
  errors: Errors
}

const FieldsContext = createContext<FieldsContextValue>({
  blockTypes: [],
  collections: [],
  errors: {},
})

export function FieldsProvider({
  blockTypes = [],
  collections = [],
  errors = {},
  children,
}: Partial<FieldsContextValue> & { children: ReactNode }) {
  return (
    <FieldsContext.Provider value={{ blockTypes, collections, errors }}>
      {children}
    </FieldsContext.Provider>
  )
}

export function useFields() {
  return useContext(FieldsContext)
}
