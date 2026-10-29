
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  listGithubRevisions,
} from "../../../../lib/github/client";

export async function GET(
  request: NextRequest
) {
  const url = request.nextUrl.searchParams
    .get("url")
    ?.trim();

  if (!url) {
    return NextResponse.json(
      {
        error: "Missing GitHub repository URL.",
      },
      { status: 400 }
    );
  }

  try {
    const revisions = await listGithubRevisions(url);

    return NextResponse.json(revisions, {
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
            : "Could not load GitHub revisions.",
      },
      { status: 502 }
    );
  }
}
