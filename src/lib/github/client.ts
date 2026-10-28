
export type GithubEntry = {
  path: string;
  type: "blob" | "tree" | "commit";
  mode?: string;
  sha: string;
  size?: number;
};

export type GithubSnapshot = {
  repository: string;
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
  entries: GithubEntry[];
};

export type GithubRevisionList = {
  repository: string;
  defaultBranch: string;
  branches: string[];
  commits: Array<{
    sha: string;
    message: string;
    date: string | null;
  }>;
};

type TreeResponse = {
  sha: string;
  tree: GithubEntry[];
  truncated?: boolean;
};

type RepositoryMetadata = {
  default_branch: string;
  private: boolean;
};

const API = "https://api.github.com";

export function parseGithubUrl(input: string): {
  owner: string;
  repo: string;
} {
  const url = new URL(input.trim());

  const segments = url.pathname
    .split("/")
    .filter(Boolean);

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    segments.length !== 2
  ) {
    throw new Error(
      "Use https://github.com/owner/repo"
    );
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  if (
    !/^[A-Za-z0-9-]+$/.test(owner) ||
    !/^[A-Za-z0-9._-]+$/.test(repo)
  ) {
    throw new Error("Invalid repository URL.");
  }

  return { owner, repo };
}

function cleanRef(value: string): string {
  const ref = value.trim();

  if (
    !ref ||
    ref.length > 255 ||
    !/^[A-Za-z0-9_./-]+$/.test(ref) ||
    ref.includes("..") ||
    ref.endsWith("/") ||
    ref.startsWith("/")
  ) {
    throw new Error(
      "Invalid Git reference. Use a branch, tag or commit SHA."
    );
  }

  return ref;
}

function headers(): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoAtlas",

    ...(process.env.GITHUB_TOKEN
      ? {
          Authorization:
            `Bearer ${process.env.GITHUB_TOKEN}`,
        }
      : {}),
  };
}

async function github<T>(
  url: string
): Promise<T> {
  const response = await fetch(url, {
    headers: headers(),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const remaining = response.headers.get(
      "x-ratelimit-remaining"
    );

    if (
      (response.status === 403 ||
        response.status === 429) &&
      remaining === "0"
    ) {
      throw new Error(
        "GitHub rate limit reached. Configure GITHUB_TOKEN."
      );
    }

    throw new Error(
      `GitHub returned HTTP ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

async function metadata(
  owner: string,
  repo: string
): Promise<RepositoryMetadata> {
  const result = await github<RepositoryMetadata>(
    `${API}/repos/${owner}/${repo}`
  );

  // We do not expose server-token access to private
  // repositories through a public endpoint.
  if (result.private) {
    throw new Error(
      "Private repositories are not enabled in this version."
    );
  }

  return result;
}

async function completeTree(
  owner: string,
  repo: string,
  treeSha: string
): Promise<GithubEntry[]> {
  const base =
    `${API}/repos/${owner}/${repo}/git/trees/`;

  const initial = await github<TreeResponse>(
    `${base}${encodeURIComponent(treeSha)}?recursive=1`
  );

  if (!initial.truncated) {
    return initial.tree;
  }

  const entries: GithubEntry[] = [];

  const queue: Array<{
    sha: string;
    prefix: string;
  }> = [
    {
      sha: treeSha,
      prefix: "",
    },
  ];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];

    const subtree = await github<TreeResponse>(
      base + encodeURIComponent(current.sha)
    );

    if (subtree.truncated) {
      throw new Error(
        `Incomplete GitHub tree at ${current.prefix || "/"}`
      );
    }

    for (const entry of subtree.tree) {
      const fullPath = current.prefix
        ? `${current.prefix}/${entry.path}`
        : entry.path;

      entries.push({
        ...entry,
        path: fullPath,
      });

      if (entry.type === "tree") {
        queue.push({
          sha: entry.sha,
          prefix: fullPath,
        });
      }
    }
  }

  return entries;
}

export async function loadGithubSnapshot(
  url: string,
  requestedRef?: string
): Promise<GithubSnapshot> {
  const { owner, repo } = parseGithubUrl(url);

  const info = await metadata(owner, repo);

  const ref = cleanRef(
    requestedRef || info.default_branch
  );

  // Supports branches, tags and commit hashes.
  const encodedRef = ref
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const commit = await github<{
    sha: string;
    commit: {
      tree: {
        sha: string;
      };
    };
  }>(
    `${API}/repos/${owner}/${repo}/commits/${encodedRef}`
  );

  const entries = await completeTree(
    owner,
    repo,
    commit.commit.tree.sha
  );

  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    branch: ref,
    commitSha: commit.sha,
    entries,
  };
}

export async function listGithubRevisions(
  url: string
): Promise<GithubRevisionList> {
  const { owner, repo } = parseGithubUrl(url);

  const info = await metadata(owner, repo);

  const base = `${API}/repos/${owner}/${repo}`;

  const [branches, commits] = await Promise.all([
    github<Array<{ name: string }>>(
      `${base}/branches?per_page=50`
    ),

    github<Array<{
      sha: string;
      commit: {
        message: string;
        committer?: {
          date?: string;
        };
      };
    }>>(
      `${base}/commits?per_page=25`
    ),
  ]);

  return {
    repository: `${owner}/${repo}`,
    defaultBranch: info.default_branch,
    branches: branches.map((item) => item.name),
    commits: commits.map((item) => ({
      sha: item.sha,
      message: item.commit.message.split("\n")[0],
      date: item.commit.committer?.date ?? null,
    })),
  };
}

export async function loadGithubText(
  snapshot: GithubSnapshot,
  entry: GithubEntry
): Promise<string> {
  if (process.env.GITHUB_TOKEN) {
    const result = await github<{
      encoding?: string;
      content?: string;
    }>(
      `${API}/repos/${snapshot.owner}/${snapshot.repo}` +
      `/git/blobs/${encodeURIComponent(entry.sha)}`
    );

    if (
      result.encoding !== "base64" ||
      !result.content
    ) {
      throw new Error(
        `Unsupported Git blob: ${entry.path}`
      );
    }

    return Buffer.from(
      result.content,
      "base64"
    ).toString("utf8");
  }

  const filePath = entry.path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const rawUrl =
    `https://raw.githubusercontent.com/` +
    `${snapshot.owner}/${snapshot.repo}/` +
    `${snapshot.commitSha}/${filePath}`;

  const response = await fetch(rawUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(
      `Could not fetch ${entry.path}: HTTP ${response.status}`
    );
  }

  return response.text();
}
