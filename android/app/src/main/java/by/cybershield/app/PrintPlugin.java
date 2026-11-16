package by.cybershield.app;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens Android's print/save-PDF UI for the local WebView content. */
@CapacitorPlugin(name = "CyberShieldPrint")
public class PrintPlugin extends Plugin {
    private PluginCall pendingCall;

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pendingCall != null) {
                call.reject("A print session is already open");
                return;
            }
            if (getActivity().isFinishing() || getActivity().isDestroyed()) {
                call.reject("The application window is no longer available");
                return;
            }
            PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
            WebView webView = getBridge().getWebView();
            if (manager == null || webView == null) {
                call.reject("Printing is not available on this device");
                return;
            }
            String name = call.getString("jobName", "CyberShield");
            if (name == null || name.trim().isEmpty() || name.length() > 100) name = "CyberShield";
            final PrintDocumentAdapter delegate = webView.createPrintDocumentAdapter(name);
            pendingCall = call;
            try {
                PrintJob job = manager.print(name, new PrintDocumentAdapter() {
                    @Override
                    public void onStart() {
                        delegate.onStart();
                    }

                    @Override
                    public void onLayout(
                        PrintAttributes oldAttributes,
                        PrintAttributes newAttributes,
                        CancellationSignal cancellationSignal,
                        LayoutResultCallback callback,
                        Bundle extras
                    ) {
                        delegate.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                    }

                    @Override
                    public void onWrite(
                        PageRange[] pages,
                        ParcelFileDescriptor destination,
                        CancellationSignal cancellationSignal,
                        WriteResultCallback callback
                    ) {
                        delegate.onWrite(pages, destination, cancellationSignal, callback);
                    }

                    @Override
                    public void onFinish() {
                        try {
                            delegate.onFinish();
                        } finally {
                            if (pendingCall == call) {
                                pendingCall = null;
                                // This confirms closure of the print UI, not physical printing.
                                call.resolve();
                            }
                        }
                    }
                }, new PrintAttributes.Builder().build());
                if (job == null && pendingCall == call) {
                    pendingCall = null;
                    call.reject("The print session could not be opened");
                }
            } catch (Exception exception) {
                if (pendingCall == call) {
                    pendingCall = null;
                    call.reject("The print session could not be opened");
                }
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (pendingCall != null) {
            PluginCall call = pendingCall;
            pendingCall = null;
            call.reject("The application was closed before the print session finished");
        }
        super.handleOnDestroy();
    }
}
