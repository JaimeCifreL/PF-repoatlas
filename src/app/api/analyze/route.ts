
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  analyzeGithubRepository,
} from "../../../lib/github/analyze";

export async function GET(
  request: NextRequest
) {
  const url =
    request.nextUrl.searchParams.get("url");

  const branch =
    request.nextUrl.searchParams.get("branch") ||
    undefined;

  if (!url) {
    return NextResponse.json(
      {
        error:
          "Missing GitHub repository URL.",
      },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await analyzeGithubRepository(
        url,
        branch
      )
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze repository.",
      },
      { status: 502 }
    );
  }
}
