package by.cybershield.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Explicit Android Save As; the user chooses the document provider and destination. */
@CapacitorPlugin(name = "CyberShieldFiles")
public class SaveFilePlugin extends Plugin {
    private static final int MAX_BYTES = 2 * 1024 * 1024;
    private volatile PluginCall pendingCall;

    private static String mimeFor(String name) {
        if ("cybershield-plan.json".equals(name)
            || "cybershield-diagnostic.json".equals(name)
            || "cybershield-lesson.json".equals(name)) return "application/json";
        if ("cybershield-group.csv".equals(name)) return "text/csv;charset=utf-8";
        return null;
    }

    private static byte[] payload(PluginCall call) {
        String name = call.getString("name");
        String expected = mimeFor(name);
        String data = call.getString("data");
        if (expected == null || !expected.equals(call.getString("type"))
            || data == null || data.length() > MAX_BYTES) return null;
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
        return bytes.length <= MAX_BYTES ? bytes : null;
    }

    @PluginMethod
    public void save(PluginCall call) {
        if (payload(call) == null) {
            call.reject("Unsupported export");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (pendingCall != null) {
                call.reject("A file destination picker is already open");
                return;
            }
            if (getActivity().isFinishing() || getActivity().isDestroyed()) {
                call.reject("The application window is no longer available");
                return;
            }
            String type = mimeFor(call.getString("name"));
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(type.split(";")[0]);
            intent.putExtra(Intent.EXTRA_TITLE, call.getString("name"));
            String prompt = call.getString("prompt");
            if (prompt != null && prompt.length() <= 160)
                intent.putExtra(DocumentsContract.EXTRA_PROMPT, prompt);
            pendingCall = call;
            try {
                startActivityForResult(call, intent, "documentCreated");
            } catch (Exception exception) {
                pendingCall = null;
                call.reject("The file destination picker could not be opened");
            }
        });
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        if (call == null) {
            pendingCall = null;
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK) {
            pendingCall = null;
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        byte[] bytes = payload(call);
        if (uri == null || !"content".equals(uri.getScheme()) || bytes == null) {
            pendingCall = null;
            call.reject("The selected document could not be written");
            return;
        }
        pendingCall = call;
        // Document providers may perform slow I/O, so never block the UI thread.
        execute(() -> {
            try {
                try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new java.io.IOException("No output stream");
                    output.write(bytes);
                    output.flush();
                }
                JSObject response = new JSObject();
                response.put("saved", true);
                if (pendingCall == call) call.resolve(response);
            } catch (Exception exception) {
                if (pendingCall == call) call.reject("The selected document could not be written");
            } finally {
                if (pendingCall == call) pendingCall = null;
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call != null) call.reject("The application closed before saving finished");
        super.handleOnDestroy();
    }
}
