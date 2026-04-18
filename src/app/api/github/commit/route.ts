import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkgStr = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgStr);

    let repoUrl = pkg.repository?.url || pkg.repository;
    if (!repoUrl) {
      return NextResponse.json({ error: 'No repository found in package.json' }, { status: 404 });
    }

    // Clean up url (e.g. "git+https://github.com/ReinfyTeam/IPTVCloud.app.git" -> "ReinfyTeam/IPTVCloud.app")
    repoUrl = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
    const urlParts = new URL(repoUrl);
    const repoPath = urlParts.pathname.slice(1); // "ReinfyTeam/IPTVCloud.app"

    const githubRes = await fetch(`https://api.github.com/repos/${repoPath}/commits/main`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'IPTVCloud.app',
      },
    });

    if (!githubRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch commit from GitHub' },
        { status: githubRes.status },
      );
    }

    const data = await githubRes.json();

    return NextResponse.json({
      sha: data.sha,
      url: data.html_url,
      message: data.commit.message,
      date: data.commit.author.date,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
