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
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { valid: false, error: 'Please enter a GitHub repository URL.' }
  }

  // Must not be http://
  if (trimmed.startsWith('http://')) {
    return {
      valid: false,
      error: 'Please use https:// instead of http://.',
    }
  }

  // If another domain on https://
  if (trimmed.startsWith('https://') && !trimmed.startsWith('https://github.com/')) {
    return {
      valid: false,
      error: 'Only public github.com links work (e.g. https://github.com/owner/repo).',
    }
  }

  // Strip query and hash
  let clean = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '')

  // Normalize github.com/owner/repo or owner/repo
  if (clean.startsWith('github.com/')) {
    clean = 'https://' + clean
  } else if (!clean.startsWith('https://') && !clean.includes('://')) {
    const parts = clean.split('/')
    if (parts.length === 2 && /^[a-zA-Z0-9_.-]+$/.test(parts[0]) && /^[a-zA-Z0-9_.-]+$/.test(parts[1])) {
      clean = `https://github.com/${parts[0]}/${parts[1]}`
    }
  }

  const match = clean.match(
    /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:\/.*)?$/
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

