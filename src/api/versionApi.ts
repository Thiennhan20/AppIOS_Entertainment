const GITHUB_OWNER = 'Thiennhan20';
const GITHUB_REPO = 'AppIOS_Entertainment';
const GITHUB_COMMITS_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`;

export interface GitVersion {
  hash: string;
  message: string;
  createdAt: string;
}

interface GitHubCommit {
  sha: string;
  commit?: {
    message?: string;
    author?: {
      date?: string;
    };
  };
}

function serializeCommit(commit: GitHubCommit): GitVersion {
  return {
    hash: commit.sha,
    message: commit.commit?.message?.split('\n')[0] || 'App update',
    createdAt: commit.commit?.author?.date || new Date().toISOString(),
  };
}

export const versionApi = {
  getLatest: async (): Promise<GitVersion | null> => {
    const response = await fetch(`${GITHUB_COMMITS_URL}/main`, { cache: 'no-store' });
    if (!response.ok) return null;

    const data = await response.json() as GitHubCommit;
    return data.sha ? serializeCommit(data) : null;
  },
};
