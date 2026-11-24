import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const nativeShare = {
  /**
   * Share text or URL via Android native share sheet
   */
  shareText: async (title: string, text: string, url?: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title,
          text,
          url,
          dialogTitle: 'Share RallyPoint Match',
        });
        return true;
      } else if (navigator.share) {
        await navigator.share({ title, text, url });
        return true;
      }
    } catch (e) {
      console.debug('Share cancelled or failed:', e);
    }
    return false;
  },

  /**
   * Share a scorecard image or CSV/PDF file via native share sheet
   */
  shareFile: async (fileName: string, base64Data: string, mimeType: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Write to cache directory to obtain file uri
        const cleanBase64 = base64Data.replace(/^data:.*,/, '');
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: cleanBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: fileName,
          files: [saved.uri],
          dialogTitle: `Share ${fileName}`,
        });
        return true;
      } else {
        // Fallback to browser blob download
        const blob = await fetch(`data:${mimeType};base64,${base64Data.replace(/^data:.*,/, '')}`).then((r) =>
          r.blob()
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
    } catch (e) {
      console.debug('File share error:', e);
    }
    return false;
  },
};
