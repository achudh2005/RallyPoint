package com.rallypoint.app;

import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Edge-to-Edge Display for Android 15 & Funtouch/OriginOS
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // 2. Punch-hole Camera Cutout Handling (Short Edges Mode)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }

        // 3. 120Hz & 144Hz AMOLED Smoothness (iQOO Neo 10 Display Mode Preference)
        requestHighRefreshRate(window);

        // 4. Secure WebView: disable remote debugging in production release builds
        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);
    }

    private void requestHighRefreshRate(Window window) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Display display;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    display = getDisplay();
                } else {
                    display = getWindowManager().getDefaultDisplay();
                }

                if (display != null) {
                    Display.Mode[] modes = display.getSupportedModes();
                    Display.Mode bestMode = null;
                    float maxRefreshRate = 60.0f;

                    for (Display.Mode mode : modes) {
                        if (mode.getRefreshRate() > maxRefreshRate) {
                            maxRefreshRate = mode.getRefreshRate();
                            bestMode = mode;
                        }
                    }

                    if (bestMode != null && maxRefreshRate >= 90.0f) {
                        WindowManager.LayoutParams layoutParams = window.getAttributes();
                        layoutParams.preferredDisplayModeId = bestMode.getModeId();
                        window.setAttributes(layoutParams);
                    }
                }
            } catch (Exception ignored) {
                // Graceful fallback to default system refresh rate
            }
        }
    }
}
