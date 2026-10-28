
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

type TreeResponse = {
  sha: string;
  tree: GithubEntry[];
  truncated?: boolean;
};

export function parseGithubUrl(
  input: string
): {
  owner: string;
  repo: string;
} {
  const url = new URL(input);

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com"
  ) {
    throw new Error(
      "Use an HTTPS URL on github.com."
    );
  }

  const segments = url.pathname
    .split("/")
    .filter(Boolean);

  if (segments.length !== 2) {
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
    throw new Error(
      "Invalid GitHub repository name."
    );
  }

  return { owner, repo };
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
    const rate = response.headers.get(
      "x-ratelimit-remaining"
    );

    if (
      (
        response.status === 403 ||
        response.status === 429
      ) &&
      rate === "0"
    ) {
      throw new Error(
        "GitHub rate limit reached. Configure GITHUB_TOKEN."
      );
    }

    throw new Error(
      `GitHub returned HTTP ${response.status}.`
    );
  }

  return await response.json() as T;
}

async function completeTree(
  owner: string,
  repo: string,
  treeSha: string
): Promise<GithubEntry[]> {
  const base =
    `https://api.github.com/repos/` +
    `${owner}/${repo}/git/trees/`;

  const tree = await github<TreeResponse>(
    `${base}${treeSha}?recursive=1`
  );

  if (!tree.truncated) {
    return tree.tree;
  }

  const entries: GithubEntry[] = [];

  const queue = [
    {
      sha: treeSha,
      prefix: "",
    },
  ];

  for (
    let i = 0;
    i < queue.length;
    i++
  ) {
    const item = queue[i];

    const sub = await github<TreeResponse>(
      base + item.sha
    );

    if (sub.truncated) {
      throw new Error(
        `Incomplete GitHub tree at ${
          item.prefix || "/"
        }`
      );
    }

    for (const entry of sub.tree) {
      const fullPath = item.prefix
        ? `${item.prefix}/${entry.path}`
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
  requestedBranch?: string
): Promise<GithubSnapshot> {
  const { owner, repo } = parseGithubUrl(url);

  const base =
    `https://api.github.com/repos/${owner}/${repo}`;

  const metadata = await github<{
    default_branch: string;
  }>(base);

  const branch =
    requestedBranch?.trim() ||
    metadata.default_branch;

  const info = await github<{
    commit: {
      sha: string;
    };
  }>(
    `${base}/branches/${encodeURIComponent(branch)}`
  );

  const commitSha = info.commit.sha;

  const commit = await github<{
    tree: {
      sha: string;
    };
  }>(
    `${base}/git/commits/${commitSha}`
  );

  const entries = await completeTree(
    owner,
    repo,
    commit.tree.sha
  );

  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    branch,
    commitSha,
    entries,
  };
}

export async function loadGithubText(
  snapshot: GithubSnapshot,
  entry: GithubEntry
): Promise<string> {
  // Con token, leer los blobs desde la API.
  // Permite acceso a repositorios privados autorizados.
  if (process.env.GITHUB_TOKEN) {
    const data = await github<{
      encoding?: string;
      content?: string;
    }>(
      `https://api.github.com/repos/` +
      `${snapshot.owner}/${snapshot.repo}/` +
      `git/blobs/${entry.sha}`
    );

    if (
      data.encoding !== "base64" ||
      !data.content
    ) {
      throw new Error(
        `Unsupported Git blob: ${entry.path}`
      );
    }

    return Buffer.from(
      data.content,
      "base64"
    ).toString("utf8");
  }

  // Repositorios públicos: usar contenido raw.
  const safePath = entry.path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const url =
    `https://raw.githubusercontent.com/` +
    `${snapshot.owner}/${snapshot.repo}/` +
    `${snapshot.commitSha}/${safePath}`;

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  return response.text();
}
