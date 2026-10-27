
import {
  analyzeGitHubRepository,
  AnalysisError,
} from "@/lib/github-analyzer";


export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");

  if (!url) {
    return Response.json(
      { error: "Debes indicar una URL de GitHub." },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeGitHubRepository(url);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AnalysisError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("RepoAtlas analysis error:", error);

    return Response.json(
      { error: "No se pudo completar el análisis." },
      { status: 500 }
    );
  }
}
