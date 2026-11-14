import { fetch } from '@tauri-apps/plugin-http';

export interface Asset {
    name: string;
    browser_download_url: string;
    size: number;
}

export interface ReleaseInfo {
    tag_name: string;
    body: string;
    html_url: string;
    assets: Asset[];
}

// Simple cache to avoid hitting rate limits
const releaseCache = new Map<string, { data: ReleaseInfo; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const GithubService = {
    /**
     * Fallback to retrieve release info by querying GitHub HTML when API is rate-limited or fails
     */
    async fetchFromWeb(repoName: string, tag?: string): Promise<ReleaseInfo> {
        const releaseUrl = tag
            ? `https://github.com/${repoName}/releases/tag/${tag}`
            : `https://github.com/${repoName}/releases/latest`;

        let response = await fetch(releaseUrl);
        if ([301, 302, 307, 308].includes(response.status)) {
            const redirectUrl = response.headers.get('location');
            if (redirectUrl) {
                response = await fetch(redirectUrl.startsWith('http') ? redirectUrl : `https://github.com${redirectUrl}`);
            }
        }

        let resolvedTag = tag;
        const location = response.headers.get('location');
        const targetUrl = location || response.url || '';
        const tagMatch = targetUrl.match(/releases\/tag\/([^/?#]+)/);
        if (tagMatch) {
            resolvedTag = tagMatch[1];
        }

        if (!resolvedTag) {
            const text = await response.text();
            const match = text.match(/releases\/tag\/([^"'>]+)/);
            if (match) {
                resolvedTag = match[1];
            }
        }

        if (!resolvedTag) {
            throw new Error(`Could not determine release tag for ${repoName}`);
        }

        const assets: Asset[] = [];
        try {
            const assetsResp = await fetch(`https://github.com/${repoName}/releases/expanded_assets/${resolvedTag}`);
            if (assetsResp.ok) {
                const html = await assetsResp.text();
                const regex = /href="([^"]*\/releases\/download\/[^"]+)"/g;
                let m;
                while ((m = regex.exec(html)) !== null) {
                    const href = m[1];
                    const fullUrl = href.startsWith('http') ? href : `https://github.com${href}`;
                    const parts = href.split('/');
                    const name = decodeURIComponent(parts[parts.length - 1]);
                    if (!assets.some(a => a.name === name)) {
                        assets.push({
                            name,
                            browser_download_url: fullUrl,
                            size: 0
                        });
                    }
                }
            }
        } catch (e) {
            console.warn(`[GithubService] Failed to load expanded assets for ${repoName}@${resolvedTag}:`, e);
        }

        return {
            tag_name: resolvedTag,
            body: '',
            html_url: `https://github.com/${repoName}/releases/tag/${resolvedTag}`,
            assets
        };
    },

    /**
     * Get the latest release for a repository
     * @param repoName Format: "owner/repo"
     */
    async getLatestRelease(repoName: string): Promise<ReleaseInfo> {
        const cacheKey = `latest:${repoName}`;
        const cached = releaseCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`[GithubService] Using cached latest release for ${repoName}`);
            return cached.data;
        }

        try {
            let response = await fetch(`https://api.github.com/repos/${repoName}/releases/latest`);
            if (response.status === 301 || response.status === 302) {
                const redirectUrl = response.headers.get('location');
                if (redirectUrl) {
                    response = await fetch(redirectUrl);
                }
            }

            if (!response.ok) {
                if (response.status === 403) {
                    console.warn(`[GithubService] GitHub API 403 for ${repoName}, fallback to web.`);
                    const webData = await this.fetchFromWeb(repoName);
                    releaseCache.set(cacheKey, { data: webData, timestamp: Date.now() });
                    return webData;
                }
                throw new Error(`Failed to fetch latest release for ${repoName}: ${response.statusText}`);
            }
            const data = await response.json();
            releaseCache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.warn(`[GithubService] Error fetching latest release from API for ${repoName}, trying web fallback:`, error);
            try {
                const webData = await this.fetchFromWeb(repoName);
                releaseCache.set(cacheKey, { data: webData, timestamp: Date.now() });
                return webData;
            } catch {
                throw error;
            }
        }
    },

    /**
     * Get a specific release by tag
     * @param repoName Format: "owner/repo"
     * @param tag Tag name (e.g. "v1.0.0")
     */
    async getReleaseByTag(repoName: string, tag: string): Promise<ReleaseInfo> {
        const cacheKey = `tag:${repoName}:${tag}`;
        const cached = releaseCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`[GithubService] Using cached release for ${repoName}@${tag}`);
            return cached.data;
        }

        try {
            console.log(`[GithubService] Fetching release for tag "${tag}" from ${repoName}`);
            let response = await fetch(`https://api.github.com/repos/${repoName}/releases/tags/${tag}`);

            if (!response.ok && !tag.startsWith('v')) {
                response = await fetch(`https://api.github.com/repos/${repoName}/releases/tags/v${tag}`);
            }
            
            if (!response.ok && tag.startsWith('v')) {
                const tagWithoutV = tag.substring(1);
                response = await fetch(`https://api.github.com/repos/${repoName}/releases/tags/${tagWithoutV}`);
            }

            if (response.status === 301 || response.status === 302) {
                const redirectUrl = response.headers.get('location');
                if (redirectUrl) {
                    response = await fetch(redirectUrl);
                }
            }

            if (!response.ok) {
                if (response.status === 403) {
                    console.warn(`[GithubService] GitHub API 403 for ${repoName}@${tag}, fallback to web.`);
                    const webData = await this.fetchFromWeb(repoName, tag);
                    releaseCache.set(cacheKey, { data: webData, timestamp: Date.now() });
                    return webData;
                }
                const errorMsg = `Failed to fetch release ${tag} for ${repoName}: ${response.status} ${response.statusText}`;
                throw new Error(errorMsg);
            }
            const data = await response.json();
            releaseCache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.warn(`[GithubService] Error fetching release ${tag} from API for ${repoName}, trying web fallback:`, error);
            try {
                const webData = await this.fetchFromWeb(repoName, tag);
                releaseCache.set(cacheKey, { data: webData, timestamp: Date.now() });
                return webData;
            } catch {
                throw error;
            }
        }
    },

    /**
     * Compare two versions
     * Returns true if remote is newer than local
     */
    isNewerVersion(local: string, remote: string): boolean {
        if (!local || !remote) return false;

        const cleanLocal = local.replace(/^v/, '');
        const cleanRemote = remote.replace(/^v/, '');

        const localParts = cleanLocal.split('.').map(Number);
        const remoteParts = cleanRemote.split('.').map(Number);

        for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
            const l = localParts[i] || 0;
            const r = remoteParts[i] || 0;

            if (r > l) return true;
            if (r < l) return false;
        }

        return false;
    }
};
