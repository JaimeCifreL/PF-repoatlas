
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  loadGithubSnapshot,
} from "../../../lib/github/client";

import {
  analyzeGithubSnapshot,
} from "../../../lib/github/analyze";

import {
  compareRepositoryVersions,
} from "../../../lib/time-machine/compare";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest
) {
  const params = request.nextUrl.searchParams;

  const url = params.get("url")?.trim();
  const before = params.get("before")?.trim();
  const after = params.get("after")?.trim();

  if (!url || !after) {
    return NextResponse.json(
      {
        error:
          "Repository URL and AFTER reference are required.",
      },
      { status: 400 }
    );
  }

  try {
    // Resolve both references to immutable commits.
    const [beforeSnapshot, afterSnapshot] =
      await Promise.all([
        loadGithubSnapshot(url, before || undefined),
        loadGithubSnapshot(url, after),
      ]);

    const [beforeAnalysis, afterAnalysis] =
      await Promise.all([
        analyzeGithubSnapshot(beforeSnapshot),
        analyzeGithubSnapshot(afterSnapshot),
      ]);

    const report = compareRepositoryVersions(
      beforeAnalysis,
      afterAnalysis
    );

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });

  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not compare repository versions.",
      },
      { status: 502 }
    );
  }
}
