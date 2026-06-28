package com.nodapp;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSION_REQUEST = 9001;
    private PermissionRequest pendingWebPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(CallMediaPlugin.class);
        super.onCreate(savedInstanceState);
        // Consume back gesture so Android plays no animation and does not exit the app
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() { /* intentionally empty — use in-app back button */ }
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        setupWebMediaPermissions();
    }

    private void setupWebMediaPermissions() {
        WebSettings settings = bridge.getWebView().getSettings();
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        bridge.getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        bridge.getWebView().setHorizontalScrollBarEnabled(false);
        // Reset any horizontal scroll the WebView widget accumulates during edge swipes
        bridge.getWebView().setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
            if (scrollX != 0) ((WebView) v).scrollTo(0, scrollY);
        });

        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }
        });
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        String[] androidPerms = mapWebResourcesToAndroid(request);
        if (androidPerms.length == 0) {
            request.grant(request.getResources());
            return;
        }
        if (hasAndroidPermissions(androidPerms)) {
            request.grant(request.getResources());
            return;
        }
        pendingWebPermissionRequest = request;
        ActivityCompat.requestPermissions(this, androidPerms, MEDIA_PERMISSION_REQUEST);
    }

    private String[] mapWebResourcesToAndroid(PermissionRequest request) {
        List<String> perms = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                if (!perms.contains(Manifest.permission.RECORD_AUDIO)) {
                    perms.add(Manifest.permission.RECORD_AUDIO);
                }
            } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                if (!perms.contains(Manifest.permission.CAMERA)) {
                    perms.add(Manifest.permission.CAMERA);
                }
            }
        }
        return perms.toArray(new String[0]);
    }

    private boolean hasAndroidPermissions(String[] perms) {
        for (String perm : perms) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MEDIA_PERMISSION_REQUEST || pendingWebPermissionRequest == null) return;

        boolean granted = grantResults.length > 0;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                granted = false;
                break;
            }
        }

        if (granted) {
            pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
        } else {
            pendingWebPermissionRequest.deny();
        }
        pendingWebPermissionRequest = null;
    }
}
