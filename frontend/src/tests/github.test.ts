import { describe, expect, it } from 'vitest'
import { validateGitHubUrl } from '../lib/github'

describe('validateGitHubUrl', () => {
  it('accepts a good public github link', () => {
    const res = validateGitHubUrl('https://github.com/pallets/click')
    expect(res.valid).toBe(true)
    expect(res.info).toEqual({
      owner: 'pallets',
      name: 'click',
      url: 'https://github.com/pallets/click',
    })
  })

  it('rejects a link on another website', () => {
    const res = validateGitHubUrl('https://gitlab.com/owner/repo')
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Only public github.com links work')
  })

  it('rejects an unencrypted http:// link', () => {
    const res = validateGitHubUrl('http://github.com/owner/repo')
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Please use https://')
  })

  it('rejects empty or whitespace text', () => {
    const res = validateGitHubUrl('   ')
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Please enter a GitHub repository URL')
  })
})

