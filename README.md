# RepoAtlas

### Explore, understand and track the evolution of your codebase.

**RepoAtlas** is a web application designed to visualize, analyze and understand the architecture of software repositories.

By connecting a public GitHub repository, RepoAtlas identifies its files, analyzes source-code dependencies and transforms the repository structure into interactive 2D and 3D graphs.

Beyond visualization, RepoAtlas provides dependency impact analysis, architecture metrics and a **Time Machine** to compare how a codebase evolves between Git commits or branches.

## Features

### Interactive Dependency Graphs

- Explore repository dependencies through interactive 2D and 3D visualizations.
- Identify relationships between files and modules.
- Highlight incoming and outgoing connections.
- Group files by directories and navigate through different levels of detail.
- Focus on specific files and their surrounding dependencies.
- Explore large repositories through aggregated module views.

### Architecture Overview

- Repository-wide architecture metrics.
- Identification of highly referenced files.
- Analysis of files with significant dependency impact.
- Detection of circular dependency groups.
- Identification of analyzed files without resolved dependencies.
- Language distribution statistics.

### Dependency Impact Analysis

Select a file to investigate how changes could propagate through the repository.

- Direct and indirect dependency relationships.
- Visual highlighting of affected files.
- Identification of potentially critical components.
- Navigation between related files.

### Architecture Time Machine

Compare two GitHub revisions to understand how the repository architecture has changed.

- Compare branches, tags and commits.
- Detect added, removed and modified files.
- Identify new and removed dependencies.
- Detect introduced and resolved circular dependency groups.
- Explore architecture changes in an interactive graph.
- Inspect files across revisions.
- Export comparison results as JSON.

### File Explorer

- Hierarchical repository navigation.
- Search by file name or path.
- Filter files by programming language and analysis status.
- Navigate directly from files to the dependency graph or impact analysis.

### Multi-language Analysis

RepoAtlas includes source-code dependency analysis for multiple programming languages, including:

- TypeScript and JavaScript
- Python
- Java
- C#
- PHP
- Go
- Rust
- Ruby
- Dart

Analysis precision and dependency coverage depend on the language and the available source files.

### Export

Export repository analysis results in JSON, CSV and Mermaid formats.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Application framework and API routes |
| React | Interactive user interface |
| TypeScript | Type-safe application development |
| Tailwind CSS | Styling and responsive design |
| React Flow | Interactive 2D dependency graphs |
| Three.js | 3D visualization and camera controls |
| react-force-graph-3d | Force-directed 3D graphs |
| GitHub REST API | Repository content, branches and commit history |
| Vitest | Automated testing |

## Getting Started

### Requirements

- Node.js compatible with the installed Next.js version
- npm
- Internet access to analyze public GitHub repositories

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/repoatlas.git
cd repoatlas
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

http://localhost:3000

### GitHub API Configuration

RepoAtlas can analyze public repositories using the GitHub API.

To increase the available API request limits, create a `.env.local` file in the project root:

```env
GITHUB_TOKEN=your_github_token
```

Never commit `.env.local` or expose your GitHub token in a public repository.

## How It Works

1. **Repository discovery:** RepoAtlas retrieves the GitHub repository tree and identifies its files and directories.
2. **Dependency extraction:** Language-specific analyzers inspect supported source files and resolve local dependencies.
3. **Graph generation:** Files and resolved dependencies become nodes and edges.
4. **Architecture analysis:** Graph algorithms identify relationships, circular dependencies and structural metrics.
5. **Interactive exploration:** Users navigate the architecture using 2D/3D graphs, filters and file inspection.
6. **Revision comparison:** Architecture Time Machine analyzes two Git revisions and compares their files, connections and circular dependency groups.

## Project Structure

```text
src/
├── app/
│   ├── api/
│   ├── time-machine/
│   └── page.tsx
├── components/
│   ├── architecture/
│   ├── explorer/
│   ├── graph/
│   ├── inspector/
│   ├── layout/
│   ├── repository/
│   └── time-machine/
├── lib/
│   ├── analyzers/
│   ├── github/
│   ├── time-machine/
│   └── ...
└── types/
```

## Technical Considerations

RepoAtlas distinguishes between files discovered in a repository and files whose dependencies have actually been analyzed.

For larger repositories, source-code analysis may be limited to a subset of files. Consequently, missing dependency connections do not necessarily indicate that no dependency exists.

Architecture metrics and impact analysis are based on resolved dependencies and should be interpreted as development insights rather than definitive code-quality or security assessments.

## Testing

Run automated tests:

```bash
npx vitest run
```

Check TypeScript types:

```bash
npx tsc --noEmit
```

Run linting:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Roadmap

- Advanced architecture comparison between Git revisions.
- Improved visualization of architectural changes in 3D.
- Dependency path exploration.
- Pull request impact analysis.
- Architecture health reports.
- Additional programming language support.

## Project Status

RepoAtlas is an evolving personal software engineering project focused on codebase visualization, architecture analysis and developer tooling.

---

**RepoAtlas — See the architecture behind the code.**
