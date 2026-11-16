package by.cybershield.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
    private int systemBarBackground = Color.rgb(16, 25, 22);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrintPlugin.class);
        registerPlugin(SaveFilePlugin.class);
        registerPlugin(AppearancePlugin.class);
        super.onCreate(savedInstanceState);
        protectWebViewFromSystemBars();
    }

    @Override
    public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        // SystemBars reapplies its Android theme color during rotation. Restore
        // the user's in-app theme after that plugin has updated icon contrast.
        getWindow().getDecorView().setBackgroundColor(systemBarBackground);
    }

    @CapacitorPlugin(name = "CyberShieldAppearance")
    public static class AppearancePlugin extends Plugin {
        @PluginMethod
        public void setTheme(PluginCall call) {
            boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
            getActivity().runOnUiThread(() -> {
                MainActivity activity = (MainActivity) getActivity();
                activity.systemBarBackground = dark ? Color.rgb(16, 25, 22) : Color.rgb(245, 247, 245);
                activity.getWindow().getDecorView().setBackgroundColor(activity.systemBarBackground);
                call.resolve();
            });
        }
    }

    private void protectWebViewFromSystemBars() {
        // Android 15+ enforces edge-to-edge. Keep the WebView itself inside the
        // usable rectangle on every supported WebView version, including 140+.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (view, windowInsets) -> {
            int barsAndCutout = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets bars = windowInsets.getInsets(barsAndCutout);
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(
                bars.left,
                bars.top,
                bars.right,
                Math.max(bars.bottom, keyboard.bottom)
            );

            // Native padding already reserves this space. Send explicit zeros,
            // rather than CONSUMED, so Chromium recalculates CSS safe areas when
            // rotating, hiding the keyboard, or returning from the camera.
            // Clear IME too: newer WebViews otherwise shrink a second time.
            return new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(barsAndCutout | WindowInsetsCompat.Type.ime(), Insets.NONE)
                .setInsetsIgnoringVisibility(barsAndCutout, Insets.NONE)
                .setDisplayCutout(null)
                .setVisible(WindowInsetsCompat.Type.ime(), false)
                .build();
        });
        ViewCompat.requestApplyInsets(decor);
    }
}
