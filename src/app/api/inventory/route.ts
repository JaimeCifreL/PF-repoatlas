
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  loadGithubSnapshot,
} from "../../../lib/github/client";

import {
  snapshotInventory,
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
    const snapshot =
      await loadGithubSnapshot(url, branch);

    const inventory =
      snapshotInventory(snapshot);

    return NextResponse.json({
      ...inventory,

      totalFiles: inventory.files.length,
      truncated: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load inventory.",
      },
      { status: 502 }
    );
  }
}
