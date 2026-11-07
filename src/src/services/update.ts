import { fetch } from '@tauri-apps/plugin-http';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { tempDir } from '@tauri-apps/api/path';
import { Command } from '@tauri-apps/plugin-shell';
import { GithubService, ReleaseInfo } from './github';
import { FlmService } from './flm';

export interface UpdateCallbacks {
    onProgress?: (progress: number | null) => void;
    onInstalling?: () => void;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export const UpdateService = {
    /**
     * Télécharge et installe une release (FLM ou Companion)
     * @param release La release à installer
     * @param exeName Nom du fichier exe à chercher dans les assets
     * @param callbacks Callbacks pour suivre la progression
     * @param monitorVersion Si true, surveille le changement de version FLM après installation
     */
    async downloadAndInstall(
        release: ReleaseInfo,
        exeName: string,
        callbacks: UpdateCallbacks = {},
        monitorVersion = false
    ): Promise<void> {
        const { onProgress, onInstalling, onSuccess, onError } = callbacks;

        try {
            // Find the installer asset
            // For Companion: looks for files starting with "Flm.Companion" or "Flm Companion" and ending with .exe
            // For FLM: prefer the configured installer, then support legacy EXE releases.
            const requestedName = exeName.toLowerCase();
            const asset = release.assets.find(a => a.name.toLowerCase() === requestedName) ?? release.assets.find(a => {
                const name = a.name.toLowerCase();
                if (requestedName.includes('flm-setup')) {
                    return name === 'flm-setup.msi' || name === 'flm-setup.exe';
                }
                if (requestedName.includes('flm-manager') || requestedName.includes('companion')) {
                    // Companion installer: flexible matching
                    return (name.startsWith('flm.companion') || name.startsWith('flm companion')) && name.endsWith('.exe');
                }
                // Fallback: any .exe file
                return name.endsWith('.exe') || name.endsWith('.msi');
            });
            if (!asset) {
                onError?.('Installer not found in release assets');
                return;
            }

            // Download with progress tracking
            onProgress?.(0);
            const response = await fetch(asset.browser_download_url);
            if (!response.ok) throw new Error('Download failed');
            if (!response.body) throw new Error('No response body');

            const contentLength = +response.headers.get('Content-Length')!;
            const reader = response.body.getReader();
            let receivedLength = 0;
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedLength += value.length;
                if (contentLength) {
                    const progress = Math.round((receivedLength / contentLength) * 100);
                    onProgress?.(progress);
                }
            }

            // Combine chunks
            const allChunks = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }

            // Save to temp directory
            const filename = asset.name;
            await writeFile(filename, allChunks, { baseDir: BaseDirectory.Temp });

            // Launch installer as a tracked child process.
            const tempDirPath = await tempDir();
            const absolutePath = `${tempDirPath}${filename}`;
            onProgress?.(null);
            onInstalling?.();

            if (monitorVersion) {
                await FlmService.stopServer();
            }

            const isMsi = filename.toLowerCase().endsWith('.msi');
            const installer = Command.create('powershell', [
                '-NoProfile',
                '-NonInteractive',
                '-WindowStyle',
                'Hidden',
                '-Command',
                '$installer = $args[0]; $isMsi = $args[1] -eq "1"; if ($isMsi) { $p = Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", $installer) -Wait -PassThru } else { $p = Start-Process -FilePath $installer -Wait -PassThru }; exit $p.ExitCode',
                absolutePath,
                isMsi ? '1' : '0',
            ]);
            const result = await installer.execute();
            if (result.code !== 0) {
                throw new Error(`Installer exited with code ${result.code}`);
            }

            if (monitorVersion) {
                await this.waitForFlmVersion(release.tag_name, onSuccess);
            } else {
                onSuccess?.();
            }

        } catch (error) {
            console.error('Error during download/install:', error);
            onError?.(error instanceof Error ? error.message : 'Download or installation failed');
        }
    },

    async waitForFlmVersion(expectedVersion: string, onSuccess?: () => void): Promise<void> {
        const expected = expectedVersion.replace(/^v/, '');
        for (let attempt = 1; attempt <= 15; attempt++) {
            const current = await FlmService.getVersion();
            const currentVersion = current.replace(/^v/, '');
            if (currentVersion === expected || GithubService.isNewerVersion(expected, currentVersion)) {
                console.log('[Update] FLM installation completed. New version:', current);
                onSuccess?.();
                return;
            }
            console.log(`[Update] Waiting for FLM version ${expected} (${attempt}/15): ${current}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        throw new Error(`FLM version did not reach ${expected}`);
    }
};
