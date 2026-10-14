package com.mbanguraproject.pipistrelle;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsShowOptions;

/**
 * Rewarded ads for Pipistrelle through the Unity Ads SDK (4.21, the classic API: it takes the context directly and
 * reports a named error and a message at every step). The game decides when an ad may be offered (only at the Last
 * Echo, only when the player taps "Fly on"); this plugin initialises the SDK, keeps one rewarded ad loaded, shows it
 * on request and reports whether it was watched through. Every call runs on the main thread, every failure is
 * returned to the game with Unity's error name and message (shown in Settings), and everything is logged under the
 * "PipAds" tag (adb logcat -s PipAds).
 *
 * Privacy: ads are non-personalised unless the player allows personalised ads in Settings (setPrivacy).
 * Test mode: "auto" uses Unity's test ads in debuggable builds, so our own installs never count as real traffic.
 */
@CapacitorPlugin(name = "PipAds")
public class PipAdsPlugin extends Plugin {

    private static final String TAG = "PipAds";
    private boolean loaded;
    private boolean loading;
    private boolean testMode;
    private String placement = "";
    private String lastError = "";

    private boolean debuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void applyPrivacy(boolean personalised) {
        try {
            UnityAds.setNonBehavioral(!personalised);
            UnityAds.setUserConsent(personalised);
            UnityAds.setUserOptOut(!personalised);
        } catch (Throwable t) {
            Log.w(TAG, "privacy settings failed", t);
        }
    }

    private void fail(PluginCall call, String stage, String code, String message) {
        lastError = stage + ": " + code + (message == null || message.isEmpty() ? "" : " (" + message + ")");
        Log.w(TAG, lastError);
        call.reject(message == null || message.isEmpty() ? code : message, code);
    }

    @PluginMethod
    public void init(PluginCall call) {
        final String gameId = call.getString("gameId");
        if (gameId == null || gameId.isEmpty()) {
            fail(call, "init", "INVALID_ARGUMENT", "no game ID");
            return;
        }
        String mode = call.getString("testMode", "auto");
        testMode = "auto".equals(mode) ? debuggable() : "true".equals(mode);
        final boolean personalised = Boolean.TRUE.equals(call.getBoolean("personalised", false));
        getBridge().executeOnMainThread(() -> {
            applyPrivacy(personalised);
            if (UnityAds.isInitialized()) {
                call.resolve(info());
                return;
            }
            Log.i(TAG, "initialising Unity Ads " + UnityAds.getVersion() + ", game " + gameId + (testMode ? ", test mode" : ""));
            try {
                UnityAds.initialize(getContext().getApplicationContext(), gameId, testMode, new IUnityAdsInitializationListener() {
                    @Override
                    public void onInitializationComplete() {
                        Log.i(TAG, "initialised");
                        lastError = "";
                        call.resolve(info());
                    }

                    @Override
                    public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                        fail(call, "init", error == null ? "UNKNOWN" : error.name(), message);
                    }
                });
            } catch (Throwable t) {
                fail(call, "init", "EXCEPTION", String.valueOf(t.getMessage()));
            }
        });
    }

    @PluginMethod
    public void setPrivacy(PluginCall call) {
        final boolean personalised = Boolean.TRUE.equals(call.getBoolean("personalised", false));
        getBridge().executeOnMainThread(() -> {
            applyPrivacy(personalised);
            call.resolve();
        });
    }

    @PluginMethod
    public void load(PluginCall call) {
        final String id = call.getString("placementId");
        if (id == null || id.isEmpty()) {
            fail(call, "load", "INVALID_ARGUMENT", "no placement ID");
            return;
        }
        if (loaded && id.equals(placement)) {
            call.resolve(info());
            return;
        }
        if (loading) {
            fail(call, "load", "BUSY", "already loading");
            return;
        }
        loading = true;
        placement = id;
        getBridge().executeOnMainThread(() -> {
            Log.i(TAG, "loading " + id);
            try {
                UnityAds.load(id, new IUnityAdsLoadListener() {
                    @Override
                    public void onUnityAdsAdLoaded(String placementId) {
                        loading = false;
                        loaded = true;
                        lastError = "";
                        Log.i(TAG, "loaded " + placementId);
                        call.resolve(info());
                    }

                    @Override
                    public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                        loading = false;
                        loaded = false;
                        fail(call, "load", error == null ? "UNKNOWN" : error.name(), message);
                    }
                });
            } catch (Throwable t) {
                loading = false;
                fail(call, "load", "EXCEPTION", String.valueOf(t.getMessage()));
            }
        });
    }

    @PluginMethod
    public void isReady(PluginCall call) {
        call.resolve(info());
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(info());
    }

    @PluginMethod
    public void show(PluginCall call) {
        final String id = call.getString("placementId", placement);
        final Activity activity = getActivity();
        if (!loaded || activity == null) {
            fail(call, "show", "NOT_READY", "no ad is loaded");
            return;
        }
        loaded = false;
        getBridge().executeOnMainThread(() -> {
            Log.i(TAG, "showing " + id);
            try {
                UnityAds.show(activity, id, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                    private boolean done;

                    @Override
                    public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                        if (done) return;
                        done = true;
                        fail(call, "show", error == null ? "UNKNOWN" : error.name(), message);
                    }

                    @Override
                    public void onUnityAdsShowStart(String placementId) {
                        notifyListeners("started", new JSObject());
                    }

                    @Override
                    public void onUnityAdsShowClick(String placementId) {
                    }

                    @Override
                    public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                        if (done) return;
                        done = true;
                        Log.i(TAG, "finished: " + state);
                        JSObject r = new JSObject();
                        r.put("rewarded", state == UnityAds.UnityAdsShowCompletionState.COMPLETED);
                        r.put("state", state == null ? "UNKNOWN" : state.name());
                        call.resolve(r);
                    }
                });
            } catch (Throwable t) {
                fail(call, "show", "EXCEPTION", String.valueOf(t.getMessage()));
            }
        });
    }

    private JSObject info() {
        JSObject r = new JSObject();
        r.put("initialized", UnityAds.isInitialized());
        r.put("ready", loaded);
        r.put("loading", loading);
        r.put("testMode", testMode);
        r.put("version", UnityAds.getVersion());
        r.put("lastError", lastError);
        return r;
    }
}
