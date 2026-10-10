/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'drive.fs.serve': {
    methods: ["GET","HEAD"]
    pattern: '/uploads/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/admin/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.challenge': {
    methods: ["GET","HEAD"]
    pattern: '/admin/login/challenge'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['challenge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['challenge']>>>
    }
  }
  'session.verify': {
    methods: ["POST"]
    pattern: '/admin/login/challenge'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').challengeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').challengeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['verify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.cancel': {
    methods: ["POST"]
    pattern: '/admin/login/cancel'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['cancel']>>>
    }
  }
  'signup.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/registrations_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/registrations_controller').default['create']>>>
    }
  }
  'signup.store': {
    methods: ["POST"]
    pattern: '/admin/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/registrations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/registrations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password_reset.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/password-reset'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['create']>>>
    }
  }
  'password_reset.store': {
    methods: ["POST"]
    pattern: '/admin/password-reset'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').passwordResetRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').passwordResetRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password_reset.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/password-reset/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['edit']>>>
    }
  }
  'password_reset.update': {
    methods: ["PUT"]
    pattern: '/admin/password-reset/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').passwordResetValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').passwordResetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'email_verification.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/email-verification/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_verifications_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_verifications_controller').default['show']>>>
    }
  }
  'admin.session.destroy': {
    methods: ["POST"]
    pattern: '/admin/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'admin.dashboard.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/dashboard_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/dashboard_controller').default['show']>>>
    }
  }
  'admin.pages.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['index']>>>
    }
  }
  'admin.pages.bulk': {
    methods: ["POST"]
    pattern: '/admin/pages/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['pages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['pages']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.pages.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['create']>>>
    }
  }
  'admin.pages.store': {
    methods: ["POST"]
    pattern: '/admin/pages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').pageValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/page').pageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.pages.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['edit']>>>
    }
  }
  'admin.pages.update': {
    methods: ["PUT"]
    pattern: '/admin/pages/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').pageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/page').pageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.pages.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/pages/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pages_controller').default['destroy']>>>
    }
  }
  'admin.page_publications.store': {
    methods: ["POST"]
    pattern: '/admin/pages/:id/publication'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/content').publicationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/content').publicationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_publications_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_publications_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.page_publications.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/pages/:id/publication'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_publications_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_publications_controller').default['destroy']>>>
    }
  }
  'admin.page_versions.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages/:id/versions'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_versions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_versions_controller').default['index']>>>
    }
  }
  'admin.page_versions.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages/:id/versions/:versionId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; versionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_versions_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_versions_controller').default['show']>>>
    }
  }
  'admin.page_versions.restore': {
    methods: ["POST"]
    pattern: '/admin/pages/:id/versions/:versionId/restore'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; versionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_versions_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_versions_controller').default['restore']>>>
    }
  }
  'admin.previews.page': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages/:id/preview'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/previews_controller').default['page']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/previews_controller').default['page']>>>
    }
  }
  'admin.page_fields.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pages/:id/fields'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_fields_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_fields_controller').default['show']>>>
    }
  }
  'admin.page_fields.update': {
    methods: ["PUT"]
    pattern: '/admin/pages/:id/fields'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').pageFieldsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/page').pageFieldsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/page_fields_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/page_fields_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.translations.page': {
    methods: ["POST"]
    pattern: '/admin/pages/:id/translations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/taxonomy').translationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/taxonomy').translationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/translations_controller').default['page']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/translations_controller').default['page']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.taxonomy_pools.pages': {
    methods: ["POST"]
    pattern: '/admin/pages/taxonomy-pools'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/taxonomy_pools_controller').default['pages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/taxonomy_pools_controller').default['pages']>>>
    }
  }
  'admin.translations.entry': {
    methods: ["POST"]
    pattern: '/admin/collections/:collectionId/entries/:id/translations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/taxonomy').translationValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/taxonomy').translationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/translations_controller').default['entry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/translations_controller').default['entry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.collections.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['index']>>>
    }
  }
  'admin.collections.bulk': {
    methods: ["POST"]
    pattern: '/admin/collections/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['collections']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['collections']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.collections.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['create']>>>
    }
  }
  'admin.collections.store': {
    methods: ["POST"]
    pattern: '/admin/collections'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/collection').collectionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/collection').collectionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.collections.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['edit']>>>
    }
  }
  'admin.collections.update': {
    methods: ["PUT"]
    pattern: '/admin/collections/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/collection').collectionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/collection').collectionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.collections.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/collections/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/collections_controller').default['destroy']>>>
    }
  }
  'admin.entries.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:collectionId/entries'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { collectionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['index']>>>
    }
  }
  'admin.entries.bulk': {
    methods: ["POST"]
    pattern: '/admin/collections/:collectionId/entries/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: [ParamValue]
      params: { collectionId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['entries']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['entries']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.entries.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:collectionId/entries/new'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { collectionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['create']>>>
    }
  }
  'admin.entries.store': {
    methods: ["POST"]
    pattern: '/admin/collections/:collectionId/entries'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/entry').entryValidator)>>
      paramsTuple: [ParamValue]
      params: { collectionId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/entry').entryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.entries.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:collectionId/entries/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['edit']>>>
    }
  }
  'admin.entries.update': {
    methods: ["PUT"]
    pattern: '/admin/collections/:collectionId/entries/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/entry').entryValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/entry').entryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.entries.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/collections/:collectionId/entries/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entries_controller').default['destroy']>>>
    }
  }
  'admin.entry_publications.store': {
    methods: ["POST"]
    pattern: '/admin/collections/:collectionId/entries/:id/publication'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/content').publicationValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/content').publicationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entry_publications_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entry_publications_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.entry_publications.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/collections/:collectionId/entries/:id/publication'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entry_publications_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entry_publications_controller').default['destroy']>>>
    }
  }
  'admin.entry_versions.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:collectionId/entries/:id/versions'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entry_versions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entry_versions_controller').default['index']>>>
    }
  }
  'admin.entry_versions.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:collectionId/entries/:id/versions/:versionId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue; versionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entry_versions_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entry_versions_controller').default['show']>>>
    }
  }
  'admin.entry_versions.restore': {
    methods: ["POST"]
    pattern: '/admin/collections/:collectionId/entries/:id/versions/:versionId/restore'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue; versionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/entry_versions_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/entry_versions_controller').default['restore']>>>
    }
  }
  'admin.previews.entry': {
    methods: ["GET","HEAD"]
    pattern: '/admin/collections/:collectionId/entries/:id/preview'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { collectionId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/previews_controller').default['entry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/previews_controller').default['entry']>>>
    }
  }
  'admin.globals.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/globals'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['index']>>>
    }
  }
  'admin.globals.bulk': {
    methods: ["POST"]
    pattern: '/admin/globals/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['globals']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['globals']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.globals.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/globals/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['create']>>>
    }
  }
  'admin.globals.store': {
    methods: ["POST"]
    pattern: '/admin/globals'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/global').globalValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/global').globalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.globals.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/globals/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['edit']>>>
    }
  }
  'admin.globals.update': {
    methods: ["PUT"]
    pattern: '/admin/globals/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/global').globalDataValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/global').globalDataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.globals.update_fields': {
    methods: ["PUT"]
    pattern: '/admin/globals/:id/fields'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/global').globalFieldsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/global').globalFieldsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['updateFields']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['updateFields']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.globals.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/globals/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/globals_controller').default['destroy']>>>
    }
  }
  'admin.block_types.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/block-types'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['index']>>>
    }
  }
  'admin.block_types.bulk': {
    methods: ["POST"]
    pattern: '/admin/block-types/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['blockTypes']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['blockTypes']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.block_types.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/block-types/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['create']>>>
    }
  }
  'admin.block_types.store': {
    methods: ["POST"]
    pattern: '/admin/block-types'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/block_type').createBlockTypeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/block_type').createBlockTypeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.block_types.seed': {
    methods: ["POST"]
    pattern: '/admin/block-types/seed'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['seed']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['seed']>>>
    }
  }
  'admin.block_types.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/block-types/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['edit']>>>
    }
  }
  'admin.block_types.update': {
    methods: ["PUT"]
    pattern: '/admin/block-types/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/block_type').updateBlockTypeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/block_type').updateBlockTypeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.block_types.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/block-types/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/block_types_controller').default['destroy']>>>
    }
  }
  'admin.lookups.pages': {
    methods: ["GET","HEAD"]
    pattern: '/admin/lookups/pages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['pages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['pages']>>>
    }
  }
  'admin.lookups.entries': {
    methods: ["GET","HEAD"]
    pattern: '/admin/lookups/entries'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['entries']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['entries']>>>
    }
  }
  'admin.markdown_previews.store': {
    methods: ["POST"]
    pattern: '/admin/markdown-preview'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/markdown_previews_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/markdown_previews_controller').default['store']>>>
    }
  }
  'admin.redirects.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/redirects'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['index']>>>
    }
  }
  'admin.redirects.bulk': {
    methods: ["POST"]
    pattern: '/admin/redirects/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['redirects']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['redirects']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.redirects.store': {
    methods: ["POST"]
    pattern: '/admin/redirects'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/redirect').redirectValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/redirect').redirectValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.redirects.update': {
    methods: ["PUT"]
    pattern: '/admin/redirects/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/redirect').redirectValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/redirect').redirectValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.redirects.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/redirects/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redirects_controller').default['destroy']>>>
    }
  }
  'admin.users.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>>
    }
  }
  'admin.users.bulk': {
    methods: ["POST"]
    pattern: '/admin/users/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['users']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['users']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/users/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['create']>>>
    }
  }
  'admin.users.store': {
    methods: ["POST"]
    pattern: '/admin/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').createUserValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').createUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/users/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['edit']>>>
    }
  }
  'admin.users.update': {
    methods: ["PUT"]
    pattern: '/admin/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['destroy']>>>
    }
  }
  'admin.roles.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/roles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['index']>>>
    }
  }
  'admin.roles.bulk': {
    methods: ["POST"]
    pattern: '/admin/roles/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').bulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['roles']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bulk_actions_controller').default['roles']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.roles.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/roles/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['create']>>>
    }
  }
  'admin.roles.store': {
    methods: ["POST"]
    pattern: '/admin/roles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').roleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/role').roleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.roles.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/roles/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['edit']>>>
    }
  }
  'admin.roles.update': {
    methods: ["PUT"]
    pattern: '/admin/roles/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').roleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').roleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.roles.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/roles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['destroy']>>>
    }
  }
  'admin.api_tokens.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings/api-token'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/api_tokens_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/api_tokens_controller').default['show']>>>
    }
  }
  'admin.api_tokens.reveal': {
    methods: ["POST"]
    pattern: '/admin/settings/api-token/reveal'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/api_tokens_controller').default['reveal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/api_tokens_controller').default['reveal']>>>
    }
  }
  'admin.api_tokens.rotate': {
    methods: ["POST"]
    pattern: '/admin/settings/api-token/rotate'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/api_tokens_controller').default['rotate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/api_tokens_controller').default['rotate']>>>
    }
  }
  'admin.service_tokens.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings/service-tokens'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['index']>>>
    }
  }
  'admin.service_tokens.store': {
    methods: ["POST"]
    pattern: '/admin/settings/service-tokens'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/service_token').serviceTokenValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/service_token').serviceTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.service_tokens.reveal': {
    methods: ["POST"]
    pattern: '/admin/settings/service-tokens/:id/reveal'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['reveal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['reveal']>>>
    }
  }
  'admin.service_tokens.rotate': {
    methods: ["POST"]
    pattern: '/admin/settings/service-tokens/:id/rotate'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['rotate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['rotate']>>>
    }
  }
  'admin.service_tokens.revoke': {
    methods: ["POST"]
    pattern: '/admin/settings/service-tokens/:id/revoke'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/service_tokens_controller').default['revoke']>>>
    }
  }
  'admin.api_clients.legacy': {
    methods: ["GET","HEAD"]
    pattern: '/admin/api-clients'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.settings.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['edit']>>>
    }
  }
  'admin.settings.update': {
    methods: ["PUT"]
    pattern: '/admin/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['update']>>>
    }
  }
  'admin.general_settings.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings/general'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/general_settings_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/general_settings_controller').default['edit']>>>
    }
  }
  'admin.general_settings.update': {
    methods: ["PUT"]
    pattern: '/admin/settings/general'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').generalSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').generalSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/general_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/general_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.branding.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings/branding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branding_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branding_controller').default['edit']>>>
    }
  }
  'admin.branding.update': {
    methods: ["PUT"]
    pattern: '/admin/settings/branding'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').brandingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').brandingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branding_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branding_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.languages_settings.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings/languages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/languages_settings_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/languages_settings_controller').default['edit']>>>
    }
  }
  'admin.languages_settings.update': {
    methods: ["PUT"]
    pattern: '/admin/settings/languages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/taxonomy').languagesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/taxonomy').languagesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/languages_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/languages_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.brand_brief.update': {
    methods: ["PUT"]
    pattern: '/admin/settings/brand'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').brandBriefValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').brandBriefValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/brand_brief_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/brand_brief_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.account.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/account'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['edit']>>>
    }
  }
  'admin.account.update': {
    methods: ["PUT"]
    pattern: '/admin/account'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').profileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').profileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.account.email': {
    methods: ["PUT"]
    pattern: '/admin/account/email'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').emailValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').emailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['updateEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['updateEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.account.password': {
    methods: ["PUT"]
    pattern: '/admin/account/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').passwordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').passwordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['updatePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.account.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/account'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').confirmPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').confirmPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/account_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.account.email_verification': {
    methods: ["POST"]
    pattern: '/admin/account/email-verification'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/email_verifications_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/email_verifications_controller').default['store']>>>
    }
  }
  'admin.two_factor.store': {
    methods: ["POST"]
    pattern: '/admin/account/two-factor'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').totpCodeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').totpCodeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/two_factor_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/two_factor_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.two_factor.regenerate': {
    methods: ["POST"]
    pattern: '/admin/account/two-factor/recovery-codes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/two_factor_controller').default['regenerate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/two_factor_controller').default['regenerate']>>>
    }
  }
  'admin.two_factor.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/account/two-factor'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/two_factor_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/two_factor_controller').default['destroy']>>>
    }
  }
  'admin.account_sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/account/sessions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/account_sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/account_sessions_controller').default['destroy']>>>
    }
  }
  'admin.plugins.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/plugins'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/plugins_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/plugins_controller').default['index']>>>
    }
  }
  'admin.plugins.update': {
    methods: ["PUT"]
    pattern: '/admin/plugins/:key'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { key: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/plugins_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/plugins_controller').default['update']>>>
    }
  }
  'admin.audit_logs.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/audit-log'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['index']>>>
    }
  }
  'admin.webhooks.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/webhooks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['index']>>>
    }
  }
  'admin.webhooks.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/webhooks/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['create']>>>
    }
  }
  'admin.webhooks.store': {
    methods: ["POST"]
    pattern: '/admin/webhooks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/webhook').webhookValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/webhook').webhookValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.webhooks.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/webhooks/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['edit']>>>
    }
  }
  'admin.webhooks.update': {
    methods: ["PUT"]
    pattern: '/admin/webhooks/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/webhook').webhookValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/webhook').webhookValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.webhooks.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/webhooks/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['destroy']>>>
    }
  }
  'admin.webhooks.rotate_secret': {
    methods: ["POST"]
    pattern: '/admin/webhooks/:id/secret'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['rotateSecret']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['rotateSecret']>>>
    }
  }
  'admin.webhooks.test': {
    methods: ["POST"]
    pattern: '/admin/webhooks/:id/test'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['test']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/webhooks_controller').default['test']>>>
    }
  }
  'admin.trash.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/trash'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['index']>>>
    }
  }
  'admin.trash.bulk': {
    methods: ["POST"]
    pattern: '/admin/trash/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/bulk').trashBulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/bulk').trashBulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['bulk']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['bulk']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.trash.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/trash/:type/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { type: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['show']>>>
    }
  }
  'admin.trash.restore': {
    methods: ["POST"]
    pattern: '/admin/trash/:type/:id/restore'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { type: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['restore']>>>
    }
  }
  'admin.trash.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/trash/:type/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { type: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/trash_controller').default['destroy']>>>
    }
  }
  'api.site.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/site'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/site_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/site_controller').default['show']>>>
    }
  }
  'api.schema.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/schema'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/schema_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/schema_controller').default['show']>>>
    }
  }
  'api.pages.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/pages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/pages_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/pages_controller').default['index']>>>
    }
  }
  'api.pages.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/pages/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/pages_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/pages_controller').default['show']>>>
    }
  }
  'api.collections.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/collections'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/collections_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/collections_controller').default['index']>>>
    }
  }
  'api.collections.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/collections/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/collections_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/collections_controller').default['show']>>>
    }
  }
  'api.entries.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/collections/:slug/entries'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/entries_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/entries_controller').default['index']>>>
    }
  }
  'api.entries.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/collections/:slug/entries/:entrySlug'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { slug: ParamValue; entrySlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/entries_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/entries_controller').default['show']>>>
    }
  }
  'api.globals.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/globals'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/globals_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/globals_controller').default['index']>>>
    }
  }
  'api.globals.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/globals/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/globals_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/globals_controller').default['show']>>>
    }
  }
  'api.redirects.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/redirects'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/redirects_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/redirects_controller').default['index']>>>
    }
  }
  'api.sitemap.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/sitemap'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/sitemap_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/sitemap_controller').default['show']>>>
    }
  }
  'public.device.code': {
    methods: ["POST"]
    pattern: '/api/device/code'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/device_authorizations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/device_authorizations_controller').default['store']>>>
    }
  }
  'public.device.token': {
    methods: ["POST"]
    pattern: '/api/device/token'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/device_authorizations_controller').default['token']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/device_authorizations_controller').default['token']>>>
    }
  }
  'management.api_tokens.me': {
    methods: ["GET","HEAD"]
    pattern: '/api/api_tokens/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/api_tokens_controller').default['me']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/api_tokens_controller').default['me']>>>
    }
  }
  'management.api_tokens.rotate': {
    methods: ["POST"]
    pattern: '/api/api_tokens/rotate'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/api_tokens_controller').default['rotate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/api_tokens_controller').default['rotate']>>>
    }
  }
  'management.service_tokens.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/service_tokens'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['index']>>>
    }
  }
  'management.service_tokens.store': {
    methods: ["POST"]
    pattern: '/api/service_tokens'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['store']>>>
    }
  }
  'management.service_tokens.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/service_tokens/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['show']>>>
    }
  }
  'management.service_tokens.reveal': {
    methods: ["POST"]
    pattern: '/api/service_tokens/:id/reveal'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['reveal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['reveal']>>>
    }
  }
  'management.service_tokens.rotate': {
    methods: ["POST"]
    pattern: '/api/service_tokens/:id/rotate'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['rotate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['rotate']>>>
    }
  }
  'management.service_tokens.revoke': {
    methods: ["POST"]
    pattern: '/api/service_tokens/:id/revoke'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/management/service_tokens_controller').default['revoke']>>>
    }
  }
  'connect.show': {
    methods: ["GET","HEAD"]
    pattern: '/connect'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/connect_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/connect_controller').default['show']>>>
    }
  }
  'connect.store': {
    methods: ["POST"]
    pattern: '/connect'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/connect_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/connect_controller').default['store']>>>
    }
  }
  'admin.forms.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/forms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/forms/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.store': {
    methods: ["POST"]
    pattern: '/admin/forms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/forms/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.update': {
    methods: ["PUT"]
    pattern: '/admin/forms/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.duplicate': {
    methods: ["POST"]
    pattern: '/admin/forms/:id/duplicate'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/forms/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.lookups.forms': {
    methods: ["GET","HEAD"]
    pattern: '/admin/lookups/forms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.submissions': {
    methods: ["GET","HEAD"]
    pattern: '/admin/forms/:formId/submissions'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { formId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.forms.submissions.export': {
    methods: ["GET","HEAD"]
    pattern: '/admin/forms/:formId/submissions/export'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { formId: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.submissions.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/submissions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.submissions.bulk': {
    methods: ["POST"]
    pattern: '/admin/submissions/bulk'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.submissions.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/submissions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.submissions.update': {
    methods: ["PUT"]
    pattern: '/admin/submissions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.submissions.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/submissions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.submissions.file': {
    methods: ["GET","HEAD"]
    pattern: '/admin/submissions/:id/files/:field'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; field: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.settings.forms.edit': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings/forms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.settings.forms.update': {
    methods: ["PUT"]
    pattern: '/admin/settings/forms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'public.forms.submit': {
    methods: ["POST"]
    pattern: '/forms/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'api.forms.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/forms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'api.forms.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/forms/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/media'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.create': {
    methods: ["GET","HEAD"]
    pattern: '/admin/media/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.lookup': {
    methods: ["GET","HEAD"]
    pattern: '/admin/media/lookup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.store': {
    methods: ["POST"]
    pattern: '/admin/media/uploads'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.bulk': {
    methods: ["POST"]
    pattern: '/admin/media/bulk'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.folders.store': {
    methods: ["POST"]
    pattern: '/admin/media/folders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.folders.update': {
    methods: ["PUT"]
    pattern: '/admin/media/folders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.folders.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/media/folders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.update': {
    methods: ["PUT"]
    pattern: '/admin/media/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.replace': {
    methods: ["PUT"]
    pattern: '/admin/media/:id/file'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'admin.media.destroy': {
    methods: ["DELETE"]
    pattern: '/admin/media/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'api.assets.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/assets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'api.assets.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/assets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'branding.css': {
    methods: ["GET","HEAD"]
    pattern: '/branding.css'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/branding_stylesheets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/branding_stylesheets_controller').default['show']>>>
    }
  }
  'health': {
    methods: ["GET","HEAD"]
    pattern: '/up'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
    }
  }
  'sitemap.show': {
    methods: ["GET","HEAD"]
    pattern: '/sitemap.xml'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/site/sitemap_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/site/sitemap_controller').default['show']>>>
    }
  }
  'robots.show': {
    methods: ["GET","HEAD"]
    pattern: '/robots.txt'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/site/robots_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/site/robots_controller').default['show']>>>
    }
  }
  'site.home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/site/pages_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/site/pages_controller').default['show']>>>
    }
  }
  'site.page': {
    methods: ["GET","HEAD"]
    pattern: '/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/site/pages_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/site/pages_controller').default['show']>>>
    }
  }
}
