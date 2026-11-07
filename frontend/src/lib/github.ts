export interface GitHubRepoInfo {
  owner: string
  name: string
  url: string
}

export function validateGitHubUrl(rawUrl: string): {
  valid: boolean
  error?: string
  info?: GitHubRepoInfo
} {
  const url = rawUrl.trim()
  if (!url) {
    return { valid: false, error: 'Please enter a GitHub repository URL.' }
  }

  // Must start with https://github.com/
  if (url.startsWith('http://')) {
    return {
      valid: false,
      error: 'Please use https:// instead of http://.',
    }
  }

  const match = url.match(
    /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/
  )

  if (!match) {
    return {
      valid: false,
      error: 'Only public github.com links work (e.g. https://github.com/owner/repo).',
    }
  }

  const [, owner, name] = match
  if (!owner || !name) {
    return { valid: false, error: 'Invalid repository owner or name.' }
  }

  return {
    valid: true,
    info: {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    },
  }
}

