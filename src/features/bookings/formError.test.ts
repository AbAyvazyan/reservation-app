import { describe, expect, it } from 'vitest'
import { ApiError, ApiValidationError, ConflictError, NetworkError, NotFoundError, ServerError } from '../../api/errors'
import { booking } from '../../domain/testUtils'
import { toFormError } from './formError'

describe('toFormError', () => {
  it('names the conflicting booking and reassures that input is kept', () => {
    const error = toFormError(new ConflictError('x', [booking('a', '10:00', '11:00', '2026-10-23', 'Standup')]))
    expect(error.kind).toBe('conflict')
    expect(error.message).toContain('10:00–11:00 “Standup”')
    expect(error.message).toContain('still here')
  })

  it('falls back gracefully when the conflict list is empty', () => {
    expect(toFormError(new ConflictError('x', [])).message).toContain('another booking')
  })

  it('carries validation issues through', () => {
    const issues = [{ code: 'TOO_SHORT' as const, field: 'end' as const, message: 'short' }]
    expect(toFormError(new ApiValidationError('bad', 422, issues))).toMatchObject({ kind: 'validation', issues })
  })

  it('does not claim fields are highlighted when the server sent no issues', () => {
    expect(toFormError(new ApiValidationError('Bad body', 400, []))).toEqual({ kind: 'unknown', message: 'Bad body' })
  })

  it.each([
    [new NotFoundError('gone'), 'not-found'],
    [new NetworkError('offline'), 'network'],
    [new ServerError('boom', 500, 'INTERNAL'), 'server'],
    [new ApiError('odd', 418, 'TEAPOT'), 'unknown'],
    [new Error('plain'), 'unknown'],
    ['a string', 'unknown'],
  ])('maps %s -> %s', (error, kind) => {
    expect(toFormError(error).kind).toBe(kind)
  })
})